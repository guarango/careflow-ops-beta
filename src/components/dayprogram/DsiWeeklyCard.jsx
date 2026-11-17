import React from "react";
import { AlertTriangle, Building2, Trees } from "lucide-react";
import { cn } from "@/lib/utils";
import { weekRange } from "@/lib/dayProgram";

function hours(value) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}h`;
}

/** DSI site-based vs community minutes for one Sunday–Saturday week (SOW 8.4(5)). */
export default function DsiWeeklyCard({ rows = [], weekStart }) {
  const { startISO, endISO } = weekRange(weekStart);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">DSI weekly setting tracker</p>
          <p className="text-[11px] text-muted-foreground">
            Week {startISO} → {endISO} (Sunday–Saturday) · site-based must not exceed half of DSI time (SOW 8.4(5))
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground border border-dashed border-border rounded-lg px-3 py-6 text-center">
          No submitted DSI notes for this week.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const sitePct = row.total > 0 ? Math.round((row.site / row.total) * 100) : 0;
            return (
              <div key={row.client_id || row.client_name} className={cn("rounded-lg border px-3 py-2", row.over ? "border-red-200 bg-red-50/60" : "border-border")}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{row.client_name}</p>
                  <p className={cn("text-xs font-bold shrink-0", row.over ? "text-red-600" : "text-muted-foreground")}>
                    {hours(row.totalHours)} DSI
                  </p>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden bg-muted mt-1.5 flex">
                  <div className="h-full bg-teal-500" style={{ width: `${100 - sitePct}%` }} />
                  <div className="h-full bg-amber-500" style={{ width: `${sitePct}%` }} />
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Trees className="w-3 h-3 text-teal-600" />Community {hours(row.communityHours)}</span>
                  <span className="flex items-center gap-1"><Building2 className="w-3 h-3 text-amber-600" />Site-based {hours(row.siteHours)}</span>
                </div>
                {row.over && (
                  <p className="text-[11px] text-red-700 flex items-start gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                    Site-based time is {sitePct}% of this person's DSI week — above half (SOW 8.4(5)).
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}