import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ArrowUpCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function IncidentReviewPanel({ incident, onUpdate, canReview, reviewerName }) {
  const [newAction, setNewAction] = useState({ action: "", responsible_party: "", due_date: "" });
  const [reviewNotes, setReviewNotes] = useState(incident.review_notes || "");

  const addFollowUp = () => {
    if (!newAction.action) return;
    const actions = [...(incident.follow_up_actions || []), { ...newAction, completed: false }];
    onUpdate({ follow_up_actions: actions });
    setNewAction({ action: "", responsible_party: "", due_date: "" });
  };

  const toggleAction = (idx) => {
    const actions = (incident.follow_up_actions || []).map((a, i) => i === idx ? { ...a, completed: !a.completed } : a);
    onUpdate({ follow_up_actions: actions });
  };

  const removeAction = (idx) => {
    onUpdate({ follow_up_actions: (incident.follow_up_actions || []).filter((_, i) => i !== idx) });
  };

  const escalate = () => onUpdate({ escalated_to_admin: true, escalated_at: new Date().toISOString(), status: "Under Review" });
  const closeIncident = () => onUpdate({ status: "Closed", reviewed_by: reviewerName, reviewed_at: new Date().toISOString() });

  const saveNotes = () => onUpdate({ review_notes: reviewNotes });

  if (!canReview) return null;

  return (
    <div className="space-y-5">
      {incident.escalated_to_admin && (
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm text-orange-700">
          <ArrowUpCircle className="w-4 h-4" /> Escalated to Admin on {incident.escalated_at ? format(new Date(incident.escalated_at), "MMM d, h:mm a") : ""}
        </div>
      )}

      <div>
        <Label className="text-sm">Follow-up Actions</Label>
        <div className="space-y-2 mt-2">
          {(incident.follow_up_actions || []).map((a, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
              <Checkbox checked={a.completed} onCheckedChange={() => toggleAction(i)} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${a.completed ? "line-through text-muted-foreground" : ""}`}>{a.action}</p>
                <p className="text-xs text-muted-foreground">{a.responsible_party}{a.due_date && ` · Due ${a.due_date}`}</p>
              </div>
              <button onClick={() => removeAction(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="Action..." value={newAction.action} onChange={(e) => setNewAction({ ...newAction, action: e.target.value })} className="h-8 text-sm flex-1" />
            <Input placeholder="Responsible" value={newAction.responsible_party} onChange={(e) => setNewAction({ ...newAction, responsible_party: e.target.value })} className="h-8 text-sm flex-1" />
            <Input type="date" value={newAction.due_date} onChange={(e) => setNewAction({ ...newAction, due_date: e.target.value })} className="h-8 text-sm" />
            <Button size="sm" variant="outline" onClick={addFollowUp}><Plus className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm">Review Notes</Label>
        <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={3} className="mt-1" placeholder="Manager review notes..." />
        <Button size="sm" variant="outline" className="mt-2" onClick={saveNotes}>Save Notes</Button>
      </div>

      <div className="flex items-center gap-2">
        {incident.status !== "Closed" && (
          <>
            {!incident.escalated_to_admin && (
              <Button variant="outline" size="sm" onClick={escalate}><ArrowUpCircle className="w-4 h-4 mr-1" /> Escalate to Admin</Button>
            )}
            <Button size="sm" onClick={closeIncident}><CheckCircle className="w-4 h-4 mr-1" /> Close Incident</Button>
          </>
        )}
        {incident.status === "Closed" && (
          <span className="text-sm text-emerald-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Closed by {incident.reviewed_by || "Admin"} on {incident.reviewed_at ? format(new Date(incident.reviewed_at), "MMM d, yyyy") : ""}</span>
        )}
      </div>
    </div>
  );
}