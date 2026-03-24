import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format, addWeeks, addDays, parseISO } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { calcHours } from "./scheduleUtils";

export default function CopyWeekDialog({ open, onClose, weekStart, allShifts }) {
  const queryClient = useQueryClient();
  const prevWeekStart = addWeeks(weekStart, -1);
  const prevWeekEnd = addDays(prevWeekStart, 6);

  const prevWeekShifts = allShifts.filter(s => {
    if (!s.date) return false;
    const d = parseISO(s.date);
    return d >= prevWeekStart && d <= prevWeekEnd;
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ShiftSchedule.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shifts"] }),
  });

  // Check which dates in this week already have shifts (to avoid overwriting)
  const thisWeekDates = new Set(
    allShifts
      .filter(s => {
        if (!s.date) return false;
        const d = parseISO(s.date);
        return d >= weekStart && d <= addDays(weekStart, 6);
      })
      .map(s => `${s.staff_id}_${s.date}_${s.start_time}`)
  );

  const handleCopy = async () => {
    const toCopy = prevWeekShifts.filter(s => {
      const prevDate = parseISO(s.date);
      const dayOffset = Math.round((prevDate - prevWeekStart) / (1000 * 60 * 60 * 24));
      const newDate = format(addDays(weekStart, dayOffset), "yyyy-MM-dd");
      const key = `${s.staff_id}_${newDate}_${s.start_time}`;
      return !thisWeekDates.has(key);
    });

    for (const s of toCopy) {
      const prevDate = parseISO(s.date);
      const dayOffset = Math.round((prevDate - prevWeekStart) / (1000 * 60 * 60 * 24));
      const newDate = format(addDays(weekStart, dayOffset), "yyyy-MM-dd");
      const { id, created_date, updated_date, created_by, ...rest } = s;
      await createMutation.mutateAsync({ ...rest, date: newDate, status: "Scheduled", billing_created: false, billing_record_id: "" });
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Copy Last Week's Schedule</DialogTitle>
        </DialogHeader>
        <div className="text-sm space-y-3">
          <p className="text-muted-foreground">
            Copy all shifts from{" "}
            <span className="font-semibold text-foreground">{format(prevWeekStart, "MMM d")} – {format(prevWeekEnd, "MMM d, yyyy")}</span>{" "}
            to this week?
          </p>
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            Existing shifts this week will not be overwritten. {prevWeekShifts.length} shift{prevWeekShifts.length !== 1 ? "s" : ""} found in previous week.
          </p>
          {prevWeekShifts.length === 0 && (
            <p className="text-amber-600 text-xs">No shifts found in the previous week.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCopy} disabled={prevWeekShifts.length === 0 || createMutation.isPending}>
            {createMutation.isPending ? "Copying..." : "Copy Shifts"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}