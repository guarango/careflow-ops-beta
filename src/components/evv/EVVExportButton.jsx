import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Loader2, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { format, subDays } from "date-fns";
import {
  UTAH_EVV_VENDOR_NAME,
  UTAH_EVV_PORTAL_URL,
  prepareUtahExport,
  rowsToUtahCsv,
  nextBatchId,
} from "@/lib/utahEvvCsv";

export default function EVVExportButton() {
  const [from, setFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState(null);
  const queryClient = useQueryClient();

  const { data: logPage, isLoading } = useQuery({
    queryKey: ["evv-utah-export", from, to],
    queryFn: () =>
      base44.entities.EVVLog.filter(
        { date: { $gte: from, $lte: to }, is_evv_required: true },
        { sort: "date", limit: 500 }
      ),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: houses = [] } = useQuery({
    queryKey: ["houses"],
    queryFn: () => base44.entities.House.list(),
  });

  const { data: agencyList = [] } = useQuery({
    queryKey: ["agency"],
    queryFn: () => base44.entities.Agency.list(),
  });

  const agency = agencyList[0];
  const logs = logPage?.items || [];

  const preview = useMemo(() => {
    const clientsById = Object.fromEntries(clients.map(c => [c.id, c]));
    const housesById = Object.fromEntries(houses.map(h => [h.id, h]));
    return prepareUtahExport(logs, { clientsById, housesById, agency });
  }, [logs, clients, houses, agency]);

  const handleExport = async () => {
    setExporting(true);
    setResult(null);
    try {
      const clientsById = Object.fromEntries(clients.map(c => [c.id, c]));
      const housesById = Object.fromEntries(houses.map(h => [h.id, h]));
      const batchId = nextBatchId();
      const { ready, blocked } = prepareUtahExport(logs, {
        clientsById,
        housesById,
        agency,
        batchId,
      });

      if (ready.length === 0) {
        setResult({ batchId, exported: 0, blocked: blocked.length });
        return;
      }

      const csv = rowsToUtahCsv(ready);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `utah-evv_batch-${batchId}_${from}_to_${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      const now = new Date().toISOString();
      await base44.entities.EVVLog.bulkUpdate(
        ready.map(({ log, values }) => ({
          id: log.id,
          status: "Submitted",
          submitted_at: now,
          exported_at: now,
          export_batch_id: batchId,
          record_id: values.record_id,
          member_id: values.member_id,
          provider_npi: agency?.npi || "",
          provider_prism_id: agency?.medicaid_provider_id || "",
          vendor_name: UTAH_EVV_VENDOR_NAME,
        }))
      );

      queryClient.invalidateQueries({ queryKey: ["evv-utah-export"] });
      queryClient.invalidateQueries({ queryKey: ["evv-logs"] });
      setResult({ batchId, exported: ready.length, blocked: blocked.length });
    } finally {
      setExporting(false);
    }
  };

  const providerMissing = !preview.providerId;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">From</Label>
          <Input type="date" value={from} onChange={e => { setFrom(e.target.value); setResult(null); }} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={e => { setTo(e.target.value); setResult(null); }} className="h-8 text-sm" />
        </div>
        <Button onClick={handleExport} disabled={exporting || !from || !to || preview.ready.length === 0 || providerMissing}>
          {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Download Utah Portal CSV
        </Button>
      </div>

      {providerMissing && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Add the agency's Medicaid provider (PRISM) ID or NPI in Agency Admin → Agency Profile. Utah requires one of them on every record.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 max-w-sm">
        <div className="rounded-lg border border-border px-3 py-2">
          <p className="text-xs text-muted-foreground">Ready to submit</p>
          <p className="text-xl font-bold text-accent">{preview.ready.length}</p>
        </div>
        <div className="rounded-lg border border-border px-3 py-2">
          <p className="text-xs text-muted-foreground">Missing data</p>
          <p className="text-xl font-bold text-destructive">{preview.blocked.length}</p>
        </div>
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">Loading records…</p>}

      {!isLoading && logs.length === 0 && (
        <p className="text-xs text-muted-foreground">No EVV-required visits in this date range.</p>
      )}

      {preview.blocked.length > 0 && (
        <div className="rounded-lg border border-border">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/40">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <p className="text-xs font-semibold">Records that cannot be exported yet</p>
          </div>
          <ul className="divide-y divide-border max-h-56 overflow-y-auto">
            {preview.blocked.slice(0, 25).map(({ log, missing }) => (
              <li key={log.id} className="px-3 py-2 text-xs">
                <span className="font-medium">{log.staff_name || "—"}</span>
                <span className="text-muted-foreground"> · {log.client_name || "—"} · {log.date || "—"}</span>
                <span className="block text-destructive mt-0.5">Missing: {missing.join(", ")}</span>
              </li>
            ))}
          </ul>
          {preview.blocked.length > 25 && (
            <p className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
              +{preview.blocked.length - 25} more
            </p>
          )}
        </div>
      )}

      {result && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-accent" />
          <span>
            Batch {result.batchId}: exported {result.exported} record{result.exported === 1 ? "" : "s"}
            {result.blocked > 0 && ` (${result.blocked} skipped for missing data)`}. Upload the file in the Utah EVV Portal
            {" "}and record the receipt ID from the acknowledgement email on each visit.
          </span>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        File follows the Utah EVV CSV template (Technical Specifications v1.7) and contains only EVV-required visits.
        {" "}
        <a href={UTAH_EVV_PORTAL_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
          Utah EVV Portal <ExternalLink className="w-3 h-3" />
        </a>
      </p>
    </div>
  );
}