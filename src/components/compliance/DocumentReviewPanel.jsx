import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Download, FileText } from "lucide-react";

export default function DocumentReviewPanel({ doc, staffMember, onClose, onUpdate }) {
  const [notes, setNotes] = useState(doc.notes || "");
  const [rejecting, setRejecting] = useState(false);

  const handleApprove = () => onUpdate(doc.id, { status: "Current", notes });
  const handleReject = () => onUpdate(doc.id, { status: "Expired", notes });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" /> Document Review
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Document</p>
              <p className="font-semibold">{doc.title}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Staff Member</p>
              <p className="font-semibold">{staffMember.first_name} {staffMember.last_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Category</p>
              <p>{doc.category}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Current Status</p>
              <Badge variant="outline" className="text-xs mt-0.5">{doc.status}</Badge>
            </div>
            {doc.expiry_date && (
              <div>
                <p className="text-muted-foreground text-xs">Expiry Date</p>
                <p>{doc.expiry_date}</p>
              </div>
            )}
            {doc.created_date && (
              <div>
                <p className="text-muted-foreground text-xs">Upload Date</p>
                <p>{new Date(doc.created_date).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {doc.file_url ? (
            <div className="border rounded-lg p-4 bg-muted/30 flex flex-col items-center gap-3">
              <FileText className="w-10 h-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Document uploaded</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">View Document</a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={doc.file_url} download><Download className="w-3.5 h-3.5 mr-1" />Download</a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-muted/30 text-center text-sm text-muted-foreground">
              No file uploaded
            </div>
          )}

          <div>
            <Label>Notes / Feedback</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional notes for this document..." />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="sm:mr-auto">Cancel</Button>
          <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={handleReject}>
            <XCircle className="w-4 h-4 mr-1" /> Reject
          </Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleApprove}>
            <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}