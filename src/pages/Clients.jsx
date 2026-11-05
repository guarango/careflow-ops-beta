import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { Heart, Plus, Search, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAssignedClients } from "@/hooks/useAssignedClients";
import { useRole } from "@/hooks/useRole";
import { useViewMode } from "@/hooks/useViewMode";
import NoDSPClientsState from "@/components/shared/NoDSPClientsState";
import AssignedStaffSection from "@/components/clients/AssignedStaffSection";
import EntityCard from "@/components/shared/EntityCard";
import ViewToggle from "@/components/shared/ViewToggle";

const genders = ["Male", "Female", "Non-binary", "Other"];
const clientStatuses = ["Active", "Inactive", "Discharged"];

const emptyClient = {
  first_name: "", middle_initial: "", last_name: "", date_of_birth: "", gender: "",
  diagnosis: "", guardian_name: "", guardian_phone: "", address: "",
  address_city: "", address_state: "UT", address_zip: "",
  medicaid_id: "", insurance_id: "", insurance_provider: "",
  house_id: "",
  service_enrollments: [],
  status: "Active", notes: ""
};

export default function Clients() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { can } = useRole();
  const { isDSPMode, assignedClientIds } = useAssignedClients();
  const canEditClients = can("editClients");
  const canCreateClient = can("createClient");
  const canDeleteClient = can("deleteClient");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyClient);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useViewMode("clients");

  const queryClient = useQueryClient();
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: serviceCodes = [] } = useQuery({
    queryKey: ["service-codes"],
    queryFn: () => base44.entities.ServiceCode.list(),
  });

  const { data: houses = [] } = useQuery({
    queryKey: ["houses"],
    queryFn: () => base44.entities.House.list(),
  });

  const syncHouse = (houseId) => {
    if (houseId) base44.functions.invoke("syncStaffAssignments", { house_id: houseId }).catch(() => {});
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      syncHouse(client.house_id);
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      syncHouse(client.house_id);
      if (editing?.house_id && editing.house_id !== client.house_id) {
        syncHouse(editing.house_id);
      }
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setConfirmDelete(null);
      closeDialog();
    },
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

  // DSP mode: only show assigned clients
  const visibleClients = isDSPMode
    ? clients.filter(c => assignedClientIds.includes(c.id))
    : clients;

  const filtered = visibleClients.filter(c =>
    `${c.first_name} ${c.last_name} ${c.diagnosis}`.toLowerCase().includes(search.toLowerCase())
  );

  // Edit is reached from the client profile: /clients?edit=<id>
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || clients.length === 0) return;
    const target = clients.find((c) => c.id === editId);
    if (target) openEdit(target);
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, clients]);

  const getServiceSummary = (c) => {
    const enrollments = c.service_enrollments || [];
    // also handle legacy flat field
    if (enrollments.length === 0 && c.service_type) return c.service_type;
    if (enrollments.length === 0) return "—";
    if (enrollments.length === 1) return enrollments[0].service_type || "—";
    return `${enrollments.length} services`;
  };

  if (isDSPMode && assignedClientIds.length === 0) return <NoDSPClientsState />;

  return (
    <div>
      <PageHeader title="Client Records" subtitle={`${visibleClients.length} clients`} action={canCreateClient && <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add Client</Button>} />

      <Card className="mb-6">
        <CardContent className="py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 border-0 bg-transparent focus-visible:ring-0" />
            </div>
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={Heart} title="No clients" description={isDSPMode ? "No assigned clients match your search." : "Add your first client to get started."} action={canCreateClient && <Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" />Add Client</Button>} />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((c) => {
            const initials = `${c.first_name?.[0] || ""}${c.last_name?.[0] || ""}`.toUpperCase();
            const colors = ["bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700", "bg-green-100 text-green-700", "bg-pink-100 text-pink-700", "bg-amber-100 text-amber-700", "bg-cyan-100 text-cyan-700", "bg-rose-100 text-rose-700"];
            const color = colors[(c.first_name?.charCodeAt(0) || 0) % colors.length];
            const service = getServiceSummary(c);
            return (
              <EntityCard
                key={c.id}
                onClick={() => navigate(`/clients/${c.id}`)}
                initials={initials}
                photoUrl={c.photo_url}
                colorClass={color}
                title={`${c.first_name} ${c.last_name}`}
                subtitle={service === "—" ? "No services" : service}
                badge={service !== "—" && (
                  <Badge variant="outline" className="max-w-full truncate text-[10px]">{service}</Badge>
                )}
                footer={<StatusBadge status={c.status || "Active"} />}
              />
            );
          })}
        </div>
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
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/clients/${c.id}`)}>
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
          <DialogHeader><DialogTitle>{!canEditClients ? "View Client" : editing ? "Edit Client" : "Add Client"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>First Name *</Label><Input value={form.first_name} onChange={(e) => setForm({...form, first_name: e.target.value})} disabled={!canEditClients} /></div>
              <div><Label>Last Name *</Label><Input value={form.last_name} onChange={(e) => setForm({...form, last_name: e.target.value})} disabled={!canEditClients} /></div>
              <div><Label>Middle Initial</Label><Input maxLength={1} value={form.middle_initial || ""} onChange={(e) => setForm({...form, middle_initial: e.target.value})} disabled={!canEditClients} /></div>
              <div><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={(e) => setForm({...form, date_of_birth: e.target.value})} disabled={!canEditClients} /></div>
              <div>
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({...form, gender: v})} disabled={!canEditClients}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{genders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Diagnosis</Label><Input value={form.diagnosis} onChange={(e) => setForm({...form, diagnosis: e.target.value})} disabled={!canEditClients} /></div>
              <div><Label>Guardian Name</Label><Input value={form.guardian_name} onChange={(e) => setForm({...form, guardian_name: e.target.value})} disabled={!canEditClients} /></div>
              <div><Label>Guardian Phone</Label><Input value={form.guardian_phone} onChange={(e) => setForm({...form, guardian_phone: e.target.value})} disabled={!canEditClients} /></div>
              <div className="col-span-2"><Label>Street Address</Label><Input value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} disabled={!canEditClients} /></div>
              <div><Label>City</Label><Input value={form.address_city || ""} onChange={(e) => setForm({...form, address_city: e.target.value})} disabled={!canEditClients} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>State</Label><Input maxLength={2} value={form.address_state || ""} onChange={(e) => setForm({...form, address_state: e.target.value.toUpperCase()})} disabled={!canEditClients} /></div>
                <div><Label>Zip</Label><Input value={form.address_zip || ""} onChange={(e) => setForm({...form, address_zip: e.target.value})} disabled={!canEditClients} /></div>
              </div>
              <div>
                <Label>House / Location</Label>
                <Select value={form.house_id || ""} onValueChange={(v) => setForm({...form, house_id: v})} disabled={!canEditClients}>
                  <SelectTrigger><SelectValue placeholder="Select house" /></SelectTrigger>
                  <SelectContent>
                    {houses.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Insurance Provider</Label><Input value={form.insurance_provider} onChange={(e) => setForm({...form, insurance_provider: e.target.value})} disabled={!canEditClients} /></div>
              <div><Label>Insurance ID</Label><Input value={form.insurance_id} onChange={(e) => setForm({...form, insurance_id: e.target.value})} disabled={!canEditClients} /></div>
              <div>
                <Label>Medicaid Member ID</Label>
                <Input
                  value={form.medicaid_id || ""}
                  onChange={(e) => setForm({...form, medicaid_id: e.target.value})}
                  placeholder="e.g. 000123456"
                  disabled={!canEditClients}
                />
                <p className="text-[11px] text-muted-foreground mt-1">Required for Utah EVV and Medicaid billing. Keep leading zeros.</p>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})} disabled={!canEditClients}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{clientStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {canEditClients && (
              <div className="border-t pt-4">
                <ServiceEnrollments
                  enrollments={form.service_enrollments || []}
                  onChange={(enrollments) => setForm({...form, service_enrollments: enrollments})}
                  serviceCodes={serviceCodes}
                />
              </div>
            )}

            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={3} disabled={!canEditClients} /></div>

            {editing && canEditClients && (
              <div className="border-t pt-4">
                <AssignedStaffSection clientId={editing.id} canAssign={can("editStaffDirectory")} />
              </div>
            )}
          </div>
          <DialogFooter>
            {editing && canDeleteClient && (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive sm:mr-auto"
                onClick={() => setConfirmDelete(editing)}
              >
                <Trash2 className="w-4 h-4 mr-2" />Delete Client
              </Button>
            )}
            <Button variant="outline" onClick={closeDialog}>{canEditClients ? "Cancel" : "Close"}</Button>
            {canEditClients && <Button onClick={handleSave} disabled={!form.first_name || !form.last_name}>{editing ? "Update" : "Create"}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this client record?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.first_name} {confirmDelete?.last_name} will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate(confirmDelete.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}