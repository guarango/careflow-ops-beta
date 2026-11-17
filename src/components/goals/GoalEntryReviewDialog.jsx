import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const ACTIONS = {
  Flag: {
    title: "Flag this entry for review",
    hint: "The numbers are not changed. Flagged entries are listed as data needing review and are left out of progress statements.",
    confirm: "Flag entry",
    tone: "bg-amber-600 hover:bg-amber-700",
  },
  Exclude: {
    title: "Exclude this entry",
    hint: "Excluded entries never count toward progress. The original entry is kept and can be restored.",
    confirm: "Exclude entry",
    tone: "bg-slate-700 hover:bg-slate-800",
  },
  Restore: {
    title: "Restore this entry",
    hint: "The entry will count as valid progress evidence again.",
    confirm: "Restore entry",
    tone: "",
  },
};

export default function GoalEntryReviewDialog({ action, entry, onClose, onConfirm, saving }) {
  const [reason, setReason] = useState("");
  const config = ACTIONS[action] || ACTIONS.Flag;
  const reasonRequired = action !== "Restore";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md grid-cols-[minmax(0,1fr)] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-sm">{config.title}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {entry?.date} · {entry?.score || "No score"}
            {entry?.staff_name ? ` · ${entry.staff_name}` : ""}
          </p>
        </DialogHeader>
        <p className="text-xs text-muted-foreground leading-relaxed">{config.hint}</p>
        <div>
          <Label className="text-xs">Reason {reasonRequired ? "*" : "(optional)"}</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder={action === "Exclude" ? "Why is this entry being excluded?" : "What is wrong or needs checking?"}
            className="text-sm"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className={config.tone}
            disabled={saving || (reasonRequired && !reason.trim())}
            onClick={() => onConfirm(reason.trim())}
          >
            {saving ? "Saving..." : config.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}