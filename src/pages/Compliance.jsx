import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Plus, Search, Upload } from "lucide-react";
import { base44 as b44 } from "@/api/base44Client";

const categories = ["Policy", "License", "Certification", "Inspection", "Training Record", "ISP", "Assessment", "Other"];
const docStatuses = ["Current", "Expiring Soon", "Expired", "Pending Review"];

const emptyDoc = { title: "", category: "", related_to: "", expiry_date: "", file_url: "", status: "Current", notes: "" };

export default function Compliance() {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyDoc);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["compliance"],
    queryFn: () => base44.entities.ComplianceDocument.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ComplianceDocument.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["compliance"] }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ComplianceDocument.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["compliance"] }); closeDialog(); },
  });

  const closeDialog = () => { setShowDialog(false); setEditing(null); setForm(emptyDoc); };
  const openNew = () => { setForm(emptyDoc); setEditing(null); setShowDialog(true); };
  const openEdit = (d) => { setForm(d); setEditing(d); setShowDialog(true); };

  const handleSave = () => {
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await b44.integrations.Core.UploadFile({ file });
    setForm({ ...form, file_url });
    setUploading(false);
  };

  const filtered = docs.filter(d =>
    `${d.title} ${d.category} ${d.related_to} ${d.status}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Compliance & Documents" subtitle={`${docs.length} documents tracked`} action={<Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add Document</Button>} />

      <Card className="mb-6">
        <CardContent className="py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 border-0 bg-transparent focus-visible:ring-0" />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={Shield} title="No documents" description="Track your compliance documents here." action={<Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" />Add Document</Button>} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden md:table-cell">Related To</TableHead>
                  <TableHead className="hidden md:table-cell">Expiry</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(d)}>
                    <TableCell className="font-medium">{d.title}</TableCell>
                    <TableCell className="text-sm">{d.category}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{d.related_to || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{d.expiry_date || "—"}</TableCell>
                    <TableCell><StatusBadge status={d.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Document" : "Add Document"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{docStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Related To</Label><Input value={form.related_to} onChange={(e) => setForm({...form, related_to: e.target.value})} placeholder="Staff or client name" /></div>
            <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({...form, expiry_date: e.target.value})} /></div>
            <div>
              <Label>Upload File</Label>
              <div className="flex items-center gap-2">
                <Input type="file" onChange={handleFileUpload} disabled={uploading} />
                {uploading && <span className="text-xs text-muted-foreground">Uploading...</span>}
              </div>
              {form.file_url && <a href={form.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline mt-1 block">View file</a>}
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.title || !form.category}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}