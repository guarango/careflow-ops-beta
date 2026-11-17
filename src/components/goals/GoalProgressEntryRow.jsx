import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ENTRY_STATUS_STYLES, entryStatus } from "@/lib/goalData";

export default function GoalProgressEntryRow({ entry, index, canReview, onReview }) {
  const status = entryStatus(entry);
  const excluded = status === "Excluded";
  const flagged = status === "Flagged";

  return (
    <div className={cn(
      "text-xs rounded-lg px-3 py-2 border",
      excluded ? "bg-slate-50 border-slate-200 opacity-75" : flagged ? "bg-amber-50 border-amber-200" : "bg-muted/40 border-transparent"
    )}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-muted-foreground font-medium w-20 shrink-0">{entry.date}</span>
        <span className={cn("font-semibold text-foreground", excluded && "line-through")}>{entry.score || "—"}</span>
        {entry.start_time && entry.end_time && <span className="text-muted-foreground">{entry.start_time}–{entry.end_time}</span>}
        {entry.prompt_level && <span className="text-muted-foreground">Prompt: {entry.prompt_level}</span>}
        {entry.setting && <span className="text-muted-foreground">📍 {entry.setting}</span>}
        <Badge variant="outline" className={cn("text-[9px] border", ENTRY_STATUS_STYLES[status])}>{status}</Badge>
        {(entry.staff_name || entry.recorded_by) && (
          <span className="text-muted-foreground ml-auto shrink-0">
            {entry.staff_name || entry.recorded_by}
            {entry.service_code ? ` · ${entry.service_code}` : ""}
          </span>
        )}
      </div>

      {entry.notes && <p className="text-muted-foreground italic mt-1">{entry.notes}</p>}

      {(flagged || excluded) && (entry.flagged_reason || entry.exclusion_reason) && (
        <p className={cn("mt-1 text-[11px]", excluded ? "text-slate-600" : "text-amber-800")}>
          {excluded ? "Excluded" : "Flagged"}: {entry.exclusion_reason || entry.flagged_reason}
          {(entry.excluded_by || entry.flagged_by) ? ` — ${entry.excluded_by || entry.flagged_by}` : ""}
        </p>
      )}

      {canReview && (
        <div className="flex items-center gap-3 mt-1.5">
          {status === "Valid" && (
            <button type="button" onClick={() => onReview("Flag", index)} className="text-[11px] text-amber-700 hover:underline">Flag</button>
          )}
          {status !== "Excluded" && (
            <button type="button" onClick={() => onReview("Exclude", index)} className="text-[11px] text-slate-600 hover:underline">Exclude</button>
          )}
          {status !== "Valid" && (
            <button type="button" onClick={() => onReview("Restore", index)} className="text-[11px] text-emerald-700 hover:underline">Restore</button>
          )}
        </div>
      )}
    </div>
  );
}