import React from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, addDays, isSameMonth, isSameDay, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const STATUS_DOT = {
  Scheduled: "bg-blue-400",
  "In Progress": "bg-yellow-400",
  Completed: "bg-green-500",
  Cancelled: "bg-red-400",
  "No Show": "bg-gray-400",
};

export default function MonthlyView({ month, onChange, shifts }) {
  const monthStart = startOfMonth(month);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });

  const weeks = [];
  let day = calStart;
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) { week.push(day); day = addDays(day, 1); }
    weeks.push(week);
  }

  const getShifts = (d) => shifts.filter(s => s.date && isSameDay(parseISO(s.date), d));
  const total = shifts.filter(s => s.date && isSameMonth(parseISO(s.date), month)).length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Button variant="outline" size="icon" onClick={() => onChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="w-4 h-4" /></Button>
        <h2 className="text-base font-semibold">{format(month, "MMMM yyyy")}</h2>
        <Button variant="outline" size="icon" onClick={() => onChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => onChange(new Date())} className="text-xs text-muted-foreground ml-1">This Month</Button>
        <span className="text-sm text-muted-foreground ml-auto">{total} shift{total !== 1 ? "s" : ""} this month</span>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((d, di) => {
              const dayShifts = getShifts(d);
              const inMonth = isSameMonth(d, month);
              const today = isSameDay(d, new Date());
              return (
                <div key={di} className={`min-h-[72px] rounded-lg border p-1.5 transition-colors
                  ${today ? "border-primary bg-primary/5" : "border-border"}
                  ${!inMonth ? "opacity-30 bg-muted/20" : "bg-card"}`}>
                  <div className={`text-xs font-bold mb-1 ${today ? "text-primary" : "text-muted-foreground"}`}>{format(d, "d")}</div>
                  <div className="space-y-0.5">
                    {dayShifts.slice(0, 3).map((s, si) => (
                      <div key={si} className="flex items-center gap-1 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[s.status] || "bg-muted-foreground"}`} />
                        <span className="text-[10px] truncate text-foreground/80 leading-tight">
                          {s.start_time} {s.client_name?.split(" ")[0] || "—"}
                        </span>
                      </div>
                    ))}
                    {dayShifts.length > 3 && (
                      <div className="text-[10px] text-muted-foreground pl-2.5">+{dayShifts.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t">
        {Object.entries(STATUS_DOT).map(([status, cls]) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${cls}`} />
            {status}
          </div>
        ))}
      </div>
    </div>
  );
}