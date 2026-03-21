import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Clock, CheckCircle2, MessageSquare, Send, Inbox } from "lucide-react";

export default function StaffRequestsPanel({ staffMember }) {
  const [respondingTo, setRespondingTo] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: ["document-requests", staffMember.id],
    queryFn: () => base44.entities.DocumentRequest.filter({ staff_id: staffMember.id }, "-created_date"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DocumentRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-requests"] });
      setRespondingTo(null);
      setAdminNote("");
    },
  });

  const handleRespond = () => {
    updateMutation.mutate({
      id: respondingTo.id,
      data: { status: "Responded", admin_note: adminNote, responded_date: new Date().toISOString().split("T")[0] },
    });
  };

  const pending = requests.filter(r => r.status === "Pending");
  const responded = requests.filter(r => r.status === "Responded");

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Inbox className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Document Requests</h3>
        {pending.length > 0 && (
          <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-xs">{pending.length} pending</Badge>
        )}
      </div>

      {requests.length === 0 ? (
        <Card className="p-4 text-center text-sm text-muted-foreground">No document requests from this staff member.</Card>
      ) : (
        <div className="space-y-2">
          {requests.map(req => (
            <Card key={req.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{req.document_type}</span>
                    <Badge variant="outline" className={`text-xs border ${req.status === "Pending" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-green-50 text-green-700 border-green-200"}`}>
                      {req.status === "Pending" ? <Clock className="w-3 h-3 mr-1 inline" /> : <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
                      {req.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Requested {req.created_date ? new Date(req.created_date).toLocaleDateString() : "—"}
                    {req.responded_date && ` · Responded ${new Date(req.responded_date).toLocaleDateString()}`}
                  </p>
                  {req.message && (
                    <p className="text-xs mt-1.5 text-muted-foreground bg-muted rounded px-2 py-1.5">
                      <MessageSquare className="w-3 h-3 inline mr-1" />"{req.message}"
                    </p>
                  )}
                  {req.admin_note && (
                    <p className="text-xs mt-1.5 text-primary bg-primary/5 rounded px-2 py-1.5">
                      <Send className="w-3 h-3 inline mr-1" />Admin: "{req.admin_note}"
                    </p>
                  )}
                </div>
                {req.status === "Pending" && (
                  <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={() => { setRespondingTo(req); setAdminNote(""); }}>
                    Respond
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!respondingTo} onOpenChange={() => setRespondingTo(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Respond to Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Document Requested</p>
              <p className="font-medium text-sm">{respondingTo?.document_type}</p>
            </div>
            {respondingTo?.message && (
              <div className="bg-muted rounded px-3 py-2 text-xs text-muted-foreground">
                Staff message: "{respondingTo.message}"
              </div>
            )}
            <div>
              <Label>Note / Response to Staff</Label>
              <Textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={3} placeholder="Explain what action is needed, provide a link, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondingTo(null)}>Cancel</Button>
            <Button onClick={handleRespond} className="gap-1"><CheckCircle2 className="w-4 h-4" /> Mark Responded</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}