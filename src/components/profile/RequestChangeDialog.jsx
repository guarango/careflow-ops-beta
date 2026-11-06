import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

const LABELS = {
  legal_name: "legal name",
  date_of_birth: "date of birth",
};

/** Asks the Admins who hold the HR bundle to correct a field the person can't edit. */
export default function RequestChangeDialog({ field, open, onClose }) {
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke("requestStaffChange", { field, note });
      if (res.data?.error) throw new Error(res.data.error);
      toast({
        title: "Request sent",
        description: `Your agency's HR team was notified about your ${LABELS[field]}.`,
      });
      onClose();
    } catch (error) {
      toast({ title: "Could not send the request", description: error.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request a change</DialogTitle>
          <DialogDescription>
            Your {LABELS[field]} can only be changed by an Admin. Tell them what needs to change.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label>What should it say?</Label>
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={field === "legal_name" ? "e.g. My last name is spelled differently" : "e.g. My date of birth is off by one day"}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}