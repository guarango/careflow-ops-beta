import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DollarSign, Plus, Search, CheckCircle, Clock, FileText, ShieldCheck, AlertTriangle, Activity, Receipt, BarChart3 } from "lucide-react";
import ClaimsQueue from "@/components/billing/ClaimsQueue";
import RemittancePanel from "@/components/billing/RemittancePanel";
import AuthorizationManager from "@/components/billing/AuthorizationManager";
import DenialManagement from "@/components/billing/DenialManagement";
import RevenueCycleDashboard from "@/components/billing/RevenueCycleDashboard";
import EligibilityVerification from "@/components/billing/EligibilityVerification";

const serviceTypes = ["Residential", "Day Program", "Community Living", "Respite", "Supported Employment"];
const billStatuses = ["Pending", "Submitted", "Paid", "Denied", "Appealed"];
const emptyBill = { client_id: "", client_name: "", service_type: "", date: "", hours: 0, rate: 0, total_amount: 0, insurance_provider: "", claim_number: "", status: "Pending", notes: "" };

export default function Billing() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyBill);
  const [search, setSearch] = useState("");

  const queryClient = useQueryClient();
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["billing"],
    queryFn: () => base44.entities.BillingRecord.list("-created_date"),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BillingRecord.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["billing"] }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BillingRecord.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["billing"] }); closeDialog(); },
  });

  const closeDialog = () => { setShowDialog(false); setEditing(null); setForm(emptyBill); };
  const openNew = () => { setForm(emptyBill); setEditing(null); setShowDialog(true); };
  const openEdit = (b) => { setForm(b); setEditing(b); setShowDialog(true); };

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setForm({ ...form, client_id: clientId, client_name: client ? `${client.first_name} ${client.last_name}` : "", insurance_provider: client?.insurance_provider || "" });
  };

  const handleSave = () => {
    const total = (form.hours || 0) * (form.rate || 0);
    const data = { ...form, total_amount: total };
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  const filtered = records.filter(r =>
    `${r.client_name} ${r.service_type} ${r.status}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalBilled = records.reduce((sum, r) => sum + (r.total_amount || 0), 0);
  const totalPaid = records.filter(r => r.status === "Paid").reduce((sum, r) => sum + (r.total_amount || 0), 0);
  const pendingAmount = records.filter(r => r.status === "Pending" || r.status === "Submitted").reduce((sum, r) => sum + (r.total_amount || 0), 0);

  return (
    <div>
      <PageHeader
        title="Billing & Revenue Cycle"
        subtitle="Claims, authorizations, remittance, and denial management"
        action={activeTab === "overview" ? <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />New Record</Button> : null}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-1.5"><DollarSign className="w-3.5 h-3.5" />Overview</TabsTrigger>
          <TabsTrigger value="claims" className="gap-1.5"><FileText className="w-3.5 h-3.5" />Claims</TabsTrigger>
          <TabsTrigger value="authorizations" className="gap-1.5"><ShieldCheck className="w-3.5 h-3.5" />Authorizations</TabsTrigger>
          <TabsTrigger value="eligibility" className="gap-1.5"><CheckCircle className="w-3.5 h-3.5" />Eligibility</TabsTrigger>
          <TabsTrigger value="remittance" className="gap-1.5"><Receipt className="w-3.5 h-3.5" />Remittance (ERA)</TabsTrigger>
          <TabsTrigger value="denials" className="gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />Denials</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Revenue Cycle</TabsTrigger>
        </TabsList>

        {/* ── Overview (Legacy) ── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card><CardContent className="py-4">
              <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-primary" /><p className="text-xs text-muted-foreground">Total Billed</p></div>
              <p className="text-2xl font-bold text-primary">${totalBilled.toLocaleString()}</p>
            </CardContent></Card>
            <Card><CardContent className="py-4">
              <div className="flex items-center gap-2 mb-1"><CheckCircle className="w-4 h-4 text-accent" /><p className="text-xs text-muted-foreground">Total Paid</p></div>
              <p className="text-2xl font-bold text-accent">${totalPaid.toLocaleString()}</p>
            </CardContent></Card>
            <Card><CardContent className="py-4">
              <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-chart-4" /><p className="text-xs text-muted-foreground">Pending</p></div>
              <p className="text-2xl font-bold text-chart-4">${pendingAmount.toLocaleString()}</p>
            </CardContent></Card>
          </div>

          <Card className="mb-6">
            <CardContent className="py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search billing records..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 border-0 bg-transparent focus-visible:ring-0" />
              </div>
            </CardContent>
          </Card>

          {filtered.length === 0 && !isLoading ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No billing records yet.</p>
              <Button onClick={openNew} size="sm" className="mt-3"><Plus className="w-4 h-4 mr-1" />New Record</Button>
            </CardContent></Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="hidden md:table-cell">Hours</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(r)}>
                        <TableCell className="font-medium">{r.client_name || "—"}</TableCell>
                        <TableCell className="text-sm">{r.service_type}</TableCell>
                        <TableCell className="text-sm">{r.date}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{r.hours || "—"}</TableCell>
                        <TableCell className="font-semibold">${(r.total_amount || 0).toLocaleString()}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="claims"><ClaimsQueue /></TabsContent>
        <TabsContent value="authorizations"><AuthorizationManager /></TabsContent>
        <TabsContent value="eligibility"><EligibilityVerification /></TabsContent>
        <TabsContent value="remittance"><RemittancePanel /></TabsContent>
        <TabsContent value="denials"><DenialManagement /></TabsContent>
        <TabsContent value="analytics"><RevenueCycleDashboard /></TabsContent>
      </Tabs>

      {/* New/Edit Billing Record Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Billing Record" : "New Billing Record"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Client *</Label>
              <Select value={form.client_id} onValueChange={handleClientSelect}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Service Type *</Label>
              <Select value={form.service_type} onValueChange={(v) => setForm({...form, service_type: v})}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{serviceTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date *</Label><Input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} /></div>
            <div><Label>Hours</Label><Input type="number" value={form.hours} onChange={(e) => setForm({...form, hours: parseFloat(e.target.value) || 0})} /></div>
            <div><Label>Rate ($)</Label><Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({...form, rate: parseFloat(e.target.value) || 0})} /></div>
            <div><Label>Insurance Provider</Label><Input value={form.insurance_provider} onChange={(e) => setForm({...form, insurance_provider: e.target.value})} /></div>
            <div><Label>Claim Number</Label><Input value={form.claim_number} onChange={(e) => setForm({...form, claim_number: e.target.value})} /></div>
            <div className="col-span-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{billStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.client_id || !form.service_type || !form.date}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}