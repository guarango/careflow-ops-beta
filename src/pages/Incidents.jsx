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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Plus, Search } from "lucide-react";

const types = ["Behavioral", "Medical", "Fall", "Elopement", "Property Damage", "Medication Error", "Injury", "Other"];
const severities = ["Low", "Medium", "High", "Critical"];
const incidentStatuses = ["Open", "Under Review", "Resolved", "Closed"];

const emptyIncident = { client_id: "", client_name: "", reported_by_name: "", date: "", time: "", type: "", severity: "", description: "", actions_taken: "", witnesses: "", follow_up_required: false, follow_up_notes: "", status: "Open" };

export default function Incidents() {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyIncident);
  const [search, setSearch] = useState("");

  const queryClient = useQueryClient();
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => base44.entities.IncidentReport.list("-created_date"),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.IncidentReport.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["incidents"] }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.IncidentReport.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["incidents"] }); closeDialog(); },
  });

  const closeDialog = () => { setShowDialog(false); setEditing(null); setForm(emptyIncident); };
  const openNew = () => { setForm(emptyIncident); setEditing(null); setShowDialog(true); };
  const openEdit = (i) => { setForm(i); setEditing(i); setShowDialog(true); };

  const handleSave = () => {
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setForm({ ...form, client_id: clientId, client_name: client ? `${client.first_name} ${client.last_name}` : "" });
  };

  const filtered = incidents.filter(i =>
    `${i.client_name} ${i.type} ${i.severity} ${i.status}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Incident Reports" subtitle={`${incidents.length} reports`} action={<Button onClick={openNew} className="bg-destructive hover:bg-destructive/90"><Plus className="w-4 h-4 mr-2" />Report Incident</Button>} />

      <Card className="mb-6">
        <CardContent className="py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search incidents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 border-0 bg-transparent focus-visible:ring-0" />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={AlertTriangle} title="No incidents" description="No incident reports have been filed." action={<Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" />Report Incident</Button>} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((i) => (
                  <TableRow key={i.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(i)}>
                    <TableCell className="font-medium">{i.client_name || "—"}</TableCell>
                    <TableCell className="text-sm">{i.type}</TableCell>
                    <TableCell><StatusBadge status={i.severity} /></TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{i.date}</TableCell>
                    <TableCell><StatusBadge status={i.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Incident Report" : "Report Incident"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Client *</Label>
              <Select value={form.client_id} onValueChange={handleClientSelect}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date *</Label><Input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} /></div>
            <div><Label>Time</Label><Input type="time" value={form.time} onChange={(e) => setForm({...form, time: e.target.value})} /></div>
            <div>
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity *</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({...form, severity: v})}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{severities.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Description *</Label><Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={3} /></div>
            <div className="col-span-2"><Label>Actions Taken</Label><Textarea value={form.actions_taken} onChange={(e) => setForm({...form, actions_taken: e.target.value})} rows={2} /></div>
            <div><Label>Reported By</Label><Input value={form.reported_by_name} onChange={(e) => setForm({...form, reported_by_name: e.target.value})} /></div>
            <div><Label>Witnesses</Label><Input value={form.witnesses} onChange={(e) => setForm({...form, witnesses: e.target.value})} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{incidentStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox checked={form.follow_up_required} onCheckedChange={(v) => setForm({...form, follow_up_required: v})} />
              <Label>Follow-up Required</Label>
            </div>
            {form.follow_up_required && (
              <div className="col-span-2"><Label>Follow-up Notes</Label><Textarea value={form.follow_up_notes} onChange={(e) => setForm({...form, follow_up_notes: e.target.value})} rows={2} /></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.client_id || !form.date || !form.type || !form.severity || !form.description}>{editing ? "Update" : "Submit"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}