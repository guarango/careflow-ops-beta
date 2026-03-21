import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Shield } from "lucide-react";
import ComplianceSummaryCards from "@/components/compliance/ComplianceSummaryCards";
import StaffComplianceTable from "@/components/compliance/StaffComplianceTable";
import StaffComplianceProfile from "@/components/compliance/StaffComplianceProfile";
import { calcCompliance } from "@/components/compliance/complianceUtils";

const categories = ["Policy", "License", "Certification", "Inspection", "Training Record", "ISP", "Assessment", "Other"];
const docStatuses = ["Current", "Expiring Soon", "Expired", "Pending Review"];
const emptyDoc = { title: "", category: "", related_to: "", expiry_date: "", file_url: "", status: "Current", notes: "" };

export default function Compliance() {
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [form, setForm] = useState(emptyDoc);
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  const { data: docs = [] } = useQuery({
    queryKey: ["compliance"],
    queryFn: () => base44.entities.ComplianceDocument.list("-created_date"),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.StaffMember.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ComplianceDocument.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["compliance"] }); setShowAddDoc(false); setForm(emptyDoc); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ComplianceDocument.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["compliance"] }),
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, file_url }));
    setUploading(false);
  };

  const activeStaff = staff.filter(s => s.status === "Active" || !s.status);
  const selectedCompliance = selectedStaff ? calcCompliance(selectedStaff, docs) : null;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compliance Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">{activeStaff.length} active staff · {docs.length} documents tracked</p>
        </div>
        <Button onClick={() => { setForm(emptyDoc); setShowAddDoc(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Document
        </Button>
      </div>

      {!selectedStaff ? (
        <>
          <ComplianceSummaryCards staff={activeStaff} allDocs={docs} calcCompliance={calcCompliance} />
          <StaffComplianceTable staff={activeStaff} allDocs={docs} calcCompliance={calcCompliance} onSelectStaff={setSelectedStaff} />
        </>
      ) : (
        <StaffComplianceProfile
          staffMember={selectedStaff}
          compliance={selectedCompliance}
          onBack={() => setSelectedStaff(null)}
          onUpdateDoc={(id, data) => updateMutation.mutate({ id, data })}
        />
      )}

      {/* Add Document Dialog */}
      <Dialog open={showAddDoc} onOpenChange={setShowAddDoc}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Shield className="w-4 h-4" />Add Document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{docStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Related To (Staff Name)</Label><Input value={form.related_to} onChange={e => setForm({ ...form, related_to: e.target.value })} placeholder="Staff name" /></div>
            <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></div>
            <div>
              <Label>Upload File</Label>
              <div className="flex items-center gap-2">
                <Input type="file" onChange={handleFileUpload} disabled={uploading} />
                {uploading && <span className="text-xs text-muted-foreground">Uploading…</span>}
              </div>
              {form.file_url && <a href={form.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline mt-1 block">View file</a>}
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDoc(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.title || !form.category}>Add Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}