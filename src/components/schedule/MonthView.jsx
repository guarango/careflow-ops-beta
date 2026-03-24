import React from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, addDays, isSameMonth, isSameDay, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { getServiceColor } from "./scheduleUtils";
import { cn } from "@/lib/utils";

export default function MonthView({ month, onChange, shifts, serviceCodes, conflictIds, onShiftClick, onDayClick }) {
  const monthStart = startOfMonth(month);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });

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
        <Button variant="ghost" size="sm" onClick={() => onChange(new Date())} className="text-xs text-muted-foreground">This Month</Button>
        <span className="ml-auto text-sm text-muted-foreground">{total} shift{total !== 1 ? "s" : ""}</span>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
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
                <div
                  key={di}
                  onClick={() => onDayClick(d)}
                  className={cn(
                    "min-h-[80px] rounded-lg border p-1.5 cursor-pointer transition-colors hover:border-primary/40",
                    today ? "border-primary bg-primary/5" : "border-border",
                    !inMonth ? "opacity-30 bg-muted/20" : "bg-card"
                  )}
                >
                  <div className={cn("text-xs font-bold mb-1", today ? "text-primary" : "text-muted-foreground")}>{format(d, "d")}</div>
                  <div className="space-y-0.5">
                    {dayShifts.slice(0, 3).map((s, si) => {
                      const color = getServiceColor(s.service_type, serviceCodes);
                      const isConflict = conflictIds.has(s.id);
                      return (
                        <button
                          key={si}
                          type="button"
                          onClick={e => { e.stopPropagation(); onShiftClick(s); }}
                          className={cn("w-full flex items-center gap-1 rounded text-[10px] px-1 py-0.5 leading-tight truncate hover:opacity-80", color.light, color.text)}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", color.bg)} />
                          <span className="truncate">{s.client_name?.split(" ")[0]}</span>
                          {isConflict && <AlertTriangle className="w-2.5 h-2.5 text-red-500 flex-shrink-0 ml-auto" />}
                        </button>
                      );
                    })}
                    {dayShifts.length > 3 && (
                      <p className="text-[10px] text-muted-foreground pl-2.5">+{dayShifts.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}