import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send } from "lucide-react";
import { REQUIRED_DOCS, CLINICAL_EXTRA_DOCS } from "./complianceUtils";

const ALL_DOC_TYPES = [...REQUIRED_DOCS, ...CLINICAL_EXTRA_DOCS, "Other"];

export default function RequestDocumentModal({ staffMember, defaultDocName, missingDocs, onClose }) {
  const [docType, setDocType] = useState(defaultDocName || (missingDocs ? "Multiple" : ""));
  const [message, setMessage] = useState("");

  const handleSend = () => {
    // In a real app, this would send a notification or email
    onClose();
  };

  const isReminder = !defaultDocName && !missingDocs;
  const title = isReminder ? "Send Reminder" : missingDocs ? "Request All Missing Documents" : "Request Document";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Send className="w-4 h-4" />{title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Staff Member</Label>
            <div className="flex h-9 items-center px-3 rounded-md border bg-muted text-sm">
              {staffMember.first_name} {staffMember.last_name}
            </div>
          </div>

          {!missingDocs && (
            <div>
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue placeholder="Select document" /></SelectTrigger>
                <SelectContent>{ALL_DOC_TYPES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}

          {missingDocs && (
            <div>
              <Label>Missing Documents ({missingDocs.length})</Label>
              <div className="mt-1 space-y-1">
                {missingDocs.map(d => (
                  <div key={d} className="text-xs bg-muted rounded px-2 py-1">{d}</div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>Message (optional)</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Add a message to include in the request..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} className="gap-1"><Send className="w-4 h-4" /> Send Request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}