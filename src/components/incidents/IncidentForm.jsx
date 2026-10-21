import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import DictationButton from "@/components/shared/DictationButton";

const categories = ["Abuse", "Neglect", "Exploitation", "Behavioral", "Medical", "Fall", "Elopement", "Property Damage", "Medication Error", "Injury", "Other"];
const locations = ["Day Program", "Community Outing", "Residence", "Vocational Site", "Telehealth", "Other"];

function DictField({ label, value, onChange, rows = 3, placeholder, required }) {
  return (
    <div>
      <Label className="text-sm">{label}{required && " *"}</Label>
      <div className="relative">
        <Textarea value={value || ""} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="pr-12" />
        <div className="absolute right-2 top-2"><DictationButton value={value || ""} onChange={onChange} /></div>
      </div>
    </div>
  );
}

export default function IncidentForm({ open, onClose, onSave, editing, clients, houses, user, saving }) {
  const isEdit = !!editing;
  const [form, setForm] = useState(() => editing || {
    client_id: "", client_name: "", date: format(new Date(), "yyyy-MM-dd"), time: format(new Date(), "HH:mm"),
    type: "", severity: "", description: "", location: "", location_detail: "", staff_involved: "", witnesses: "",
    injuries_occurred: false, injuries_description: "", medical_treatment_required: false, law_enforcement_involved: false,
    restrictive_intervention_used: false, restrictive_intervention_description: "", actions_taken: "", photos: [],
    reported_by_name: user?.full_name || "", status: "Open",
  });
  const [sigChecked, setSigChecked] = useState(!!editing?.signature_timestamp);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    const house = houses?.find(h => h.id === client?.house_id);
    setForm(f => ({ ...f, client_id: clientId, client_name: client ? `${client.first_name} ${client.last_name}` : "", house_name: house?.name || "" }));
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uris = await Promise.all(files.map(f => base44.integrations.Core.UploadPrivateFile({ file: f })));
      set("photos", [...(form.photos || []), ...uris.map(r => r.file_uri)]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removePhoto = (idx) => set("photos", (form.photos || []).filter((_, i) => i !== idx));

  const handleSubmit = () => {
    const data = { ...form };
    if (!isEdit) {
      data.signature_timestamp = `Submitted by ${data.reported_by_name || "Staff"} on ${format(new Date(), "MM/dd/yyyy")} at ${format(new Date(), "h:mm aa")}`;
      data.status = "Under Review";
    }
    onSave(data);
  };

  const valid = form.client_id && form.date && form.type && form.severity && form.description && (isEdit || sigChecked);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Incident Report" : "Report Incident"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label>Client *</Label>
            <Select value={form.client_id} onValueChange={handleClientSelect} disabled={isEdit}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Date *</Label><Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></div>
          <div><Label>Time *</Label><Input type="time" value={form.time} onChange={(e) => set("time", e.target.value)} /></div>
          <div>
            <Label>Location</Label>
            <Select value={form.location || ""} onValueChange={(v) => set("location", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {form.location === "Other" && <div><Label>Location Detail</Label><Input value={form.location_detail || ""} onChange={(e) => set("location_detail", e.target.value)} /></div>}
          <div>
            <Label>Category *</Label>
            <Select value={form.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Severity *</Label>
            <Select value={form.severity} onValueChange={(v) => set("severity", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="Non-critical">Non-critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2"><DictField label="Description" value={form.description} onChange={(v) => set("description", v)} rows={3} required placeholder="Describe what happened..." /></div>
          <div className="sm:col-span-2"><DictField label="Staff Involved" value={form.staff_involved} onChange={(v) => set("staff_involved", v)} rows={2} placeholder="Names of staff present..." /></div>
          <div className="sm:col-span-2"><DictField label="Witnesses" value={form.witnesses} onChange={(v) => set("witnesses", v)} rows={2} placeholder="Witness names and contact..." /></div>
          <div className="sm:col-span-2 flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!form.injuries_occurred} onCheckedChange={(v) => set("injuries_occurred", v)} /> Injuries?</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!form.medical_treatment_required} onCheckedChange={(v) => set("medical_treatment_required", v)} /> Medical Treatment?</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={!!form.law_enforcement_involved} onCheckedChange={(v) => set("law_enforcement_involved", v)} /> Law Enforcement?</label>
          </div>
          {form.injuries_occurred && <div className="sm:col-span-2"><DictField label="Injury Description" value={form.injuries_description} onChange={(v) => set("injuries_description", v)} rows={2} placeholder="Describe injuries..." /></div>}
          <div className="sm:col-span-2 flex items-center gap-2 text-sm">
            <Checkbox checked={!!form.restrictive_intervention_used} onCheckedChange={(v) => set("restrictive_intervention_used", v)} /> Restrictive Intervention Used?
          </div>
          {form.restrictive_intervention_used && <div className="sm:col-span-2"><DictField label="Restrictive Intervention Description" value={form.restrictive_intervention_description} onChange={(v) => set("restrictive_intervention_description", v)} rows={2} placeholder="Describe the restrictive intervention..." /></div>}
          <div className="sm:col-span-2">
            <Label>Photos</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {(form.photos || []).map((uri, i) => (
                <div key={i} className="relative w-16 h-16 rounded border overflow-hidden bg-muted">
                  <button type="button" onClick={() => removePhoto(i)} className="absolute top-0 right-0 bg-red-500 text-white rounded-bl p-0.5"><X className="w-3 h-3" /></button>
                  <span className="text-[10px] text-muted-foreground flex items-center justify-center w-full h-full">Photo {i + 1}</span>
                </div>
              ))}
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center justify-center w-16 h-16 rounded border-2 border-dashed border-border hover:border-primary text-muted-foreground">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Uploaded photos are stored privately.</p>
          </div>
          <div className="sm:col-span-2"><DictField label="Immediate Actions Taken" value={form.actions_taken} onChange={(v) => set("actions_taken", v)} rows={2} placeholder="What immediate actions were taken?" /></div>
          <div><Label>Reported By</Label><Input value={form.reported_by_name || ""} onChange={(e) => set("reported_by_name", e.target.value)} /></div>
        </div>

        {!isEdit && (
          <div className="bg-muted/40 border border-border rounded-lg p-3 mt-4">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" checked={sigChecked} onChange={(e) => setSigChecked(e.target.checked)} className="w-4 h-4 accent-primary mt-0.5 cursor-pointer" />
              <span className="text-sm leading-snug">I confirm this incident report is accurate and complete to the best of my knowledge</span>
            </label>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!valid || saving}>{saving ? "Saving..." : isEdit ? "Update" : "Submit"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}