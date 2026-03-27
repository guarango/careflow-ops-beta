import React, { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil } from "lucide-react";
import { DEFAULT_AGENCY_TRAININGS } from "@/lib/trainingEngine";

const CATEGORIES = ["Agency-Universal", "Role-Specific", "Client-Specific", "Certification"];
const FREQUENCIES = ["One-Time", "Annual", "Biennial", "Per Certification Renewal", "Incident-Triggered", "Policy-Change-Triggered"];
const BLOCKS = ["Hard Block", "Soft Block", "Alert Only"];
const VERIFIERS = ["Self-Report + Supervisor", "Supervisor Only", "Third-Party Only", "Clinician Only"];

export default function TrainingLibraryManager({ library, onRefresh }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TrainingLibrary.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["training-library"] }); setShowDialog(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TrainingLibrary.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["training-library"] }); setShowDialog(false); },
  });

  const openNew = () => { setEditItem(null); setShowDialog(true); };
  const openEdit = (item) => { setEditItem(item); setShowDialog(true); };

  const handleSave = (form) => {
    if (editItem?.id) updateMutation.mutate({ id: editItem.id, data: form });
    else createMutation.mutate(form);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">Custom trainings added here supplement the default agency-universal and role-specific requirements.</p>
        <Button size="sm" onClick={openNew} className="gap-1"><Plus className="w-3.5 h-3.5" />Add Training</Button>
      </div>

      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Default Agency Trainings (built-in)</p>
        <div className="space-y-1.5">
          {DEFAULT_AGENCY_TRAININGS.map((t, i) => (
            <div key={i} className="flex items-center justify-between border border-border rounded-xl px-3 py-2 bg-muted/20">
              <div>
                <p className="text-sm font-medium">{t.title}</p>
                <p className="text-[10px] text-muted-foreground">{t.frequency} · {t.scheduling_block}</p>
              </div>
              <Badge variant="outline" className="text-xs">{t.category}</Badge>
            </div>
          ))}
        </div>
      </div>

      {library.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Custom Library ({library.length})</p>
          <div className="space-y-1.5">
            {library.map((t, i) => (
              <div key={i} className="flex items-center justify-between border border-border rounded-xl px-3 py-2 bg-white hover:bg-muted/20 transition-colors">
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-[10px] text-muted-foreground">{t.frequency} · {t.scheduling_block}</p>
                  {(t.applies_to_roles || []).length > 0 && <p className="text-[10px] text-muted-foreground">Roles: {t.applies_to_roles.join(", ")}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{t.category}</Badge>
                  <button type="button" onClick={() => openEdit(t)} className="text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showDialog && (
        <TrainingLibraryDialog
          item={editItem}
          onSave={handleSave}
          onClose={() => setShowDialog(false)}
          saving={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

function TrainingLibraryDialog({ item, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    title: "", category: "Agency-Universal", description: "", frequency: "Annual",
    valid_days: 365, minimum_passing_score: 80, has_competency_checkoff: false,
    who_can_verify: "Supervisor Only", scheduling_block: "Hard Block",
    issuing_organization: "", renewal_url: "", is_active: true, curriculum_version: "1.0",
    applies_to_roles: [],
    ...item,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item ? "Edit Training" : "Add Training to Library"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title *</Label><Input value={form.title} onChange={e => set("title", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={v => set("frequency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Valid Days (0 = one-time)</Label><Input type="number" value={form.valid_days || ""} onChange={e => set("valid_days", Number(e.target.value))} /></div>
            <div><Label>Min Passing Score (%)</Label><Input type="number" value={form.minimum_passing_score || ""} onChange={e => set("minimum_passing_score", Number(e.target.value))} /></div>
            <div><Label>Scheduling Block</Label>
              <Select value={form.scheduling_block} onValueChange={v => set("scheduling_block", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BLOCKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Who Can Verify</Label>
              <Select value={form.who_can_verify} onValueChange={v => set("who_can_verify", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VERIFIERS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" checked={form.has_competency_checkoff} onChange={e => set("has_competency_checkoff", e.target.checked)} />
            Requires competency check-off in addition to completion
          </label>
          <div><Label>Issuing Organization</Label><Input value={form.issuing_organization} onChange={e => set("issuing_organization", e.target.value)} /></div>
          <div><Label>Renewal URL</Label><Input value={form.renewal_url} onChange={e => set("renewal_url", e.target.value)} placeholder="https://..." /></div>
          <div><Label>Curriculum Version</Label><Input value={form.curriculum_version} onChange={e => set("curriculum_version", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!form.title || saving}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}