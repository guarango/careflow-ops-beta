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
import { Pill, Plus, Search, LayoutGrid, List, ArrowLeft } from "lucide-react";
import { useAssignedClients } from "@/hooks/useAssignedClients";
import NoDSPClientsState from "@/components/shared/NoDSPClientsState";
import { useRole } from "@/hooks/useRole";
import ClientGridCard from "@/components/emar/ClientGridCard";
import MedScheduleSection from "@/components/emar/MedScheduleSection";
import MedAutocomplete from "@/components/emar/MedAutocomplete";
import MARScheduledView from "@/components/emar/MARScheduledView";
import MARDetailView from "@/components/emar/MARDetailView";
import MARAdminSummary from "@/components/emar/MARAdminSummary";
import { cn } from "@/lib/utils";

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
  const canEdit = role === "admin" || role === "hr";

  const [tab, setTab] = useState("mar");       // "mar" | "medications" | "logs"
  const [viewMode, setViewMode] = useState("grid");
  const [selectedClient, setSelectedClient] = useState(null);
  const [marDetail, setMarDetail] = useState(null); // { client, time, meds, date }
  const [showMedDialog, setShowMedDialog] = useState(false);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [medForm, setMedForm] = useState(emptyMed);
  const [logForm, setLogForm] = useState(emptyLog);
  const [search, setSearch] = useState("");

  const queryClient = useQueryClient();

  const { data: medications = [] } = useQuery({ queryKey: ["medications"], queryFn: () => base44.entities.Medication.list() });
  const { data: logs = [] } = useQuery({ queryKey: ["med-logs"], queryFn: () => base44.entities.MedicationLog.list("-created_date") });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });

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
    setMedForm({ ...emptyMed, ...med, schedule_days: med.schedule_days || [...DAY_KEYS], scheduled_times: med.scheduled_times || [] });
    setEditingMed(med);
    setShowMedDialog(true);
  };

  const openLogForMed = (med) => {
    setLogForm({ ...emptyLog, medication_id: med.id, client_id: med.client_id, client_name: med.client_name, medication_name: med.medication_name, date: new Date().toISOString().split("T")[0] });
    setShowLogDialog(true);
  };

  const saveMed = () => {
    if (editingMed) updateMedMutation.mutate({ id: editingMed.id, data: medForm });
    else createMedMutation.mutate(medForm);
  };

  const visibleClients = isDSPMode ? clients.filter(c => assignedClientIds.includes(c.id)) : clients;
  const visibleMeds = isDSPMode ? medications.filter(m => assignedClientIds.includes(m.client_id)) : medications;
  const visibleLogs = isDSPMode ? logs.filter(l => assignedClientIds.includes(l.client_id)) : logs;

  const searchLower = search.toLowerCase();
  const filteredClients = visibleClients.filter(c => {
    const name = `${c.first_name} ${c.last_name}`.toLowerCase();
    if (name.includes(searchLower)) return true;
    return visibleMeds.filter(m => m.client_id === c.id).some(m => m.medication_name.toLowerCase().includes(searchLower));
  });
  const filteredLogs = visibleLogs.filter(l => `${l.client_name} ${l.medication_name}`.toLowerCase().includes(searchLower));

  if (isDSPMode && assignedClientIds.length === 0) return <NoDSPClientsState />;

  const currentClient = selectedClient ? clients.find(c => c.id === selectedClient.id) || selectedClient : null;
  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      <PageHeader
        title="eMAR"
        subtitle="Electronic Medication Administration Record"
        action={
          canEdit && !marDetail && !selectedClient && tab === "mar" ? (
            <Button size="sm" onClick={() => setShowMedDialog(true)}>
              <Plus className="w-4 h-4 mr-1.5" />Add Medication
            </Button>
          ) : null
        }
      />

      <Tabs value={tab} onValueChange={(v) => { setTab(v); setSelectedClient(null); setMarDetail(null); }}>
        <TabsList className="mb-4">
          <TabsTrigger value="mar">Scheduled MAR</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="summary">Administration Summary</TabsTrigger>
          <TabsTrigger value="logs">Administration Log</TabsTrigger>
        </TabsList>

        {/* ── SCHEDULED MAR TAB ─────────────────────────────── */}
        <TabsContent value="mar">
          {marDetail ? (
            <MARDetailView
              client={marDetail.client}
              time={marDetail.time}
              meds={marDetail.meds}
              date={marDetail.date}
              allMeds={visibleMeds}
              logs={visibleLogs}
              onBack={() => setMarDetail(null)}
              onSave={() => setMarDetail(null)}
            />
          ) : (
            <MARScheduledView
              clients={visibleClients}
              medications={visibleMeds}
              logs={visibleLogs}
              date={today}
              onOpenDetail={setMarDetail}
            />
          )}
        </TabsContent>

        {/* ── MEDICATIONS TAB ───────────────────────────────── */}
        <TabsContent value="medications">
          {!selectedClient && (
            <Card className="mb-4">
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search clients or medications..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 border-0 bg-transparent focus-visible:ring-0" />
                  </div>
                  <div className="flex items-center gap-1 border border-border rounded-md p-0.5 flex-shrink-0">
                    <button type="button" onClick={() => setViewMode("grid")} className={cn("p-1.5 rounded transition-colors", viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}><LayoutGrid className="w-4 h-4" /></button>
                    <button type="button" onClick={() => setViewMode("list")} className={cn("p-1.5 rounded transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}><List className="w-4 h-4" /></button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedClient ? (
            <div>
              <button type="button" onClick={() => setSelectedClient(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to all clients
              </button>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{currentClient.first_name} {currentClient.last_name}</h2>
                {canEdit && <Button size="sm" onClick={() => openAddForClient(currentClient)}><Plus className="w-4 h-4 mr-1.5" />Add Medication</Button>}
              </div>
              {visibleMeds.filter(m => m.client_id === currentClient.id).length === 0 ? (
                <div className="border border-dashed border-border rounded-xl py-12 text-center text-muted-foreground text-sm">
                  No medications on file.
                  {canEdit && <button type="button" onClick={() => openAddForClient(currentClient)} className="ml-2 text-primary hover:underline">+ Add one</button>}
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Medication</TableHead>
                        <TableHead>Dosage</TableHead>
                        <TableHead className="hidden sm:table-cell">Frequency</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleMeds.filter(m => m.client_id === currentClient.id).map(med => (
                        <TableRow key={med.id} className={cn(med.status !== "Active" && "opacity-60")}>
                          <TableCell className="font-medium text-sm">
                            {med.medication_name}
                            {med.is_controlled && <span className="ml-2 text-[10px] font-bold text-red-600 bg-red-100 px-1 rounded">C2</span>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{med.dosage}</TableCell>
                          <TableCell className="text-sm hidden sm:table-cell">{med.frequency}</TableCell>
                          <TableCell><StatusBadge status={med.status || "Active"} /></TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              {med.status === "Active" && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openLogForMed(med)}>Administer</Button>}
                              {canEdit && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(med)}>Edit</Button>}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ) : filteredClients.length === 0 ? (
            <EmptyState icon={Pill} title="No clients found" description="No clients match your search." />
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map(client => (
                <ClientGridCard key={client.id} client={client} medications={visibleMeds.filter(m => m.client_id === client.id)} logs={visibleLogs} onClick={() => setSelectedClient(client)} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClients.map(client => (
                <div key={client.id} className="border border-border rounded-xl p-4 bg-card cursor-pointer hover:bg-muted/40" onClick={() => setSelectedClient(client)}>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{client.first_name} {client.last_name}</p>
                    <span className="text-xs text-muted-foreground">{visibleMeds.filter(m => m.client_id === client.id && m.status === "Active").length} active meds</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── ADMINISTRATION SUMMARY TAB ────────────────────── */}
        <TabsContent value="summary">
          <MARAdminSummary
            clients={visibleClients}
            medications={visibleMeds}
            logs={visibleLogs}
          />
        </TabsContent>

        {/* ── LOGS TAB ──────────────────────────────────────── */}
        <TabsContent value="logs">
          <Card className="mb-4">
            <CardContent className="py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 border-0 bg-transparent focus-visible:ring-0" />
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setShowLogDialog(true)}><Plus className="w-4 h-4 mr-1.5" />Log Administration</Button>
          </div>
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
            <DialogHeader><DialogTitle>{editingMed ? "Edit Medication" : "Add Medication"}</DialogTitle></DialogHeader>
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
                  <MedAutocomplete value={medForm.medication_name} onChange={v => setMedForm(f => ({ ...f, medication_name: v }))} />
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
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="is_controlled" checked={!!medForm.is_controlled} onChange={e => setMedForm(f => ({ ...f, is_controlled: e.target.checked }))} className="w-4 h-4 accent-red-500" />
                  <Label htmlFor="is_controlled" className="text-sm cursor-pointer">Controlled Substance (C2)</Label>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="is_prn" checked={!!medForm.is_prn} onChange={e => setMedForm(f => ({ ...f, is_prn: e.target.checked }))} className="w-4 h-4 accent-amber-500" />
                  <Label htmlFor="is_prn" className="text-sm cursor-pointer">PRN (As Needed)</Label>
                </div>
              </div>
              <div>
                <Label>Instructions</Label>
                <Textarea value={medForm.instructions || ""} onChange={e => setMedForm(f => ({ ...f, instructions: e.target.value }))} rows={2} />
              </div>
              <div>
                <Label>Diagnosis</Label>
                <Input value={medForm.diagnosis || ""} onChange={e => setMedForm(f => ({ ...f, diagnosis: e.target.value }))} />
              </div>
              <MedScheduleSection form={medForm} setForm={setMedForm} />
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={closeMedDialog}>Cancel</Button>
              <Button onClick={saveMed} disabled={!medForm.client_id || !medForm.medication_name || !medForm.dosage || !medForm.frequency}>
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