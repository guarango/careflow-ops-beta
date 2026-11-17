import React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, ClipboardCheck, FileCheck2, MapPin, ShieldOff } from "lucide-react";
import { cadenceChipClass, categoryFor } from "@/lib/serviceCompliance";

const badge = "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium";

const EVV_SCOPE_PENDING = new Set(["SLN", "CMP", "CMS"]);

export default function ServiceCodeCard({ code, onClick, readOnly }) {
  const { icon: Icon } = categoryFor(code.code);
  const strategyRequired = code.support_strategy_required !== false;
  const evvScopePending = EVV_SCOPE_PENDING.has((code.code || "").trim().toUpperCase());

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all",
        readOnly
          ? "cursor-default"
          : "hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-sm font-bold text-foreground">{code.code}</p>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{code.description}</p>
        </div>
      </div>

      {evvScopePending && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-[11px] font-medium leading-snug text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          EVV scope pending DSPD confirmation.
        </div>
      )}

      <span
        className={cn(
          "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
          cadenceChipClass(code.summary_cadence)
        )}
      >
        {code.summary_cadence || "No cadence set"}
      </span>

      <div className="mt-auto flex flex-wrap gap-1.5">
        {strategyRequired ? (
          <span className={cn(badge, "border-primary/20 bg-primary/5 text-primary")}>
            <ClipboardCheck className="h-3 w-3" /> Strategy
          </span>
        ) : (
          <span className={cn(badge, "border-border bg-muted text-muted-foreground")}>
            <ShieldOff className="h-3 w-3" /> Strategy exempt
          </span>
        )}
        {code.is_evv_required && (
          <span className={cn(badge, "border-sky-200 bg-sky-50 text-sky-700")}>
            <MapPin className="h-3 w-3" /> EVV
          </span>
        )}
        {code.annual_report_required && (
          <span className={cn(badge, "border-teal-200 bg-teal-50 text-teal-700")}>
            <FileCheck2 className="h-3 w-3" /> Annual report
          </span>
        )}
        {code.rule_confirmed === false && (
          <span className={cn(badge, "border-amber-300 bg-amber-50 text-amber-800")}>
            <AlertTriangle className="h-3 w-3" /> Unconfirmed rule
          </span>
        )}
      </div>
    </button>
  );
}