import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { toast } from "sonner";

export default function LogExternalTrainingDialog({ open, onClose, staffId, staffName }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    provider: "",
    date: "",
    hours: 1,
  });
  const [certificateUri, setCertificateUri] = useState(null);
  const [uploading, setUploading] = useState(false);

  const createLog = useMutation({
    mutationFn: (data) => base44.entities.TrainingAssignment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-training-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["training-hours-report"] });
      toast.success("External training logged. It will be reviewed by your manager.");
      onClose();
      setForm({ title: "", provider: "", date: "", hours: 1 });
      setCertificateUri(null);
    },
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      setCertificateUri(file_uri);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !staffId) {
      toast.error("Title is required");
      return;
    }
    createLog.mutate({
      staff_id: staffId,
      staff_name: staffName,
      is_external: true,
      external_title: form.title,
      external_provider: form.provider,
      external_date: form.date || undefined,
      hours_awarded: Number(form.hours) || 0,
      certificate_uri: certificateUri,
      status: "Completed",
      assignment_type: "manual",
      completed_at: new Date().toISOString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log External Training</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Training title</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. CPR & First Aid Certification" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Provider</Label>
              <Input value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                placeholder="e.g. Red Cross" />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Hours</Label>
            <Input type="number" step="0.25" value={form.hours}
              onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Certificate (optional)</Label>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:bg-accent/50">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {uploading ? "Uploading..." : certificateUri ? "✓ Certificate uploaded" : "Upload certificate"}
              </span>
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createLog.isPending}>Log Training</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}