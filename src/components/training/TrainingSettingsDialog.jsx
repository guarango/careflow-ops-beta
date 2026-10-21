import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";

const ONBOARDING_REQUIREMENTS = [
  "CPR/First Aid", "Bloodborne Pathogens", "Medication Administration",
  "Mandated Reporter", "HIPAA", "Behavior Management",
  "Person-Centered Planning", "Abuse & Neglect",
  "Infection Control", "Crisis Prevention", "Fire Safety", "Food Safety",
];

export default function TrainingSettingsDialog({ training, open, onClose }) {
  const queryClient = useQueryClient();

  const updateTraining = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Training.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
      toast.success("Settings saved");
      onClose();
    },
  });

  const publish = useMutation({
    mutationFn: async ({ id, data }) => {
      const version = data.status === "Published" && training.status === "Draft" ? (training.version || 1) : training.version;
      return base44.entities.Training.update(id, {
        ...data,
        status: "Published",
        version,
        published_at: new Date().toISOString(),
        last_published_version: version,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
      toast.success("Training published");
      onClose();
    },
  });

  const [form, setForm] = React.useState({
    title: training?.title || "",
    description: training?.description || "",
    training_hours: training?.training_hours || 0,
    due_rule: training?.due_rule || "Within 30 days",
    linked_onboarding_requirement: training?.linked_onboarding_requirement || "",
    category: training?.category || "Agency-Universal",
  });

  React.useEffect(() => {
    if (open && training) {
      setForm({
        title: training.title || "",
        description: training.description || "",
        training_hours: training.training_hours || 0,
        due_rule: training.due_rule || "Within 30 days",
        linked_onboarding_requirement: training.linked_onboarding_requirement || "",
        category: training.category || "Agency-Universal",
      });
    }
  }, [open, training?.id]);

  if (!training) return null;

  const handleSave = () => updateTraining.mutate({ id: training.id, data: form });
  const handlePublish = () => publish.mutate({ id: training.id, data: form });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Training Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="What this training covers" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Training hours</Label>
              <Input type="number" step="0.25" value={form.training_hours}
                onChange={e => setForm(f => ({ ...f, training_hours: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label>Due rule</Label>
              <Select value={form.due_rule} onValueChange={v => setForm(f => ({ ...f, due_rule: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Within 7 days">Within 7 days</SelectItem>
                  <SelectItem value="Within 14 days">Within 14 days</SelectItem>
                  <SelectItem value="Within 30 days">Within 30 days</SelectItem>
                  <SelectItem value="Within 60 days">Within 60 days</SelectItem>
                  <SelectItem value="Within 90 days">Within 90 days</SelectItem>
                  <SelectItem value="No due date">No due date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Agency-Universal">Agency-Universal</SelectItem>
                <SelectItem value="Role-Specific">Role-Specific</SelectItem>
                <SelectItem value="Client-Specific">Client-Specific</SelectItem>
                <SelectItem value="Certification">Certification</SelectItem>
                <SelectItem value="Competency">Competency</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Link to onboarding requirement (optional)</Label>
            <Select value={form.linked_onboarding_requirement || "none"}
              onValueChange={v => setForm(f => ({ ...f, linked_onboarding_requirement: v === "none" ? "" : v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {ONBOARDING_REQUIREMENTS.map(req => (
                  <SelectItem key={req} value={req}>{req}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Completing this training satisfies this onboarding item</p>
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-3">
            <p><strong>Versioning:</strong> v{training.version} · Editing a published training creates a new version. Past completions keep their version.</p>
          </div>
        </div>
        <DialogFooter className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave} disabled={updateTraining.isPending}>Save</Button>
            {training.status !== "Published" ? (
              <Button onClick={handlePublish} disabled={publish.isPending}>Publish</Button>
            ) : (
              <span className="text-xs text-green-600 font-medium px-3 py-2">✓ Published (v{training.version})</span>
            )}
          </div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}