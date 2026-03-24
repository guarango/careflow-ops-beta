import React from "react";
import { format, addDays, addWeeks, isSameDay, parseISO, startOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { getServiceColor } from "./scheduleUtils";
import { cn } from "@/lib/utils";

export default function StaffView({ weekStart, onWeekChange, shifts, staffList, serviceCodes, conflictIds, onShiftClick }) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Only show staff that have shifts OR are active
  const activeStaff = staffList.filter(s => s.status === "Active");

  const getInitials = (s) => `${s.first_name[0]}${s.last_name[0]}`.toUpperCase();

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
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-card">
        {/* Header row */}
        <div className="grid border-b border-border bg-muted/40" style={{ gridTemplateColumns: "180px repeat(7, 1fr)" }}>
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-r border-border">Staff</div>
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div key={i} className={cn("px-2 py-2 text-center text-xs border-r border-border last:border-r-0", isToday && "bg-primary/10")}>
                <p className="font-semibold text-muted-foreground uppercase tracking-wider">{format(day, "EEE")}</p>
                <p className={cn("font-bold", isToday ? "text-primary" : "text-foreground")}>{format(day, "d")}</p>
              </div>
            );
          })}
        </div>

        {/* Staff rows */}
        {activeStaff.map(staff => {
          const staffShifts = shifts.filter(s => s.staff_id === staff.id);
          const totalHours = staffShifts.reduce((acc, s) => acc + (s.total_hours || 0), 0);

          return (
            <div key={staff.id} className="grid border-b border-border last:border-b-0 min-h-[64px]" style={{ gridTemplateColumns: "180px repeat(7, 1fr)" }}>
              {/* Staff name */}
              <div className="px-3 py-2 border-r border-border flex items-center gap-2 flex-shrink-0">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {getInitials(staff)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{staff.first_name} {staff.last_name}</p>
                  <p className="text-[10px] text-muted-foreground">{totalHours > 0 ? `${totalHours}h/wk` : staff.role}</p>
                </div>
              </div>

              {/* Day cells */}
              {weekDays.map((day, di) => {
                const dayShifts = staffShifts.filter(s => s.date && isSameDay(parseISO(s.date), day));
                const isToday = isSameDay(day, new Date());
                return (
                  <div key={di} className={cn("p-1 border-r border-border last:border-r-0 space-y-0.5", isToday && "bg-primary/5")}>
                    {dayShifts.map(shift => {
                      const color = getServiceColor(shift.service_type, serviceCodes);
                      const isConflict = conflictIds.has(shift.id);
                      return (
                        <button
                          key={shift.id}
                          type="button"
                          onClick={() => onShiftClick(shift)}
                          className={cn(
                            "w-full text-left rounded border-l-2 px-1.5 py-0.5 text-[10px] transition-all hover:shadow-sm",
                            color.light, color.text, color.border.replace("border-l-", "border-l-")
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate font-medium">{shift.client_name?.split(" ")[0]}</span>
                            {isConflict && <AlertTriangle className="w-2.5 h-2.5 text-red-500 flex-shrink-0" />}
                          </div>
                          <span className="opacity-70">{shift.start_time}{shift.end_time ? `–${shift.end_time}` : ""}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}

        {activeStaff.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">No active staff members found.</div>
        )}
      </div>
    </div>
  );
}