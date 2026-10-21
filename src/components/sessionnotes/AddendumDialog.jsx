import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FilePlus } from "lucide-react";

/**
 * AddendumDialog — lets an admin add an addendum to an Approved note.
 * The addendum is saved as a new version (never overwrites the original).
 */
export default function AddendumDialog({ open, onOpenChange, onAdd }) {
  const [text, setText] = useState("");
  const [reason, setReason] = useState("");

  const handleAdd = () => {
    onAdd({ text, reason });
    setText("");
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus className="w-4 h-4" /> Add Addendum
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <p className="text-xs text-amber-700">
              This note is approved and locked. The addendum will be saved as a new version — the original note will never be changed.
            </p>
          </div>
          <div>
            <Label>Addendum Text</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Enter the additional information…"
            />
          </div>
          <div>
            <Label>Reason for Addendum</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Why is this addendum being added?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!text || !reason}>Add & Save Version</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}