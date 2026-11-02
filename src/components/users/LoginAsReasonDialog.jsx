import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";

/**
 * Login As guardrail: a typed reason is required before a support session starts,
 * and it is written to the audit log by the manageImpersonation function.
 */
export default function LoginAsReasonDialog({ open, targetUser, onClose, onConfirm, starting }) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  const name = targetUser?.full_name || targetUser?.email || "this user";
  const valid = reason.trim().length >= 10;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            View as {name}
          </DialogTitle>
          <DialogDescription>
            This opens a read-only support session that ends automatically after 30 minutes.
            Your reason is recorded in the audit log.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="login-as-reason">Reason for viewing as this user</Label>
          <Textarea
            id="login-as-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Verifying a reported note-submission error with the DSP"
          />
          <p className="text-xs text-muted-foreground">At least 10 characters.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid || starting} onClick={() => onConfirm(reason.trim())}>
            {starting ? "Starting…" : "Start session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}