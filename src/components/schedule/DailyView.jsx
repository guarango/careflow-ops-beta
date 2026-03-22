import React from "react";
import { format, parseISO, isSameDay, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ShiftCard from "./ShiftCard";
import EmptyState from "@/components/shared/EmptyState";
import { CalendarDays } from "lucide-react";

export default function DailyView({ selectedDay, onChange, shifts, onStatusChange, onAddShift }) {
  const dayShifts = shifts.filter(s => s.date && isSameDay(parseISO(s.date), selectedDay));

  // Group by staff name
  const byStaff = {};
  dayShifts.forEach(s => {
    const key = s.staff_name || "Unassigned";
    if (!byStaff[key]) byStaff[key] = [];
    byStaff[key].push(s);
  });

  // Sort shifts within each group by start time
  Object.values(byStaff).forEach(arr => arr.sort((a, b) => (a.start_time || "").localeCompare(b.start_time || "")));

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Button variant="outline" size="icon" onClick={() => onChange(addDays(selectedDay, -1))}><ChevronLeft className="w-4 h-4" /></Button>
        <h2 className="text-base font-semibold">{format(selectedDay, "EEEE, MMMM d, yyyy")}</h2>
        <Button variant="outline" size="icon" onClick={() => onChange(addDays(selectedDay, 1))}><ChevronRight className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => onChange(new Date())} className="text-xs text-muted-foreground ml-1">Today</Button>
        <span className="text-sm text-muted-foreground ml-auto">{dayShifts.length} shift{dayShifts.length !== 1 ? "s" : ""}</span>
      </div>

      {dayShifts.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No shifts this day"
          description="No shifts scheduled for this date."
          action={<Button size="sm" onClick={onAddShift}>+ Add Shift</Button>}
        />
      ) : (
        <div className="space-y-5">
          {Object.entries(byStaff).sort().map(([staffName, staffShifts]) => (
            <div key={staffName}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{staffName}</p>
              <div className="space-y-2">
                {staffShifts.map(s => <ShiftCard key={s.id} shift={s} onStatusChange={onStatusChange} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}