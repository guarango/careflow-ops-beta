import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { format } from "date-fns";
import { CheckCircle, XCircle } from "lucide-react";

export default function CorrectionReviewDialog({ timecard, onClose }) {
  const [managerNote, setManagerNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  if (!timecard) return null;

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const updates = {
        clock_in: timecard.corrected_clock_in || timecard.clock_in,
        clock_out: timecard.corrected_clock_out || timecard.clock_out,
        correction_status: "approved",
        correction_reviewed_by: currentUser?.full_name || currentUser?.email || "Manager",
        correction_reviewed_at: new Date().toISOString(),
        correction_manager_note: managerNote.trim() || undefined,
      };
      // Recalculate total hours if times changed
      const ci = updates.clock_in;
      const co = updates.clock_out;
      if (ci && co) {
        const [inH, inM] = ci.split(":").map(Number);
        const [outH, outM] = co.split(":").map(Number);
        const diff = (outH * 60 + outM - inH * 60 - inM - (timecard.break_minutes || 0)) / 60;
        updates.total_hours = Math.max(0, Math.round(diff * 100) / 100);
      }
      await base44.entities.Timecard.update(timecard.id, updates);
      queryClient.invalidateQueries({ queryKey: ["timecards"] });
      toast({ title: "Correction approved", description: "Timecard hours have been updated." });
      onClose();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async () => {
    setSubmitting(true);
    try {
      await base44.entities.Timecard.update(timecard.id, {
        correction_status: "returned",
        correction_reviewed_by: currentUser?.full_name || currentUser?.email || "Manager",
        correction_reviewed_at: new Date().toISOString(),
        correction_manager_note: managerNote.trim() || "Returned by manager",
      });
      queryClient.invalidateQueries({ queryKey: ["timecards"] });
      toast({ title: "Correction returned", description: "The DSP has been notified." });
      onClose();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!timecard} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Review Correction Request</DialogTitle>
          <DialogDescription>
            <strong>{timecard.staff_name}</strong> — {timecard.date}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="bg-muted/40 rounded-lg p-3 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-muted-foreground">Original Clock In</div>
                <div className="font-medium">{timecard.clock_in || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Original Clock Out</div>
                <div className="font-medium">{timecard.clock_out || "—"}</div>
              </div>
            </div>
            <div className="border-t border-border pt-2 grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-muted-foreground">Corrected Clock In</div>
                <div className="font-medium text-primary">{timecard.corrected_clock_in || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Corrected Clock Out</div>
                <div className="font-medium text-primary">{timecard.corrected_clock_out || "—"}</div>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs">DSP's Reason</Label>
            <div className="text-sm p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 mt-1">
              {timecard.correction_reason || "No reason provided."}
            </div>
          </div>

          <div>
            <Label>Manager Note (optional for approval, required for return)</Label>
            <Textarea
              placeholder="Add a note for the DSP..."
              value={managerNote}
              onChange={e => setManagerNote(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={handleReturn}
            disabled={submitting || !managerNote.trim()}
          >
            <XCircle className="w-4 h-4 mr-1" /> Return
          </Button>
          <Button
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={handleApprove}
            disabled={submitting}
          >
            <CheckCircle className="w-4 h-4 mr-1" /> Approve Correction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}