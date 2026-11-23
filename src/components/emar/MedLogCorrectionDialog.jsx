import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/AuthContext";

const STATUSES = ["Administered", "Refused", "Held", "Not Available", "Missed"];

/**
 * Corrections are appended, never applied over the original entry: the reason,
 * author and timestamp are stored alongside the values they replace.
 */
export default function MedLogCorrectionDialog({ log, onClose, onSave, saving }) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [newStatus, setNewStatus] = useState(log?.status || "Administered");
  const [newEventTime, setNewEventTime] = useState(log?.event_time || log?.time || "");
  const [notes, setNotes] = useState("");

  const canSave = reason.trim().length > 0;

  const save = () => {
    const correction = {
      corrected_at: new Date().toISOString(),
      corrected_by: user?.id || "",
      corrected_by_name: user?.full_name || user?.email || "Staff",
      reason: reason.trim(),
      previous_status: log?.status || "",
      previous_event_time: log?.event_time || log?.time || "",
      new_status: newStatus,
      new_event_time: newEventTime,
      notes: notes.trim(),
    };
    onSave([...(log?.corrections || []), correction]);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Correct medication entry</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {log?.medication_name} · {log?.date} · originally logged as {log?.status}
          </p>
        </DialogHeader>

        <div className="space-y-3">
          <div className="bg-muted/40 border border-border rounded-lg px-3 py-2 text-xs space-y-0.5">
            <p><span className="text-muted-foreground">Original event time:</span> {log?.event_time || log?.time || "—"}</p>
            <p><span className="text-muted-foreground">Original status:</span> {log?.status || "—"}</p>
            <p className="text-muted-foreground pt-1">The original entry is kept. This adds a correction to the record.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Corrected status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Corrected event time</Label>
              <Input type="time" value={newEventTime} onChange={(e) => setNewEventTime(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Reason for correction *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Why is this entry being corrected?"
              className="text-sm"
            />
          </div>

          <div>
            <Label className="text-xs">Additional context</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-sm" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={save} disabled={!canSave || saving}>
            {saving ? "Saving…" : "Append correction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}