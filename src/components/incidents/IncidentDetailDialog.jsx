import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, MapPin, Calendar, User, Shield, AlertTriangle, Camera } from "lucide-react";
import { format } from "date-fns";
import IncidentDeadlineTracker from "./IncidentDeadlineTracker";
import IncidentReviewPanel from "./IncidentReviewPanel";
import { useCreateFileSignedUrl } from "@/hooks/useCreateFileSignedUrl";

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div><span className="text-xs text-muted-foreground">{label}</span><p className="text-sm">{value || "—"}</p></div>
    </div>
  );
}

export default function IncidentDetailDialog({ open, incident, onClose, onEdit, onUpdate, canReview, reviewerName }) {
  const [tab, setTab] = useState("details");
  if (!incident) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span>Incident — {incident.client_name}</span>
            <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="w-3.5 h-3.5 mr-1" /> Edit</Button>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
            <TabsTrigger value="deadlines" className="flex-1">Deadlines</TabsTrigger>
            {canReview && <TabsTrigger value="review" className="flex-1">Review</TabsTrigger>}
          </TabsList>

          <TabsContent value="details" className="space-y-1 mt-3">
            <DetailRow icon={Calendar} label="Date & Time" value={`${incident.date || "—"} ${incident.time || ""}`} />
            <DetailRow icon={MapPin} label="Location" value={incident.location_detail ? `${incident.location} — ${incident.location_detail}` : incident.location} />
            <DetailRow icon={AlertTriangle} label="Category" value={incident.type} />
            <DetailRow icon={Shield} label="Severity" value={incident.severity} />
            <div className="py-2"><span className="text-xs text-muted-foreground">Description</span><p className="text-sm whitespace-pre-wrap">{incident.description}</p></div>
            {incident.staff_involved && <DetailRow icon={User} label="Staff Involved" value={incident.staff_involved} />}
            {incident.witnesses && <DetailRow icon={User} label="Witnesses" value={incident.witnesses} />}
            {incident.injuries_occurred && <div className="py-2"><span className="text-xs text-muted-foreground">Injuries</span><p className="text-sm">{incident.injuries_description}</p></div>}
            {incident.restrictive_intervention_used && <div className="py-2"><span className="text-xs text-muted-foreground">Restrictive Intervention</span><p className="text-sm">{incident.restrictive_intervention_description}</p></div>}
            <DetailRow icon={User} label="Medical Treatment Required" value={incident.medical_treatment_required ? "Yes" : "No"} />
            <DetailRow icon={Shield} label="Law Enforcement Involved" value={incident.law_enforcement_involved ? "Yes" : "No"} />
            {incident.actions_taken && <div className="py-2"><span className="text-xs text-muted-foreground">Immediate Actions Taken</span><p className="text-sm whitespace-pre-wrap">{incident.actions_taken}</p></div>}
            <DetailRow icon={User} label="Reported By" value={incident.reported_by_name} />
            {incident.signature_timestamp && <p className="text-xs text-muted-foreground mt-2">{incident.signature_timestamp}</p>}
            {(incident.photos || []).length > 0 && (
              <div className="py-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Camera className="w-3 h-3" /> Photos ({incident.photos.length})</span>
                <PhotoGrid photos={incident.photos} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="deadlines" className="mt-3">
            <IncidentDeadlineTracker incident={incident} onUpdate={onUpdate} canEdit={canReview} />
          </TabsContent>

          {canReview && (
            <TabsContent value="review" className="mt-3">
              <IncidentReviewPanel incident={incident} onUpdate={onUpdate} canReview={canReview} reviewerName={reviewerName} />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function PhotoGrid({ photos }) {
  const { urls } = useCreateFileSignedUrl(photos || []);
  if (!urls?.length) return <p className="text-xs text-muted-foreground mt-1">Loading photos...</p>;
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {urls.map((src, i) => src && <img key={i} src={src} alt={`Photo ${i + 1}`} className="w-20 h-20 object-cover rounded border" />)}
    </div>
  );
}