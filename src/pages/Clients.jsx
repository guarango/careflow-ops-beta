import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import ServiceEnrollments from "@/components/clients/ServiceEnrollments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Heart, Plus, Search } from "lucide-react";

const genders = ["Male", "Female", "Non-binary", "Other"];
const clientStatuses = ["Active", "Inactive", "Discharged"];

const emptyClient = {
  first_name: "", last_name: "", date_of_birth: "", gender: "",
  diagnosis: "", guardian_name: "", guardian_phone: "", address: "",
  insurance_id: "", insurance_provider: "",
  service_enrollments: [],
  status: "Active", notes: ""
};

export default function Clients() {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyClient);
  const [search, setSearch] = useState("");

  const queryClient = useQueryClient();
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: serviceCodes = [] } = useQuery({
    queryKey: ["service-codes"],
    queryFn: () => base44.entities.ServiceCode.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); closeDialog(); },
  });

  const closeDialog = () => { setShowDialog(false); setEditing(null); setForm(emptyClient); };
  const openNew = () => { setForm(emptyClient); setEditing(null); setShowDialog(true); };
  const openEdit = (c) => {
    // Migrate legacy clients that have flat service fields
    const migrated = { ...c };
    if (!migrated.service_enrollments || migrated.service_enrollments.length === 0) {
      if (c.service_type) {
        migrated.service_enrollments = [{
          service_type: c.service_type,
          service_code_id: c.service_code_id || "",
          service_code: c.service_code || "",
          rate: 0,
          rate_type: "Hourly",
          schedule_days: c.schedule_days || [],
          schedule_start_time: c.schedule_start_time || "",
          schedule_end_time: c.schedule_end_time || "",
        }];
      } else {
        migrated.service_enrollments = [];
      }
    }
    setForm(migrated);
    setEditing(c);
    setShowDialog(true);
  };

  const handleSave = () => {
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const filtered = clients.filter(c =>
    `${c.first_name} ${c.last_name} ${c.diagnosis}`.toLowerCase().includes(search.toLowerCase())
  );

  const getServiceSummary = (c) => {
    const enrollments = c.service_enrollments || [];
    // also handle legacy flat field
    if (enrollments.length === 0 && c.service_type) return c.service_type;
    if (enrollments.length === 0) return "—";
    if (enrollments.length === 1) return enrollments[0].service_type || "—";
    return `${enrollments.length} services`;
  };

  return (
    <div>
      <PageHeader title="Client Records" subtitle={`${clients.length} clients`} action={<Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add Client</Button>} />

      <Card className="mb-6">
        <CardContent className="py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 border-0 bg-transparent focus-visible:ring-0" />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={Heart} title="No clients" description="Add your first client to get started." action={<Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" />Add Client</Button>} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead className="hidden md:table-cell">DOB</TableHead>
                  <TableHead className="hidden md:table-cell">Guardian</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(c)}>
                    <TableCell className="font-medium">{c.first_name} {c.last_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(c.service_enrollments || []).length > 0
                          ? (c.service_enrollments || []).map((e, i) => (
                              <Badge key={i} variant="outline" className="text-[10px]">{e.service_type || "—"}</Badge>
                            ))
                          : <span className="text-sm text-muted-foreground">{getServiceSummary(c)}</span>
                        }
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{c.date_of_birth || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{c.guardian_name || "—"}</TableCell>
                    <TableCell><StatusBadge status={c.status || "Active"} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Client" : "Add Client"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>First Name *</Label><Input value={form.first_name} onChange={(e) => setForm({...form, first_name: e.target.value})} /></div>
              <div><Label>Last Name *</Label><Input value={form.last_name} onChange={(e) => setForm({...form, last_name: e.target.value})} /></div>
              <div><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={(e) => setForm({...form, date_of_birth: e.target.value})} /></div>
              <div>
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({...form, gender: v})}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{genders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Diagnosis</Label><Input value={form.diagnosis} onChange={(e) => setForm({...form, diagnosis: e.target.value})} /></div>
              <div><Label>Guardian Name</Label><Input value={form.guardian_name} onChange={(e) => setForm({...form, guardian_name: e.target.value})} /></div>
              <div><Label>Guardian Phone</Label><Input value={form.guardian_phone} onChange={(e) => setForm({...form, guardian_phone: e.target.value})} /></div>
              <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} /></div>
              <div><Label>Insurance Provider</Label><Input value={form.insurance_provider} onChange={(e) => setForm({...form, insurance_provider: e.target.value})} /></div>
              <div><Label>Insurance ID</Label><Input value={form.insurance_id} onChange={(e) => setForm({...form, insurance_id: e.target.value})} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{clientStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4">
              <ServiceEnrollments
                enrollments={form.service_enrollments || []}
                onChange={(enrollments) => setForm({...form, service_enrollments: enrollments})}
                serviceCodes={serviceCodes}
              />
            </div>

            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.first_name || !form.last_name}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}