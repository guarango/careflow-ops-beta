import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Plus, Search, Clock, TrendingUp, Users, FileText, Download, Code2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import PayrollExportDialog from "@/components/payroll/PayrollExportDialog";

const serviceTypes = ["Residential", "Day Program", "Community Living", "Respite", "Supported Employment"];
const billStatuses = ["Pending", "Submitted", "Paid", "Denied", "Appealed"];
const emptyBill = { client_id: "", client_name: "", service_type: "", date: "", hours: 0, rate: 0, total_amount: 0, insurance_provider: "", claim_number: "", status: "Pending", notes: "" };

function calcHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 100) / 100);
}

function calcPay(shift) {
  const hours = shift.total_hours || calcHours(shift.start_time, shift.end_time);
  if (!shift.rate) return 0;
  if (shift.rate_type === "Daily") return shift.rate;
  if (shift.rate_type === "Per Unit") return Math.ceil((hours * 60) / 15) * shift.rate;
  return hours * shift.rate;
}

// ─────────────────────────────────────────────
// BILLING TAB
// ─────────────────────────────────────────────
function BillingTab() {
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
  const { data: serviceCodes = [] } = useQuery({
    queryKey: ["service-codes"],
    queryFn: () => base44.entities.ServiceCode.list(),
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
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="py-4">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-primary" /><p className="text-xs text-muted-foreground">Total Billed</p></div>
          <p className="text-2xl font-bold text-primary">${totalBilled.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="py-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-emerald-500" /><p className="text-xs text-muted-foreground">Total Paid</p></div>
          <p className="text-2xl font-bold text-emerald-600">${totalPaid.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="py-4">
          <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-amber-500" /><p className="text-xs text-muted-foreground">Pending</p></div>
          <p className="text-2xl font-bold text-amber-600">${pendingAmount.toLocaleString()}</p>
        </CardContent></Card>
      </div>

      {/* Action + Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search billing records…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />New Record</Button>
      </div>

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
              {filtered.length === 0 && !isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No billing records yet.</TableCell></TableRow>
              )}
              {filtered.map(r => (
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

      {/* Service Codes sub-section */}
      <ServiceCodesSection serviceCodes={serviceCodes} queryClient={queryClient} />

      {/* Dialog */}
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
              <Select value={form.service_type} onValueChange={v => setForm({ ...form, service_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{serviceTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div><Label>Hours</Label><Input type="number" value={form.hours} onChange={e => setForm({ ...form, hours: parseFloat(e.target.value) || 0 })} /></div>
            <div><Label>Rate ($)</Label><Input type="number" step="0.01" value={form.rate} onChange={e => setForm({ ...form, rate: parseFloat(e.target.value) || 0 })} /></div>
            <div><Label>Insurance Provider</Label><Input value={form.insurance_provider} onChange={e => setForm({ ...form, insurance_provider: e.target.value })} /></div>
            <div><Label>Claim Number</Label><Input value={form.claim_number} onChange={e => setForm({ ...form, claim_number: e.target.value })} /></div>
            <div className="col-span-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{billStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
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

// ─────────────────────────────────────────────
// SERVICE CODES SUB-SECTION
// ─────────────────────────────────────────────
function ServiceCodesSection({ serviceCodes, queryClient }) {
  const [open, setOpen] = useState(false);
  const emptyCode = { code: "", description: "", service_type: "", rate: 0, rate_type: "Hourly", evv_required: false };
  const [form, setForm] = useState(emptyCode);
  const [editing, setEditing] = useState(null);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceCode.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["service-codes"] }); setOpen(false); setForm(emptyCode); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ServiceCode.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["service-codes"] }); setOpen(false); setEditing(null); },
  });

  const handleSave = () => {
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Service Codes</h3>
        </div>
        <Button size="sm" variant="outline" onClick={() => { setForm(emptyCode); setEditing(null); setOpen(true); }}>
          <Plus className="w-3.5 h-3.5 mr-1" />Add Code
        </Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>EVV</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceCodes.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">No service codes yet.</TableCell></TableRow>
              )}
              {serviceCodes.map(sc => (
                <TableRow key={sc.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setForm(sc); setEditing(sc); setOpen(true); }}>
                  <TableCell className="font-mono text-sm font-medium">{sc.code}</TableCell>
                  <TableCell className="text-sm">{sc.description}</TableCell>
                  <TableCell className="text-sm">{sc.service_type}</TableCell>
                  <TableCell className="text-sm">${sc.rate}</TableCell>
                  <TableCell className="text-sm">{sc.rate_type}</TableCell>
                  <TableCell>{sc.evv_required ? <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">Required</Badge> : <span className="text-xs text-muted-foreground">No</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Service Code" : "New Service Code"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Code *</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="H2016" /></div>
              <div>
                <Label>Service Type</Label>
                <Select value={form.service_type} onValueChange={v => setForm({ ...form, service_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{serviceTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Rate ($)</Label><Input type="number" step="0.01" value={form.rate} onChange={e => setForm({ ...form, rate: parseFloat(e.target.value) || 0 })} /></div>
              <div>
                <Label>Rate Type</Label>
                <Select value={form.rate_type} onValueChange={v => setForm({ ...form, rate_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hourly">Hourly</SelectItem>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Per Unit">Per Unit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <input type="checkbox" id="evv_required" checked={!!form.evv_required} onChange={e => setForm({ ...form, evv_required: e.target.checked })} className="w-4 h-4" />
              <Label htmlFor="evv_required" className="cursor-pointer">EVV Required</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.code}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAYROLL TAB
// ─────────────────────────────────────────────
function PayrollTab() {
  const [periodStart, setPeriodStart] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [periodEnd, setPeriodEnd] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [filterStaff, setFilterStaff] = useState("all");
  const [showExport, setShowExport] = useState(false);

  const { data: shifts = [] } = useQuery({ queryKey: ["shifts"], queryFn: () => base44.entities.ShiftSchedule.list("-date") });
  const { data: staffList = [] } = useQuery({ queryKey: ["staff"], queryFn: () => base44.entities.StaffMember.list() });

  const completedShifts = useMemo(() => {
    return shifts.filter(s => {
      if (s.status !== "Completed") return false;
      if (!s.date) return false;
      try {
        const d = parseISO(s.date);
        return isWithinInterval(d, { start: parseISO(periodStart), end: parseISO(periodEnd) });
      } catch { return false; }
    });
  }, [shifts, periodStart, periodEnd]);

  const summaries = useMemo(() => {
    const map = {};
    completedShifts.forEach(shift => {
      const id = shift.staff_id;
      if (!id) return;
      if (!map[id]) {
        const staff = staffList.find(s => s.id === id);
        map[id] = {
          staff_id: id,
          staff_name: shift.staff_name || (staff ? `${staff.first_name} ${staff.last_name}` : "Unknown"),
          role: staff?.role || "",
          shifts: [],
          total_hours: 0,
          gross_pay: 0,
        };
      }
      const hours = shift.total_hours || calcHours(shift.start_time, shift.end_time);
      const pay = calcPay(shift);
      map[id].shifts.push(shift);
      map[id].total_hours += hours;
      map[id].gross_pay += pay;
    });
    return Object.values(map).sort((a, b) => b.gross_pay - a.gross_pay);
  }, [completedShifts, staffList]);

  const filtered = filterStaff === "all" ? summaries : summaries.filter(s => s.staff_id === filterStaff);

  const totals = useMemo(() => ({
    shifts: filtered.reduce((s, r) => s + r.shifts.length, 0),
    hours: filtered.reduce((s, r) => s + r.total_hours, 0),
    pay: filtered.reduce((s, r) => s + r.gross_pay, 0),
  }), [filtered]);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end mb-6 p-4 bg-muted/40 rounded-lg border">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Period Start</span>
          <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className="h-8 text-sm w-38" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Period End</span>
          <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="h-8 text-sm w-38" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Staff Member</span>
          <Select value={filterStaff} onValueChange={setFilterStaff}>
            <SelectTrigger className="h-8 text-sm w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {staffList.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowExport(true)} disabled={filtered.length === 0} className="ml-auto">
          <Download className="w-4 h-4 mr-2" />Export
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Staff</span></div>
          <p className="text-2xl font-bold">{filtered.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><FileText className="w-4 h-4 text-blue-500" /><span className="text-xs text-muted-foreground">Shifts</span></div>
          <p className="text-2xl font-bold">{totals.shifts}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-amber-500" /><span className="text-xs text-muted-foreground">Total Hours</span></div>
          <p className="text-2xl font-bold">{totals.hours.toFixed(1)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-green-500" /><span className="text-xs text-muted-foreground">Gross Pay</span></div>
          <p className="text-2xl font-bold">${totals.pay.toFixed(2)}</p>
        </CardContent></Card>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No completed shifts found for this period</p>
            <p className="text-xs text-muted-foreground mt-1">Approved timecards from completed shifts populate automatically.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Staff Payroll Summary — {format(parseISO(periodStart), "MMM d")} to {format(parseISO(periodEnd), "MMM d, yyyy")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">Staff Member</th>
                    <th className="text-left px-4 py-3 font-medium">Role</th>
                    <th className="text-right px-4 py-3 font-medium">Shifts</th>
                    <th className="text-right px-4 py-3 font-medium">Hours</th>
                    <th className="text-right px-4 py-3 font-medium">Gross Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => (
                    <tr key={row.staff_id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="px-4 py-3 font-medium">{row.staff_name}</td>
                      <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{row.role}</Badge></td>
                      <td className="px-4 py-3 text-right">{row.shifts.length}</td>
                      <td className="px-4 py-3 text-right">{row.total_hours.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700">${row.gross_pay.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/30 font-semibold">
                    <td className="px-4 py-3" colSpan={2}>Total</td>
                    <td className="px-4 py-3 text-right">{totals.shifts}</td>
                    <td className="px-4 py-3 text-right">{totals.hours.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700">${totals.pay.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <PayrollExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        summaries={filtered}
        periodStart={periodStart}
        periodEnd={periodEnd}
        totals={totals}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// FINANCE PAGE
// ─────────────────────────────────────────────
export default function Finance() {
  const [activeTab, setActiveTab] = useState("billing");

  return (
    <div>
      <PageHeader
        title="Finance"
        subtitle="Billing, service codes, and payroll in one place"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="billing" className="gap-2"><DollarSign className="w-4 h-4" />Billing</TabsTrigger>
          <TabsTrigger value="payroll" className="gap-2"><TrendingUp className="w-4 h-4" />Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="billing"><BillingTab /></TabsContent>
        <TabsContent value="payroll"><PayrollTab /></TabsContent>
      </Tabs>
    </div>
  );
}