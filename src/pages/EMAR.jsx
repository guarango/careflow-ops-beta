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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pill, Plus, Search, ChevronsUpDown } from "lucide-react";
import { useAssignedClients } from "@/hooks/useAssignedClients";
import NoDSPClientsState from "@/components/shared/NoDSPClientsState";
import { useRole } from "@/hooks/useRole";
import ClientMedCard from "@/components/emar/ClientMedCard";
import MedScheduleSection from "@/components/emar/MedScheduleSection";
import MedAutocomplete from "@/components/emar/MedAutocomplete";

const routes = ["Oral", "Topical", "Injection", "Inhaled", "Sublingual", "Other"];
const medStatuses = ["Active", "Discontinued", "On Hold"];
const logStatuses = ["Administered", "Refused", "Held", "Not Available", "Missed"];
const DAY_KEYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const emptyMed = {
  client_id: "", client_name: "", medication_name: "", dosage: "", route: "",
  frequency: "", prescriber: "", pharmacy: "", start_date: "", end_date: "",
  instructions: "", status: "Active", scheduled_times: [], schedule_days: [...DAY_KEYS],
};
const emptyLog = {
  medication_id: "", client_id: "", client_name: "", medication_name: "",
  administered_by_name: "", date: "", time: "", status: "Administered", notes: "",
};

export default function EMAR() {
  const { isDSPMode, assignedClientIds } = useAssignedClients();
  const { role } = useRole();
  const canEdit = role === "admin" || role === "nurse";

  const [tab, setTab] = useState("medications");
  const [showMedDialog, setShowMedDialog] = useState(false);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [medForm, setMedForm] = useState(emptyMed);
  const [logForm, setLogForm] = useState(emptyLog);
  const [search, setSearch] = useState("");
  const [allExpanded, setAllExpanded] = useState(true);
  const [expandKey, setExpandKey] = useState(0); // force re-render on toggle all

  const queryClient = useQueryClient();

  const { data: medications = [] } = useQuery({
    queryKey: ["medications"],
    queryFn: () => base44.entities.Medication.list(),
  });
  const { data: logs = [] } = useQuery({
    queryKey: ["med-logs"],
    queryFn: () => base44.entities.MedicationLog.list("-created_date"),
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const createMedMutation = useMutation({
    mutationFn: (data) => base44.entities.Medication.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["medications"] }); closeMedDialog(); },
  });
  const updateMedMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Medication.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["medications"] }); closeMedDialog(); },
  });
  const createLogMutation = useMutation({
    mutationFn: (data) => base44.entities.MedicationLog.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["med-logs"] }); setShowLogDialog(false); setLogForm(emptyLog); },
  });

  const closeMedDialog = () => { setShowMedDialog(false); setEditingMed(null); setMedForm(emptyMed); };

  const openAddForClient = (client) => {
    setMedForm({ ...emptyMed, client_id: client.id, client_name: `${client.first_name} ${client.last_name}` });
    setEditingMed(null);
    setShowMedDialog(true);
  };

  const openEdit = (med) => {
    setMedForm({
      ...emptyMed,
      ...med,
      schedule_days: med.schedule_days || [...DAY_KEYS],
      scheduled_times: med.scheduled_times || [],
    });
    setEditingMed(med);
    setShowMedDialog(true);
  };

  const openLogForMed = (med) => {
    setLogForm({ ...emptyLog, medication_id: med.id, client_id: med.client_id, client_name: med.client_name, medication_name: med.medication_name, date: new Date().toISOString().split("T")[0] });
    setShowLogDialog(true);
  };

  const saveMed = () => {
    if (editingMed) {
      updateMedMutation.mutate({ id: editingMed.id, data: medForm });
    } else {
      createMedMutation.mutate(medForm);
    }
  };

  // Role-filtered clients and meds
  const visibleClients = isDSPMode ? clients.filter(c => assignedClientIds.includes(c.id)) : clients;
  const visibleMeds = isDSPMode ? medications.filter(m => assignedClientIds.includes(m.client_id)) : medications;
  const visibleLogs = isDSPMode ? logs.filter(l => assignedClientIds.includes(l.client_id)) : logs;

  // Search filter across clients + meds
  const searchLower = search.toLowerCase();
  const filteredClients = visibleClients.filter(c => {
    const name = `${c.first_name} ${c.last_name}`.toLowerCase();
    if (name.includes(searchLower)) return true;
    const clientMeds = visibleMeds.filter(m => m.client_id === c.id);
    return clientMeds.some(m => m.medication_name.toLowerCase().includes(searchLower));
  });

  const filteredLogs = visibleLogs.filter(l =>
    `${l.client_name} ${l.medication_name}`.toLowerCase().includes(searchLower)
  );

  const toggleAll = () => {
    setAllExpanded(v => !v);
    setExpandKey(k => k + 1);
  };

  if (isDSPMode && assignedClientIds.length === 0) return <NoDSPClientsState />;

  return (
    <div>
      <PageHeader
        title="eMAR"
        subtitle="Electronic Medication Administration Record"
        action={
          !isDSPMode && canEdit && tab === "medications" ? (
            <Button onClick={() => { setMedForm(emptyMed); setEditingMed(null); setShowMedDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />Add Medication
            </Button>
          ) : tab === "logs" ? (
            <Button onClick={() => setShowLogDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />Log Administration
            </Button>
          ) : null
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="medications">Medications</TabsTrigger>
            <TabsTrigger value="logs">Administration Log</TabsTrigger>
          </TabsList>
        </div>

        {/* Search Bar */}
        <Card className="mb-4">
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={tab === "medications" ? "Search clients or medications..." : "Search logs..."}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 border-0 bg-transparent focus-visible:ring-0"
                />
              </div>
              {tab === "medications" && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                >
                  <ChevronsUpDown className="w-3.5 h-3.5" />
                  {allExpanded ? "Collapse All" : "Expand All"}
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* MEDICATIONS TAB */}
        <TabsContent value="medications">
          {filteredClients.length === 0 ? (
            <EmptyState icon={Pill} title="No clients found" description="No clients match your search." />
          ) : (
            <div className="space-y-3">
              {filteredClients.map(client => {
                const clientMeds = visibleMeds.filter(m => m.client_id === client.id);
                return (
                  <ClientMedCard
                    key={`${client.id}-${expandKey}`}
                    client={client}
                    medications={clientMeds}
                    canEdit={canEdit}
                    onAdd={openAddForClient}
                    onEdit={openEdit}
                    onAdminister={openLogForMed}
                    defaultOpen={allExpanded}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* LOGS TAB */}
        <TabsContent value="logs">
          {filteredLogs.length === 0 ? (
            <EmptyState icon={Pill} title="No logs" description="No medication administration logs yet." />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Medication</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map(l => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.client_name || "—"}</TableCell>
                        <TableCell>{l.medication_name}</TableCell>
                        <TableCell className="text-sm">{l.date}</TableCell>
                        <TableCell className="text-sm">{l.time || "—"}</TableCell>
                        <TableCell className="text-sm">{l.administered_by_name || "—"}</TableCell>
                        <TableCell><StatusBadge status={l.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Medication Dialog */}
      {canEdit && (
        <Dialog open={showMedDialog} onOpenChange={closeMedDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMed ? "Edit Medication" : "Add Medication"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Client *</Label>
                <Select value={medForm.client_id} onValueChange={v => {
                  const c = clients.find(cl => cl.id === v);
                  setMedForm(f => ({ ...f, client_id: v, client_name: c ? `${c.first_name} ${c.last_name}` : "" }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{visibleClients.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Medication Name *</Label>
                  <MedAutocomplete
                    value={medForm.medication_name}
                    onChange={v => setMedForm(f => ({ ...f, medication_name: v }))}
                  />
                </div>
                <div>
                  <Label>Dosage *</Label>
                  <Input value={medForm.dosage} onChange={e => setMedForm(f => ({ ...f, dosage: e.target.value }))} />
                </div>
                <div>
                  <Label>Route</Label>
                  <Select value={medForm.route} onValueChange={v => setMedForm(f => ({ ...f, route: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{routes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={medForm.status} onValueChange={v => setMedForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{medStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <MedScheduleSection form={medForm} setForm={setMedForm} />
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={closeMedDialog}>Cancel</Button>
              <Button
                onClick={saveMed}
                disabled={!medForm.client_id || !medForm.medication_name || !medForm.dosage || !medForm.frequency}
              >
                {editingMed ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Log Administration Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Log Medication Administration</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Medication</Label>
              <Select value={logForm.medication_id} onValueChange={v => {
                const med = medications.find(m => m.id === v);
                setLogForm(f => ({ ...f, medication_id: v, client_id: med?.client_id, client_name: med?.client_name, medication_name: med?.medication_name }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select medication" /></SelectTrigger>
                <SelectContent>
                  {visibleMeds.filter(m => m.status === "Active").map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.client_name} — {m.medication_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Date *</Label><Input type="date" value={logForm.date} onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div><Label>Time</Label><Input type="time" value={logForm.time} onChange={e => setLogForm(f => ({ ...f, time: e.target.value }))} /></div>
            </div>
            <div><Label>Administered By</Label><Input value={logForm.administered_by_name} onChange={e => setLogForm(f => ({ ...f, administered_by_name: e.target.value }))} /></div>
            <div>
              <Label>Status *</Label>
              <Select value={logForm.status} onValueChange={v => setLogForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{logStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogDialog(false)}>Cancel</Button>
            <Button onClick={() => createLogMutation.mutate(logForm)} disabled={!logForm.medication_id || !logForm.date}>Log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}