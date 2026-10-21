import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle } from "lucide-react";

export default function CorrectionRequestDialog({ timecard, onClose }) {
  const [correctedClockIn, setCorrectedClockIn] = useState(timecard.clock_in || "");
  const [correctedClockOut, setCorrectedClockOut] = useState(timecard.clock_out || "");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({ title: "Reason required", description: "Please explain why you're requesting a correction.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await base44.entities.Timecard.update(timecard.id, {
        correction_requested: true,
        correction_reason: reason.trim(),
        correction_requested_at: new Date().toISOString(),
        correction_status: "pending",
        corrected_clock_in: correctedClockIn,
        corrected_clock_out: correctedClockOut,
      });
      queryClient.invalidateQueries({ queryKey: ["timecards"] });
      toast({ title: "Correction requested", description: "Your manager will review this request." });
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
          <DialogTitle>Request Timecard Correction</DialogTitle>
          <DialogDescription>
            Entry for <strong>{timecard.date}</strong>. Your manager will review and approve or return this request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Corrected Clock In</Label>
              <Input type="time" value={correctedClockIn} onChange={e => setCorrectedClockIn(e.target.value)} />
            </div>
            <div>
              <Label>Corrected Clock Out</Label>
              <Input type="time" value={correctedClockOut} onChange={e => setCorrectedClockOut(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Reason for Correction *</Label>
            <Textarea
              placeholder="Explain why this correction is needed (e.g., forgot to clock out, system issue, etc.)"
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
            />
          </div>
          {timecard.correction_status === "returned" && timecard.correction_manager_note && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium">Previous correction returned:</div>
                <div className="text-xs mt-1">{timecard.correction_manager_note}</div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !reason.trim()}>
            {submitting ? "Submitting..." : "Submit Correction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}