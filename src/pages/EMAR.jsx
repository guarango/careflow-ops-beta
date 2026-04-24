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
import { format } from "date-fns";
import ClientGridCard from "@/components/emar/ClientGridCard";
import MedTabContent from "@/components/emar/MedTabContent";
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
  administered_by: "", administered_by_name: "", date: "", time: "", status: "Administered", notes: "",
  signature_timestamp: "",
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
  const [logClientId, setLogClientId] = useState("");
  const [logSigChecked, setLogSigChecked] = useState(false);
  const [logSigTimestamp, setLogSigTimestamp] = useState("");
  const [search, setSearch] = useState("");

  const queryClient = useQueryClient();

  const { data: medications = [] } = useQuery({ queryKey: ["medications"], queryFn: () => base44.entities.Medication.list() });
  const { data: logs = [] } = useQuery({ queryKey: ["med-logs"], queryFn: () => base44.entities.MedicationLog.list("-created_date") });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });
  const { data: staffList = [] } = useQuery({ queryKey: ["staff"], queryFn: () => base44.entities.StaffMember.list() });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["med-logs"] });
      setShowLogDialog(false);
      setLogForm(emptyLog);
      setLogClientId("");
      setLogSigChecked(false);
      setLogSigTimestamp("");
    },
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
    // Per spec: do NOT pre-fill either field
    setLogForm({ ...emptyLog, date: new Date().toISOString().split("T")[0] });
    setLogClientId("");
    setLogSigChecked(false);
    setLogSigTimestamp("");
    setShowLogDialog(true);
  };

  const openLogDialog = () => {
    setLogForm({ ...emptyLog, date: new Date().toISOString().split("T")[0] });
    setLogClientId("");
    setLogSigChecked(false);
    setLogSigTimestamp("");
    setShowLogDialog(true);
  };

  const closeLogDialog = () => {
    setShowLogDialog(false);
    setLogForm(emptyLog);
    setLogClientId("");
    setLogSigChecked(false);
    setLogSigTimestamp("");
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
              <h2 className="text-xl font-bold mb-4">{currentClient.first_name} {currentClient.last_name}</h2>
              <MedTabContent
                client={currentClient}
                medications={visibleMeds.filter(m => m.client_id === currentClient.id)}
                canEdit={canEdit}
                onAdd={openAddForClient}
                onEdit={openEdit}
                onAdminister={openLogForMed}
              />
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
            <Button size="sm" onClick={openLogDialog}><Plus className="w-4 h-4 mr-1.5" />Log Administration</Button>
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
      <Dialog open={showLogDialog} onOpenChange={closeLogDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Log Medication Administration</DialogTitle></DialogHeader>
          <div className="space-y-4">

            {/* 1. Client */}
            <div>
              <Label>Client *</Label>
              <Select value={logClientId} onValueChange={v => {
                setLogClientId(v);
                const c = clients.find(cl => cl.id === v);
                setLogForm(f => ({ ...f, client_id: v, client_name: c ? `${c.first_name} ${c.last_name}` : "", medication_id: "", medication_name: "" }));
                // reset signature if client changes
                setLogSigChecked(false);
                setLogSigTimestamp("");
              }}>
                <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                <SelectContent>
                  {[...visibleClients.filter(c => c.status !== "Discharged")]
                    .sort((a, b) => a.last_name.localeCompare(b.last_name))
                    .map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Medication (dependent on client) */}
            <div>
              <Label>Medication *</Label>
              <Select
                value={logForm.medication_id}
                onValueChange={v => {
                  const med = medications.find(m => m.id === v);
                  setLogForm(f => ({ ...f, medication_id: v, medication_name: med?.medication_name || "" }));
                }}
                disabled={!logClientId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={logClientId ? "Select medication..." : "Select client first..."} />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const clientMeds = medications.filter(m => m.client_id === logClientId);
                    const active = clientMeds.filter(m => m.status === "Active");
                    const discontinued = clientMeds.filter(m => m.status === "Discontinued");
                    return (
                      <>
                        {active.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.medication_name} {m.dosage} — Active</SelectItem>
                        ))}
                        {discontinued.length > 0 && active.length > 0 && (
                          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-t border-border mt-1 pt-2">Discontinued</div>
                        )}
                        {discontinued.map(m => (
                          <SelectItem key={m.id} value={m.id} className="text-muted-foreground">{m.medication_name} {m.dosage} — Discontinued</SelectItem>
                        ))}
                      </>
                    );
                  })()}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Date *</Label><Input type="date" value={logForm.date} onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div><Label>Time</Label><Input type="time" value={logForm.time} onChange={e => setLogForm(f => ({ ...f, time: e.target.value }))} /></div>
            </div>

            {/* 4. Administered By — staff dropdown */}
            <div>
              <Label>Administered By *</Label>
              <Select value={logForm.administered_by} onValueChange={v => {
                const s = staffList.find(st => st.id === v);
                const name = s ? `${s.first_name} ${s.last_name}` : "";
                setLogForm(f => ({ ...f, administered_by: v, administered_by_name: name }));
                // reset signature when staff changes
                setLogSigChecked(false);
                setLogSigTimestamp("");
              }}>
                <SelectTrigger><SelectValue placeholder="Select staff..." /></SelectTrigger>
                <SelectContent>
                  {[...staffList.filter(s => s.status === "Active")]
                    .sort((a, b) => a.last_name.localeCompare(b.last_name))
                    .map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* 5. Signature confirmation */}
            <div className="bg-muted/40 border border-border rounded-lg p-3 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={logSigChecked}
                  disabled={!logForm.administered_by}
                  onChange={e => {
                    const checked = e.target.checked;
                    setLogSigChecked(checked);
                    if (checked && logForm.administered_by_name) {
                      const now = new Date();
                      const ts = `Confirmed by ${logForm.administered_by_name} on ${format(now, "MM/dd/yyyy")} at ${format(now, "h:mm aa")}`;
                      setLogSigTimestamp(ts);
                      setLogForm(f => ({ ...f, signature_timestamp: ts }));
                    } else {
                      setLogSigTimestamp("");
                      setLogForm(f => ({ ...f, signature_timestamp: "" }));
                    }
                  }}
                  className="w-4 h-4 accent-primary mt-0.5 cursor-pointer"
                />
                <span className="text-sm text-foreground leading-snug">
                  I confirm this medication was administered as recorded
                </span>
              </label>
              {logSigTimestamp && (
                <p className="text-[11px] text-muted-foreground pl-6">{logSigTimestamp}</p>
              )}
              {!logForm.administered_by && (
                <p className="text-[11px] text-muted-foreground pl-6">Select a staff member above to enable confirmation.</p>
              )}
            </div>

            {/* 6. Status */}
            <div>
              <Label>Status *</Label>
              <Select value={logForm.status} onValueChange={v => setLogForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{logStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* 7. Notes */}
            <div><Label>Notes</Label><Textarea value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeLogDialog}>Cancel</Button>
            <Button
              onClick={() => createLogMutation.mutate(logForm)}
              disabled={!logClientId || !logForm.medication_id || !logForm.date || !logForm.administered_by || !logSigChecked}
            >
              Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}