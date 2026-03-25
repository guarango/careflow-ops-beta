import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Plus, AlertTriangle, Search, ShieldCheck } from "lucide-react";

const empty = { client_id: "", client_name: "", service_code: "", service_type: "", funding_source: "Medicaid Waiver", auth_number: "", payer: "", authorized_units: 0, used_units: 0, unit_type: "Hours", start_date: "", end_date: "", status: "Pending Submission", alert_threshold_pct: 80, notes: "" };

const STATUS_COLORS = {
  "Pending Submission": "bg-gray-100 text-gray-700",
  "Submitted": "bg-blue-50 text-blue-700",
  "Approved": "bg-green-50 text-green-700",
  "Denied": "bg-red-50 text-red-700",
  "Expired": "bg-orange-50 text-orange-700",
  "Pending Appeal": "bg-purple-50 text-purple-700",
};

export default function AuthorizationManager() {
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const qc = useQueryClient();

  const { data: auths = [], isLoading } = useQuery({
    queryKey: ["authorizations"],
    queryFn: () => base44.entities.Authorization.list("-created_date"),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: serviceCodes = [] } = useQuery({
    queryKey: ["service-codes"],
    queryFn: () => base44.entities.ServiceCode.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Authorization.create({ ...data, remaining_units: data.authorized_units - (data.used_units || 0) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["authorizations"] }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Authorization.update(id, { ...data, remaining_units: data.authorized_units - (data.used_units || 0) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["authorizations"] }); closeDialog(); },
  });

  const closeDialog = () => { setShowDialog(false); setEditing(null); setForm(empty); };

  const openNew = () => { setForm(empty); setEditing(null); setShowDialog(true); };
  const openEdit = (a) => { setForm(a); setEditing(a); setShowDialog(true); };

  const handleClientSelect = (clientId) => {
    const c = clients.find(x => x.id === clientId);
    setForm(f => ({ ...f, client_id: clientId, client_name: c ? `${c.first_name} ${c.last_name}` : "" }));
  };

  const handleServiceCodeSelect = (codeId) => {
    const sc = serviceCodes.find(x => x.id === codeId);
    setForm(f => ({ ...f, service_code: sc?.code || codeId, service_type: sc?.service_type || "" }));
  };

  const handleSave = () => {
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const filtered = auths.filter(a =>
    `${a.client_name} ${a.service_code} ${a.auth_number}`.toLowerCase().includes(search.toLowerCase())
  );

  const approaching = auths.filter(a => {
    const used = a.authorized_units > 0 ? (a.used_units || 0) / a.authorized_units * 100 : 0;
    return a.status === "Approved" && used >= (a.alert_threshold_pct || 80) && used < 100;
  });

  const exhausted = auths.filter(a => a.status === "Approved" && (a.remaining_units || 0) <= 0);

  return (
    <div className="space-y-6">
      {(approaching.length > 0 || exhausted.length > 0) && (
        <div className="space-y-2">
          {exhausted.map(a => (
            <div key={a.id} className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="font-semibold text-red-700">Authorization Exhausted:</span>
              <span className="text-red-600">{a.client_name} — {a.service_code} — 0 {a.unit_type} remaining. Timecards blocked.</span>
            </div>
          ))}
          {approaching.map(a => {
            const pct = a.authorized_units > 0 ? Math.round((a.used_units || 0) / a.authorized_units * 100) : 0;
            return (
              <div key={a.id} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="font-semibold text-amber-700">Approaching Limit:</span>
                <span className="text-amber-600">{a.client_name} — {a.service_code} — {pct}% used ({a.used_units}/{a.authorized_units} {a.unit_type})</span>
              </div>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" />Prior Authorizations</CardTitle>
            <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="w-3.5 h-3.5" />New Authorization</Button>
          </div>
          <div className="relative pt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search authorizations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Service Code</TableHead>
                <TableHead>Auth #</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Units Used</TableHead>
                <TableHead>Utilization</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No authorizations. Add one to track unit utilization.</TableCell></TableRow>
              )}
              {filtered.map(a => {
                const pct = a.authorized_units > 0 ? Math.round((a.used_units || 0) / a.authorized_units * 100) : 0;
                const isWarning = pct >= (a.alert_threshold_pct || 80);
                return (
                  <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(a)}>
                    <TableCell className="font-medium text-sm">{a.client_name}</TableCell>
                    <TableCell className="font-mono text-xs">{a.service_code}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.auth_number || "—"}</TableCell>
                    <TableCell className="text-xs">{a.start_date} – {a.end_date}</TableCell>
                    <TableCell className="text-sm">{a.used_units || 0} / {a.authorized_units} {a.unit_type}</TableCell>
                    <TableCell className="w-36">
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className={`h-2 flex-1 ${isWarning ? "[&>div]:bg-amber-500" : ""} ${pct >= 100 ? "[&>div]:bg-destructive" : ""}`} />
                        <span className={`text-xs font-medium ${pct >= 100 ? "text-destructive" : isWarning ? "text-amber-600" : "text-muted-foreground"}`}>{pct}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[a.status] || ""}`}>{a.status}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Authorization" : "New Prior Authorization"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Client *</Label>
              <Select value={form.client_id} onValueChange={handleClientSelect}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Service Code *</Label>
              <Select value={form.service_code} onValueChange={handleServiceCodeSelect}>
                <SelectTrigger><SelectValue placeholder="Select service code" /></SelectTrigger>
                <SelectContent>{serviceCodes.map(sc => <SelectItem key={sc.id} value={sc.id}>{sc.code} — {sc.description}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Funding Source</Label>
              <Select value={form.funding_source} onValueChange={v => setForm(f => ({ ...f, funding_source: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Medicaid", "Medicaid Waiver", "State", "Private", "Other"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Authorization Number</Label><Input value={form.auth_number} onChange={e => setForm(f => ({ ...f, auth_number: e.target.value }))} /></div>
            <div><Label>Payer</Label><Input value={form.payer} onChange={e => setForm(f => ({ ...f, payer: e.target.value }))} /></div>
            <div><Label>Authorized Units *</Label><Input type="number" value={form.authorized_units} onChange={e => setForm(f => ({ ...f, authorized_units: parseFloat(e.target.value) || 0 }))} /></div>
            <div><Label>Used Units</Label><Input type="number" value={form.used_units} onChange={e => setForm(f => ({ ...f, used_units: parseFloat(e.target.value) || 0 }))} /></div>
            <div>
              <Label>Unit Type *</Label>
              <Select value={form.unit_type} onValueChange={v => setForm(f => ({ ...f, unit_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Hours", "Visits", "Days", "Units"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Pending Submission","Submitted","Approved","Denied","Expired","Pending Appeal"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Start Date *</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            <div><Label>End Date *</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            <div><Label>Alert Threshold %</Label><Input type="number" value={form.alert_threshold_pct} onChange={e => setForm(f => ({ ...f, alert_threshold_pct: parseInt(e.target.value) || 80 }))} /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.client_id || !form.service_code || !form.start_date || !form.end_date}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}