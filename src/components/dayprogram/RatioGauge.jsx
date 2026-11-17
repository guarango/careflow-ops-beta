import React from "react";
import { cn } from "@/lib/utils";
import { ratioLabel } from "@/lib/dayProgram";

/** Green inside 1:6 (with any documented one-to-one cover), red above. */
export default function RatioGauge({ check, max = 6 }) {
  const capacity = Math.max(1, check.groupStaff * max);
  const used = check.over
    ? 100
    : Math.min(100, capacity > 0 ? Math.round((check.groupPersons / capacity) * 100) : 0);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          {check.persons} person{check.persons === 1 ? "" : "s"} · {check.staff} staff
        </p>
        <p className={cn("text-sm font-black", check.over ? "text-red-600" : "text-emerald-600")}>
          {ratioLabel(check.ratio)}
        </p>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden mt-1">
        <div
          className={cn("h-full rounded-full transition-all", check.over ? "bg-red-500" : "bg-emerald-500")}
          style={{ width: `${used}%` }}
        />
      </div>
      <p className={cn("text-[10px] mt-1", check.over ? "text-red-600 font-semibold" : "text-muted-foreground")}>
        {check.over ? `Above the 1:${max} maximum` : `Within 1:${max}`}
        {check.dedicated > 0 ? ` · ${check.dedicated} dedicated to one-to-one` : ""}
      </p>
    </div>
  );
}