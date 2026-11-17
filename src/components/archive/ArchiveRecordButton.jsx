import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Archive, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

/** Archive replaces delete for clinical records. Nothing here can hard-delete. */
export default function ArchiveRecordButton({ entityName, recordId, label, onArchived }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const archive = async () => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke("archiveClinicalRecord", {
        entity_name: entityName,
        record_id: recordId,
        reason,
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(`Archived until ${res.data?.retention_until || "the retention date"}.`);
      setOpen(false);
      setReason("");
      onArchived?.();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Could not archive this record.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs h-7 text-muted-foreground"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      >
        <Archive className="w-3.5 h-3.5 mr-1" /> Archive
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Archive record</DialogTitle>
            <DialogDescription>
              Deleting a clinical record is not offered. Archiving keeps {label ? `“${label}”` : "this record"} available to Admin for its full retention period.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Reason (optional)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why the record is being archived" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={archive} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Archive className="w-4 h-4 mr-1" />}
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}