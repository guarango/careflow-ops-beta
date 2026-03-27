import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Shield, Plus, Edit, CheckCircle2, AlertTriangle, Lock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const COMM_METHODS = ["Verbal", "AAC Device", "Picture Board", "Written", "Sign Language", "Proxy Input"];
const INVOLVEMENT = ["Copied on everything", "Notified when something is sent", "Not involved", "Involved in specific categories only"];

const CATEGORIES = [
  { key: "weekly_highlight_report", label: "Weekly Highlight Report" },
  { key: "goal_progress", label: "Goal Progress Updates" },
  { key: "session_highlights", label: "Session Highlights" },
  { key: "health_updates", label: "Health & Medication Updates" },
  { key: "incident_notifications", label: "Incident Notifications" },
  { key: "schedule_information", label: "Schedule & Visit Information" },
  { key: "photo_sharing", label: "Photo Sharing" },
  { key: "financial_information", label: "Financial Information" },
];

const emptyConsent = {
  consent_date: new Date().toISOString().split("T")[0],
  communication_method_used: "Verbal",
  person_involvement_preference: "Notified when something is sent",
  guardianship_in_place: false,
  guardianship_authority_areas: "",
  requires_person_review_before_sharing: false,
  support_person_assisted: "",
  status: "Active",
  notes: "",
  access_categories: {
    weekly_highlight_report: true,
    goal_progress: true,
    session_highlights: true,
    health_updates: false,
    incident_notifications: false,
    schedule_information: true,
    photo_sharing: false,
    financial_information: false,
  },
};

export default function ConsentManager({ clientId, clientName }) {
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const { data: consents = [] } = useQuery({
    queryKey: ["portal-consents", clientId],
    queryFn: () => base44.entities.PortalConsent.filter({ client_id: clientId }),
  });

  const { data: portalUsers = [] } = useQuery({
    queryKey: ["portal-users-for-consent", clientId],
    queryFn: () => base44.entities.PortalUser.filter({ client_id: clientId }),
  });

  const [form, setForm] = useState(emptyConsent);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setCat = (k, v) => setForm(f => ({ ...f, access_categories: { ...f.access_categories, [k]: v } }));

  const save = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.PortalConsent.update(editing.id, data)
      : base44.entities.PortalConsent.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["portal-consents", clientId] }); setShowDialog(false); setEditing(null); },
  });

  const revoke = useMutation({
    mutationFn: (id) => base44.entities.PortalConsent.update(id, { status: "Revoked", revocation_date: new Date().toISOString().split("T")[0] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portal-consents", clientId] }),
  });

  const openEdit = (c) => {
    setEditing(c);
    setForm({ ...emptyConsent, ...c });
    setShowDialog(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyConsent);
    setShowDialog(true);
  };

  const handleSave = () => {
    const pu = portalUsers.find(u => u.id === selectedUserId);
    save.mutate({
      ...form,
      client_id: clientId,
      client_name: clientName,
      portal_user_id: editing?.portal_user_id || selectedUserId,
      portal_user_name: editing?.portal_user_name || (pu ? pu.full_name : ""),
    });
  };

  const firstName = clientName?.split(" ")[0] || clientName;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Shield className="w-4 h-4 text-violet-500" />Consent Records for {firstName}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Each family member has their own consent record, configured by {firstName}. Consent is reviewed at every ISP meeting.</p>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="w-3.5 h-3.5" />New Consent</Button>
      </div>

      <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-xs text-violet-800">
        <strong>Guardianship does not override this consent process.</strong> Even individuals with guardians have privacy rights and relationships they are entitled to manage. Legal decision-making authority covers specific domains — not all information, automatically. Document the scope of guardianship authority in the consent record.
      </div>

      {consents.length === 0 && (
        <div className="border-dashed border-2 border-slate-200 rounded-xl p-6 text-center text-sm text-slate-400">
          No consent records for {firstName}. Create one for each family member or natural support before enabling portal access.
        </div>
      )}

      <div className="space-y-2">
        {consents.map(c => (
          <div key={c.id} className={cn("border-2 rounded-xl p-4", c.status === "Active" ? "border-slate-200 bg-white" : "border-red-200 bg-red-50")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-sm">{c.portal_user_name}</p>
                  <Badge className={c.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>{c.status}</Badge>
                  {c.guardianship_in_place && <Badge variant="outline" className="text-[10px]">Guardian</Badge>}
                </div>
                <p className="text-xs text-slate-500">Consent: {c.consent_date} · Method: {c.communication_method_used}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {CATEGORIES.filter(cat => c.access_categories?.[cat.key]).map(cat => (
                    <span key={cat.key} className="text-[10px] bg-sky-100 text-sky-700 rounded px-1.5 py-0.5">{cat.label}</span>
                  ))}
                  {!CATEGORIES.some(cat => c.access_categories?.[cat.key]) && (
                    <span className="text-[10px] text-slate-400 italic">No categories shared</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => openEdit(c)} className="h-7 w-7 p-0"><Edit className="w-3.5 h-3.5" /></Button>
                {c.status === "Active" && (
                  <Button size="sm" variant="ghost" onClick={() => revoke.mutate(c.id)} className="h-7 px-2 text-red-500 text-xs">
                    Revoke
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-violet-500" />
              {editing ? "Edit Consent Record" : "New Consent Record"} — {firstName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-xs text-violet-800">
              This consent record documents decisions made <strong>by {firstName}</strong> — with whatever support they needed. Capture their actual choices, not what you or their guardian think is best.
            </div>

            {!editing && (
              <div>
                <Label>Family Member / Natural Support *</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select portal user" /></SelectTrigger>
                  <SelectContent>
                    {portalUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.relationship})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Consent Date</Label>
                <Input type="date" value={form.consent_date} onChange={e => set("consent_date", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Communication Method</Label>
                <Select value={form.communication_method_used} onValueChange={v => set("communication_method_used", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{COMM_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Support person who assisted (if any)</Label>
              <Input value={form.support_person_assisted} onChange={e => set("support_person_assisted", e.target.value)} className="mt-1" placeholder="Staff name" />
            </div>

            <div>
              <Label>{firstName}'s involvement preference</Label>
              <Select value={form.person_involvement_preference} onValueChange={v => set("person_involvement_preference", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{INVOLVEMENT.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <Label className="font-semibold">Categories {firstName} consents to share</Label>
              <p className="text-xs text-slate-500 mt-0.5 mb-2">Configure per-category — each family member can have different access.</p>
              <div className="space-y-2">
                {CATEGORIES.map(cat => (
                  <div key={cat.key} className="flex items-center justify-between py-1.5 border-b border-slate-50">
                    <span className="text-sm">{cat.label}</span>
                    <Switch
                      checked={!!form.access_categories?.[cat.key]}
                      onCheckedChange={v => setCat(cat.key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <p className="text-sm font-medium">{firstName} requires review before sharing</p>
                <p className="text-xs text-slate-500">Nothing is sent to this person without {firstName}'s review first</p>
              </div>
              <Switch checked={form.requires_person_review_before_sharing} onCheckedChange={v => set("requires_person_review_before_sharing", v)} />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <p className="text-sm font-medium">Guardianship in place</p>
                <p className="text-xs text-slate-500">Document specific areas of legal authority below — not all information is automatically shared</p>
              </div>
              <Switch checked={form.guardianship_in_place} onCheckedChange={v => set("guardianship_in_place", v)} />
            </div>

            {form.guardianship_in_place && (
              <div>
                <Label>Areas of guardian's legal decision-making authority (be specific)</Label>
                <Textarea rows={2} className="mt-1 text-sm" value={form.guardianship_authority_areas} onChange={e => set("guardianship_authority_areas", e.target.value)} placeholder="e.g. Medical decisions, financial management — NOT general information sharing" />
              </div>
            )}

            <div>
              <Label>Notes</Label>
              <Textarea rows={2} className="mt-1 text-sm" value={form.notes} onChange={e => set("notes", e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={save.isPending || (!editing && !selectedUserId)}>
              {editing ? "Update Consent" : "Save Consent Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}