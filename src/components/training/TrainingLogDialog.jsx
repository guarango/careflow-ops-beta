import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DELIVERY_METHODS = ["In-Person", "Online", "Blended", "Skills Observation", "Self-Directed Review", "Third-Party Certification"];
const STATUSES = ["Completed", "In Progress", "Failed", "Waived"];
const CATEGORIES = ["Agency-Universal", "Role-Specific", "Client-Specific", "Certification", "Competency"];

export default function TrainingLogDialog({ initialData, staffName, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    training_id: "",
    training_title: "",
    training_category: "Agency-Universal",
    delivery_method: "In-Person",
    status: "Completed",
    completed_date: new Date().toISOString().split("T")[0],
    expiration_date: "",
    score: "",
    passed: null,
    verified_by: "",
    curriculum_version: "",
    trainer_name: "",
    training_location: "",
    issuing_organization: "",
    certification_number: "",
    notes: "",
    ...initialData,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    const data = {
      ...form,
      score: form.score !== "" ? Number(form.score) : undefined,
      passed: form.score !== "" ? Number(form.score) >= (form.min_score || 80) : form.status === "Completed",
      remediation_cycle: form.remediation_cycle || 0,
    };
    onSave(data);
  };

  const isValid = form.training_title && form.status && form.completed_date;
  const isCert = form.training_category === "Certification";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Training Completion</DialogTitle>
          <p className="text-xs text-muted-foreground">Staff: {staffName}</p>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Training Title *</Label>
              <Input value={form.training_title} onChange={e => set("training_title", e.target.value)} placeholder="Training name..." />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.training_category} onValueChange={v => set("training_category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Delivery Method</Label>
              <Select value={form.delivery_method} onValueChange={v => set("delivery_method", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DELIVERY_METHODS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status *</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Completion Date *</Label>
              <Input type="date" value={form.completed_date} onChange={e => set("completed_date", e.target.value)} />
            </div>
            <div>
              <Label>Expiration Date</Label>
              <Input type="date" value={form.expiration_date} onChange={e => set("expiration_date", e.target.value)} />
            </div>
            <div>
              <Label>Score (%)</Label>
              <Input type="number" value={form.score} onChange={e => set("score", e.target.value)} placeholder="e.g. 85" min={0} max={100} />
            </div>
            <div>
              <Label>Verified By</Label>
              <Input value={form.verified_by} onChange={e => set("verified_by", e.target.value)} placeholder="Supervisor name" />
            </div>
            <div>
              <Label>Trainer Name</Label>
              <Input value={form.trainer_name} onChange={e => set("trainer_name", e.target.value)} />
            </div>
            <div>
              <Label>Curriculum Version</Label>
              <Input value={form.curriculum_version} onChange={e => set("curriculum_version", e.target.value)} placeholder="e.g. v2.1" />
            </div>
            {isCert && <>
              <div>
                <Label>Issuing Organization</Label>
                <Input value={form.issuing_organization} onChange={e => set("issuing_organization", e.target.value)} />
              </div>
              <div>
                <Label>Certification Number</Label>
                <Input value={form.certification_number} onChange={e => set("certification_number", e.target.value)} />
              </div>
            </>}
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} className="text-sm" />
          </div>
          {form.status === "Failed" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              A failed training will trigger a remediation plan. The staff member will be notified and a supervisor follow-up will be required.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!isValid || saving}>{saving ? "Saving..." : "Save Record"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}