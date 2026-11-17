import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Lock, FileDown, FileSpreadsheet, Archive } from "lucide-react";
import toast from "react-hot-toast";
import { useRole } from "@/hooks/useRole";
import { downloadClientRecordCsv, downloadClientRecordPdf } from "@/lib/clientRecordExport";

export default function ClientRetentionActions({ client }) {
  const { isAdmin, isManager } = useRole();
  const [hold, setHold] = useState(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState("");

  const loadHold = async () => {
    if (!client?.id) return;
    const rows = await base44.entities.LegalHold.filter({ client_id: client.id });
    setHold(rows[0] || null);
  };
  useEffect(() => { loadHold(); }, [client?.id]);

  if (!isAdmin && !isManager) return null;

  const setLegalHold = async (active) => {
    if (active) { setOpen(true); return; }
    setBusy(true);
    try {
      const res = await base44.functions.invoke("setLegalHold", { client_id: client.id, active: false, reason: "Released" });
      if (res.data?.error) throw new Error(res.data.error);
      await loadHold();
      toast.success("Legal hold released.");
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Could not release the hold.");
    } finally { setBusy(false); }
  };

  const applyHold = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      const res = await base44.functions.invoke("setLegalHold", { client_id: client.id, active: true, reason });
      if (res.data?.error) throw new Error(res.data.error);
      await loadHold();
      setOpen(false);
      setReason("");
      toast.success("Legal hold set — none of this person's records can be purged.");
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Could not set the hold.");
    } finally { setBusy(false); }
  };

  const exportRecord = async (kind) => {
    setExporting(kind);
    try {
      const res = await base44.functions.invoke("exportClientRecord", { client_id: client.id });
      if (res.data?.error) throw new Error(res.data.error);
      if (kind === "pdf") downloadClientRecordPdf(res.data);
      else downloadClientRecordCsv(res.data);
      toast.success(`Exported ${res.data.counts.records} record(s).`);
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "The export failed.");
    } finally { setExporting(""); }
  };

  const holdActive = hold?.active === true;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold flex items-center gap-2 flex-wrap">
            Records and retention
            {holdActive && (
              <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-300 gap-1">
                <Lock className="w-3 h-3" /> Legal hold
              </Badge>
            )}
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {holdActive
              ? `No record for this person can be purged. ${hold.reason || ""}`
              : "Records cannot be deleted, only archived. Purge only happens after retention and Admin confirmation."}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => exportRecord("pdf")} disabled={!!exporting}>
            {exporting === "pdf" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <FileDown className="w-3.5 h-3.5 mr-1" />}
            PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportRecord("csv")} disabled={!!exporting}>
            {exporting === "csv" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />}
            CSV
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <Link to="/archive"><Archive className="w-3.5 h-3.5 mr-1" /> Archive</Link>
          </Button>
        </div>
      </div>

      {isAdmin && (
        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 mt-3">
          <div>
            <p className="text-sm font-medium">Legal hold</p>
            <p className="text-[11px] text-muted-foreground">Blocks purge regardless of retention dates</p>
          </div>
          <Switch checked={holdActive} disabled={busy} onCheckedChange={setLegalHold} />
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Place legal hold</DialogTitle>
            <DialogDescription>Every record for {client.first_name} {client.last_name} is protected from purge until the hold is released.</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Reason *</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Litigation, investigation, audit request…" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={applyHold} disabled={busy || !reason.trim()}>
              {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Lock className="w-4 h-4 mr-1" />}
              Set hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}