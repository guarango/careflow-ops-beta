import React from "react";
import { format, addDays, addWeeks, isSameDay, parseISO, startOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Copy, Plus, AlertTriangle } from "lucide-react";
import { getServiceColor } from "./scheduleUtils";
import { cn } from "@/lib/utils";

export default function WeekView({ weekStart, onWeekChange, shifts, serviceCodes, conflictIds, canEdit, onShiftClick, onAddShift, onCopyWeek }) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Button variant="outline" size="icon" onClick={() => onWeekChange(addWeeks(weekStart, -1))}><ChevronLeft className="w-4 h-4" /></Button>
        <span className="text-sm font-medium min-w-[180px]">
          {format(weekStart, "MMM d")} — {format(addDays(weekStart, 6), "MMM d, yyyy")}
        </span>
        <Button variant="outline" size="icon" onClick={() => onWeekChange(addWeeks(weekStart, 1))}><ChevronRight className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => onWeekChange(startOfWeek(new Date(), { weekStartsOn: 0 }))}>Today</Button>
        <div className="ml-auto flex gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={onCopyWeek}>
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy last week
            </Button>
          )}
          {canEdit && (
            <Button size="sm" onClick={() => onAddShift("")}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Shift
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map((day, i) => {
          const dayShifts = shifts.filter(s => s.date && isSameDay(parseISO(s.date), day));
          const isToday = isSameDay(day, new Date());
          return (
            <div key={i} className="min-w-0">
              <div className={cn(
                "text-center py-2 rounded-lg mb-2",
                isToday ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                <p className="text-[10px] font-medium uppercase tracking-wider opacity-70">{format(day, "EEE")}</p>
                <p className="text-sm font-bold">{format(day, "d")}</p>
              </div>

              <div className="space-y-1.5 min-h-[120px]">
                {dayShifts.map(shift => {
                  const color = getServiceColor(shift.service_type, serviceCodes);
                  const isConflict = conflictIds.has(shift.id);
                  return (
                    <button
                      key={shift.id}
                      type="button"
                      onClick={() => onShiftClick(shift)}
                      className={cn(
                        "w-full text-left rounded-md border-l-4 px-2 py-1.5 text-xs transition-all hover:shadow-md",
                        color.light, color.text, color.border
                      )}
                    >
                      <div className="flex items-start justify-between gap-0.5">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate leading-tight">{shift.client_name?.split(" ")[0]}</p>
                          <p className="opacity-70 truncate">{shift.staff_name?.split(" ")[0]}</p>
                          <p className="opacity-70">{shift.start_time}{shift.end_time ? `–${shift.end_time}` : ""}</p>
                        </div>
                        {isConflict && <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                      </div>
                    </button>
                  );
                })}

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onAddShift(format(day, "yyyy-MM-dd"))}
                    className="w-full text-[10px] text-muted-foreground border border-dashed border-border rounded-md py-1.5 hover:border-primary hover:text-primary transition-colors"
                  >
                    + Add
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}