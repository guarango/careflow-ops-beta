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
import { FileText, Plus, Search } from "lucide-react";
import { useAssignedClients } from "@/hooks/useAssignedClients";
import NoDSPClientsState from "@/components/shared/NoDSPClientsState";

const serviceTypes = ["Residential", "Day Program", "Community Living", "Respite", "Supported Employment"];
const noteStatuses = ["Draft", "Submitted", "Approved", "Needs Revision"];

const emptyNote = { client_id: "", client_name: "", staff_name: "", date: "", start_time: "", end_time: "", service_type: "", goals_addressed: "", activities: "", behavior_notes: "", progress_notes: "", status: "Draft" };

export default function SessionNotes() {
  const { isDSPMode, assignedClientIds } = useAssignedClients();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyNote);
  const [search, setSearch] = useState("");

  const queryClient = useQueryClient();
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["session-notes"],
    queryFn: () => base44.entities.SessionNote.list("-created_date"),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SessionNote.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["session-notes"] }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SessionNote.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["session-notes"] }); closeDialog(); },
  });

  const closeDialog = () => { setShowDialog(false); setEditing(null); setForm(emptyNote); };
  const openNew = () => { setForm(emptyNote); setEditing(null); setShowDialog(true); };
  const openEdit = (n) => { setForm(n); setEditing(n); setShowDialog(true); };

  const handleSave = () => {
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setForm({ ...form, client_id: clientId, client_name: client ? `${client.first_name} ${client.last_name}` : "" });
  };

  const visibleClients = isDSPMode ? clients.filter(c => assignedClientIds.includes(c.id)) : clients;
  const visibleNotes = isDSPMode ? notes.filter(n => assignedClientIds.includes(n.client_id)) : notes;

  const filtered = visibleNotes.filter(n =>
    `${n.client_name} ${n.staff_name} ${n.date}`.toLowerCase().includes(search.toLowerCase())
  );

  if (isDSPMode && assignedClientIds.length === 0) return <NoDSPClientsState />;

  return (
    <div>
      <PageHeader title="Session Notes" subtitle={`${visibleNotes.length} notes`} action={<Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />New Note</Button>} />

      <Card className="mb-6">
        <CardContent className="py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 border-0 bg-transparent focus-visible:ring-0" />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={FileText} title="No session notes" description="Create your first session note." action={<Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" />New Note</Button>} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden md:table-cell">Service</TableHead>
                  <TableHead className="hidden md:table-cell">Staff</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((n) => (
                  <TableRow key={n.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(n)}>
                    <TableCell className="font-medium">{n.client_name || "—"}</TableCell>
                    <TableCell className="text-sm">{n.date}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{n.service_type || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{n.staff_name || "—"}</TableCell>
                    <TableCell><StatusBadge status={n.status || "Draft"} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Session Note" : "New Session Note"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Client *</Label>
              <Select value={form.client_id} onValueChange={handleClientSelect}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{visibleClients.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date *</Label><Input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} /></div>
            <div>
              <Label>Service Type</Label>
              <Select value={form.service_type} onValueChange={(v) => setForm({...form, service_type: v})}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{serviceTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Start Time</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({...form, start_time: e.target.value})} /></div>
            <div><Label>End Time</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({...form, end_time: e.target.value})} /></div>
            <div><Label>Staff Name</Label><Input value={form.staff_name} onChange={(e) => setForm({...form, staff_name: e.target.value})} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{noteStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Goals Addressed</Label><Textarea value={form.goals_addressed} onChange={(e) => setForm({...form, goals_addressed: e.target.value})} rows={2} /></div>
            <div className="col-span-2"><Label>Activities</Label><Textarea value={form.activities} onChange={(e) => setForm({...form, activities: e.target.value})} rows={2} /></div>
            <div className="col-span-2"><Label>Behavior Notes</Label><Textarea value={form.behavior_notes} onChange={(e) => setForm({...form, behavior_notes: e.target.value})} rows={2} /></div>
            <div className="col-span-2"><Label>Progress Notes</Label><Textarea value={form.progress_notes} onChange={(e) => setForm({...form, progress_notes: e.target.value})} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.client_id || !form.date}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}