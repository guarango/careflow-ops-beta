import React from "react";
import { format, addDays, isSameDay, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { getServiceColor, timeToMinutes, formatTimeRange } from "./scheduleUtils";
import { cn } from "@/lib/utils";

const HOUR_START = 6; // 6 AM
const HOUR_END = 24;  // midnight
const HOUR_HEIGHT = 60; // px per hour

export default function DayView({ selectedDay, onChange, shifts, serviceCodes, conflictIds, onShiftClick, onAddShift }) {
  const dayShifts = shifts.filter(s => s.date && isSameDay(parseISO(s.date), selectedDay));
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const totalHeight = (HOUR_END - HOUR_START) * HOUR_HEIGHT;

  const getTop = (time) => {
    if (!time) return 0;
    const mins = timeToMinutes(time) - HOUR_START * 60;
    return Math.max(0, (mins / 60) * HOUR_HEIGHT);
  };
  const getHeight = (start, end) => {
    if (!start || !end) return HOUR_HEIGHT;
    const mins = timeToMinutes(end) - timeToMinutes(start);
    return Math.max(20, (mins / 60) * HOUR_HEIGHT);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Button variant="outline" size="icon" onClick={() => onChange(addDays(selectedDay, -1))}><ChevronLeft className="w-4 h-4" /></Button>
        <h2 className="text-base font-semibold">{format(selectedDay, "EEEE, MMMM d, yyyy")}</h2>
        <Button variant="outline" size="icon" onClick={() => onChange(addDays(selectedDay, 1))}><ChevronRight className="w-4 h-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => onChange(new Date())} className="text-xs text-muted-foreground">Today</Button>
        <span className="ml-auto text-sm text-muted-foreground">{dayShifts.length} shift{dayShifts.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="flex border border-border rounded-xl overflow-hidden bg-card">
        {/* Hour labels */}
        <div className="w-14 flex-shrink-0 border-r border-border">
          <div className="h-4" /> {/* top offset */}
          {hours.map(h => (
            <div key={h} style={{ height: HOUR_HEIGHT }} className="relative border-t border-border/30">
              <span className="absolute -top-2.5 right-2 text-[10px] text-muted-foreground">
                {h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`}
              </span>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="flex-1 relative" style={{ height: totalHeight + 16 }}>
          <div className="absolute top-4 inset-x-0 bottom-0">
            {/* Grid lines */}
            {hours.map(h => (
              <div key={h} style={{ top: (h - HOUR_START) * HOUR_HEIGHT }} className="absolute inset-x-0 border-t border-border/20" />
            ))}

            {/* Shifts */}
            {dayShifts.map((shift, idx) => {
              const color = getServiceColor(shift.service_type, serviceCodes);
              const top = getTop(shift.start_time);
              const height = getHeight(shift.start_time, shift.end_time);
              const isConflict = conflictIds.has(shift.id);
              return (
                <button
                  key={shift.id}
                  type="button"
                  onClick={() => onShiftClick(shift)}
                  style={{ top, height, left: `${(idx % 2) * 50}%`, width: "50%", minHeight: 20 }}
                  className={cn(
                    "absolute rounded-md border-l-4 px-2 py-1 text-left text-xs shadow-sm hover:shadow-md transition-shadow overflow-hidden",
                    color.light, color.text, color.border
                  )}
                >
                  <p className="font-semibold truncate">{shift.client_name}</p>
                  <p className="opacity-80 truncate">{shift.staff_name}</p>
                  <p className="opacity-70">{formatTimeRange(shift.start_time, shift.end_time)}</p>
                  {isConflict && <AlertTriangle className="w-3 h-3 text-red-500 absolute top-1 right-1" />}
                </button>
              );
            })}

            {/* Current time indicator */}
            {isSameDay(selectedDay, new Date()) && (() => {
              const now = new Date();
              const mins = now.getHours() * 60 + now.getMinutes();
              const top = ((mins - HOUR_START * 60) / 60) * HOUR_HEIGHT;
              return top > 0 && top < totalHeight ? (
                <div style={{ top }} className="absolute inset-x-0 flex items-center pointer-events-none z-10">
                  <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                  <div className="flex-1 h-px bg-red-500" />
                </div>
              ) : null;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}