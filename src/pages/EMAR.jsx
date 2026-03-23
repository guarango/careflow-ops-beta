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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pill, Plus, Search } from "lucide-react";
import { useAssignedClients } from "@/hooks/useAssignedClients";
import NoDSPClientsState from "@/components/shared/NoDSPClientsState";

const routes = ["Oral", "Topical", "Injection", "Inhaled", "Sublingual", "Other"];
const frequencies = ["Once daily", "Twice daily", "Three times daily", "Four times daily", "As needed", "Weekly", "Other"];
const medStatuses = ["Active", "Discontinued", "On Hold"];
const logStatuses = ["Administered", "Refused", "Held", "Not Available", "Missed"];

const emptyMed = { client_id: "", client_name: "", medication_name: "", dosage: "", route: "", frequency: "", prescriber: "", pharmacy: "", start_date: "", instructions: "", status: "Active" };
const emptyLog = { medication_id: "", client_id: "", client_name: "", medication_name: "", administered_by_name: "", date: "", time: "", status: "Administered", notes: "" };

export default function EMAR() {
  const { isDSPMode, assignedClientIds } = useAssignedClients();
  const [tab, setTab] = useState("medications");
  const [showMedDialog, setShowMedDialog] = useState(false);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [medForm, setMedForm] = useState(emptyMed);
  const [logForm, setLogForm] = useState(emptyLog);
  const [search, setSearch] = useState("");

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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["medications"] }); setShowMedDialog(false); setMedForm(emptyMed); setEditingMed(null); },
  });

  const updateMedMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Medication.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["medications"] }); setShowMedDialog(false); setMedForm(emptyMed); setEditingMed(null); },
  });

  const createLogMutation = useMutation({
    mutationFn: (data) => base44.entities.MedicationLog.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["med-logs"] }); setShowLogDialog(false); setLogForm(emptyLog); },
  });

  const handleMedClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setMedForm({ ...medForm, client_id: clientId, client_name: client ? `${client.first_name} ${client.last_name}` : "" });
  };

  const openLogForMed = (med) => {
    setLogForm({ ...emptyLog, medication_id: med.id, client_id: med.client_id, client_name: med.client_name, medication_name: med.medication_name, date: new Date().toISOString().split("T")[0] });
    setShowLogDialog(true);
  };

  const visibleClients = isDSPMode ? clients.filter(c => assignedClientIds.includes(c.id)) : clients;
  const visibleMeds = isDSPMode ? medications.filter(m => assignedClientIds.includes(m.client_id)) : medications;
  const visibleLogs = isDSPMode ? logs.filter(l => assignedClientIds.includes(l.client_id)) : logs;

  const filteredMeds = visibleMeds.filter(m =>
    `${m.client_name} ${m.medication_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const filteredLogs = visibleLogs.filter(l =>
    `${l.client_name} ${l.medication_name}`.toLowerCase().includes(search.toLowerCase())
  );

  if (isDSPMode && assignedClientIds.length === 0) return <NoDSPClientsState />;

  return (
    <div>
      <PageHeader title="eMAR" subtitle="Electronic Medication Administration Record" />

      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="medications">Medications</TabsTrigger>
            <TabsTrigger value="logs">Administration Log</TabsTrigger>
          </TabsList>
          <Button onClick={() => tab === "medications" ? (setMedForm(emptyMed), setEditingMed(null), setShowMedDialog(true)) : setShowLogDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />{tab === "medications" ? "Add Medication" : "Log Administration"}
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 border-0 bg-transparent focus-visible:ring-0" />
            </div>
          </CardContent>
        </Card>

        <TabsContent value="medications">
          {filteredMeds.length === 0 ? (
            <EmptyState icon={Pill} title="No medications" description="Add medications for your clients." />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Medication</TableHead>
                      <TableHead>Dosage</TableHead>
                      <TableHead className="hidden md:table-cell">Frequency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMeds.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.client_name || "—"}</TableCell>
                        <TableCell>{m.medication_name}</TableCell>
                        <TableCell className="text-sm">{m.dosage}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{m.frequency}</TableCell>
                        <TableCell><StatusBadge status={m.status || "Active"} /></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setMedForm(m); setEditingMed(m); setShowMedDialog(true); }}>Edit</Button>
                            {m.status === "Active" && (
                              <Button variant="outline" size="sm" onClick={() => openLogForMed(m)}>Administer</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

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
                    {filteredLogs.map((l) => (
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
      <Dialog open={showMedDialog} onOpenChange={setShowMedDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingMed ? "Edit Medication" : "Add Medication"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Client *</Label>
              <Select value={medForm.client_id} onValueChange={handleMedClientSelect}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{visibleClients.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Medication Name *</Label><Input value={medForm.medication_name} onChange={(e) => setMedForm({...medForm, medication_name: e.target.value})} /></div>
            <div><Label>Dosage *</Label><Input value={medForm.dosage} onChange={(e) => setMedForm({...medForm, dosage: e.target.value})} /></div>
            <div>
              <Label>Route</Label>
              <Select value={medForm.route} onValueChange={(v) => setMedForm({...medForm, route: v})}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{routes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frequency *</Label>
              <Select value={medForm.frequency} onValueChange={(v) => setMedForm({...medForm, frequency: v})}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{frequencies.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Prescriber</Label><Input value={medForm.prescriber} onChange={(e) => setMedForm({...medForm, prescriber: e.target.value})} /></div>
            <div><Label>Pharmacy</Label><Input value={medForm.pharmacy} onChange={(e) => setMedForm({...medForm, pharmacy: e.target.value})} /></div>
            <div><Label>Start Date</Label><Input type="date" value={medForm.start_date} onChange={(e) => setMedForm({...medForm, start_date: e.target.value})} /></div>
            <div>
              <Label>Status</Label>
              <Select value={medForm.status} onValueChange={(v) => setMedForm({...medForm, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{medStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Instructions</Label><Textarea value={medForm.instructions} onChange={(e) => setMedForm({...medForm, instructions: e.target.value})} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowMedDialog(false); setEditingMed(null); }}>Cancel</Button>
            <Button onClick={() => editingMed ? updateMedMutation.mutate({ id: editingMed.id, data: medForm }) : createMedMutation.mutate(medForm)} disabled={!medForm.client_id || !medForm.medication_name || !medForm.dosage || !medForm.frequency}>{editingMed ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Administration Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Log Medication Administration</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Medication</Label>
              <Select value={logForm.medication_id} onValueChange={(v) => {
                const med = medications.find(m => m.id === v);
                setLogForm({ ...logForm, medication_id: v, client_id: med?.client_id, client_name: med?.client_name, medication_name: med?.medication_name });
              }}>
                <SelectTrigger><SelectValue placeholder="Select medication" /></SelectTrigger>
                <SelectContent>{visibleMeds.filter(m => m.status === "Active").map(m => <SelectItem key={m.id} value={m.id}>{m.client_name} — {m.medication_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Date *</Label><Input type="date" value={logForm.date} onChange={(e) => setLogForm({...logForm, date: e.target.value})} /></div>
              <div><Label>Time</Label><Input type="time" value={logForm.time} onChange={(e) => setLogForm({...logForm, time: e.target.value})} /></div>
            </div>
            <div><Label>Administered By</Label><Input value={logForm.administered_by_name} onChange={(e) => setLogForm({...logForm, administered_by_name: e.target.value})} /></div>
            <div>
              <Label>Status *</Label>
              <Select value={logForm.status} onValueChange={(v) => setLogForm({...logForm, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{logStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={logForm.notes} onChange={(e) => setLogForm({...logForm, notes: e.target.value})} rows={2} /></div>
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