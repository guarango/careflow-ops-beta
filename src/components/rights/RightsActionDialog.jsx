import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

const OUTCOMES = ["Effective", "Partially effective", "Not effective"];

/** Records a periodic review, or ends the modification with a required reason. */
export default function RightsActionDialog({ mode, modification, open, onOpenChange, onDone }) {
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState("Effective");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setNote("");
    setOutcome("Effective");
    setError("");
  }, [open]);

  const isEnd = mode === "end";

  const submit = async () => {
    if (isEnd && !note.trim()) {
      setError("A reason is required to end a rights modification.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await base44.functions.invoke("manageRightsModification", {
        action: isEnd ? "end" : "record_review",
        id: modification.id,
        note,
        outcome,
      });
      toast({ title: isEnd ? "Rights modification ended" : "Review recorded" });
      onDone?.();
      onOpenChange(false);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "The action could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEnd ? "End rights modification" : "Record review"}</DialogTitle>
          <DialogDescription>
            {modification?.right_affected} · {modification?.client_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {!isEnd && (
            <div>
              <Label>Effectiveness</Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>{isEnd ? "Reason for ending *" : "Review note"}</Label>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={isEnd ? "Why the restriction is no longer needed" : "What the data shows"} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button variant={isEnd ? "destructive" : "default"} onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            {isEnd ? "End modification" : "Save review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}