import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useRole } from "@/hooks/useRole";
import { logAudit } from "@/lib/auditLog";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AlertTriangle, Plus, Search, Sparkles } from "lucide-react";
import ServiceCodeCard from "@/components/servicecodes/ServiceCodeCard";
import ServiceCodeEditDialog from "@/components/servicecodes/ServiceCodeEditDialog";
import { SUMMARY_CADENCES, UTAH_DSPD_CODES, utahRulesFor } from "@/lib/serviceCompliance";

const CADENCE_FILTERS = ["All", ...SUMMARY_CADENCES];

export default function ServiceCodesTab() {
  const { can } = useRole();
  const canEdit = can("editServiceCodes");
  const [cadence, setCadence] = useState("All");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["service-codes"],
    queryFn: () => base44.entities.ServiceCode.list(),
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const targets = codes.filter((c) => UTAH_DSPD_CODES.includes((c.code || "").trim().toUpperCase()));
      const updates = targets.map((c) => ({
        id: c.id,
        ...Object.fromEntries(
          Object.entries(utahRulesFor(c.code)).filter(([, v]) => v !== undefined)
        ),
      }));
      if (updates.length) await base44.entities.ServiceCode.bulkUpdate(updates);
      await logAudit({
        action: "Service code defaults seeded (Utah DSPD)",
        target_type: "ServiceCode",
        target_name: "Utah DSPD defaults",
        details: `Applied DHHS91172 defaults to ${updates.length} service codes`,
      });
      return updates.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["service-codes"] });
      toast({ title: "Utah defaults applied", description: `${count} service codes updated.` });
    },
  });

  const counts = useMemo(() => {
    const map = { All: codes.length };
    SUMMARY_CADENCES.forEach((c) => { map[c] = codes.filter((x) => x.summary_cadence === c).length; });
    return map;
  }, [codes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return codes
      .filter((c) => cadence === "All" || c.summary_cadence === cadence)
      .filter((c) => !q || `${c.code || ""} ${c.description || ""}`.toLowerCase().includes(q))
      .sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  }, [codes, cadence, search]);

  const zeroRateCount = codes.filter((c) => !c.rate).length;
  const unconfirmedCount = codes.filter((c) => c.rule_confirmed === false).length;

  return (
    <div>
      {canEdit && zeroRateCount > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Rate not configured</p>
            <p className="mt-0.5 text-xs text-amber-700">
              {zeroRateCount} of {codes.length} service codes have a $0.00 rate. Billing, unit tracking and payroll
              compute to zero until rates are entered.
            </p>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code or service name"
            className="pl-9"
          />
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
              <Sparkles className="mr-2 h-4 w-4" />
              {seedMutation.isPending ? "Seeding…" : "Seed Utah defaults"}
            </Button>
            <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Add code
            </Button>
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {CADENCE_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setCadence(f)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              cadence === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/40"
            )}
          >
            {f} <span className="opacity-70">({counts[f] ?? 0})</span>
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Showing {filtered.length} of {codes.length} service codes
          {unconfirmedCount > 0 ? ` · ${unconfirmedCount} rule${unconfirmedCount === 1 ? "" : "s"} unconfirmed` : ""}
        </span>
        <span>{canEdit ? "Select a card to edit its compliance settings." : "Read only — an Admin manages these settings."}</span>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading service codes…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-card py-10 text-center text-sm text-muted-foreground">
          No service codes match this filter.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((c) => (
            <ServiceCodeCard
              key={c.id}
              code={c}
              readOnly={!canEdit}
              onClick={() => { setEditing(c); setDialogOpen(true); }}
            />
          ))}
        </div>
      )}

      <ServiceCodeEditDialog
        code={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        readOnly={!canEdit}
      />
    </div>
  );
}