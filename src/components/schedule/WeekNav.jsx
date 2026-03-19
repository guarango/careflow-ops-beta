import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addWeeks, startOfWeek } from "date-fns";

export default function WeekNav({ weekStart, onChange }) {
  const label = `${format(weekStart, "MMM d")} – ${format(addWeeks(weekStart, 0), "MMM d")} (week of ${format(weekStart, "MMM d, yyyy")})`;

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="icon" onClick={() => onChange(addWeeks(weekStart, -1))}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-sm font-medium min-w-[200px] text-center">{format(weekStart, "MMM d")} — {format(addWeeks(weekStart, 1), "MMM d, yyyy")}</span>
      <Button variant="outline" size="icon" onClick={() => onChange(addWeeks(weekStart, 1))}>
        <ChevronRight className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => onChange(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
    </div>
  );
}