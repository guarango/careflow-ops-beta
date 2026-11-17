import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import ComplianceDeadlineCard from "./ComplianceDeadlineCard";
import ComplianceItemsDialog from "./ComplianceItemsDialog";

const SCOPE_LABEL = {
  agency: "Whole agency",
  caseload: "Your caseload",
  self: "Your own notes",
};

export default function ComplianceDeadlineSection({ role }) {
  const [deadlines, setDeadlines] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCard, setActiveCard] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("getComplianceDeadlines", {});
      setDeadlines(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || "Compliance deadlines could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cards = deadlines?.cards || [];
  const totalDue = cards.reduce((sum, c) => sum + (c.total || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldAlert className="w-4 h-4 text-primary shrink-0" />
          <h2 className="text-sm font-semibold text-foreground truncate">Compliance deadlines</h2>
          {deadlines && (
            <span className="text-[11px] text-muted-foreground truncate">
              {SCOPE_LABEL[deadlines.scope_mode] || ""} · {totalDue} open item{totalDue === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={load} aria-label="Refresh deadlines">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      {!error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {loading && !deadlines
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card h-[124px] animate-pulse" />
              ))
            : cards.map((card) => (
                <ComplianceDeadlineCard key={card.key} card={card} onOpen={setActiveCard} />
              ))}
          {!loading && cards.length === 0 && (
            <p className="text-sm text-muted-foreground">No compliance measures are tracked for this role.</p>
          )}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground mt-2">
        Hover a card's citation to see the rule. Each card opens its filtered list.
      </p>

      <ComplianceItemsDialog card={activeCard} open={!!activeCard} onOpenChange={(v) => !v && setActiveCard(null)} />
    </div>
  );
}