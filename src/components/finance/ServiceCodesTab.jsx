import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, MapPin, ShieldOff, AlertTriangle } from "lucide-react";

const rateTypes = ["Hourly", "Daily", "Per Unit", "Monthly"];
const unitTypes = ["15-minute", "Hourly", "Daily"];
const fundingSources = ["Medicaid", "Medicaid Waiver", "State", "Private", "Other"];
const serviceTypes = ["Residential", "Day Program", "Community Living", "Respite", "Supported Employment", "Behavioral Support", "Nursing", "Other"];
const empty = { code: "", description: "", rate_type: "Hourly", unit_type: "Hourly", rate: 0, unit_minutes: 15, funding_source: "Medicaid Waiver", service_type: "", active: true, is_evv_required: false, is_exempt_support_strategies: false, notes: "" };

export default function ServiceCodesTab() {
  const { can } = useRole();
  const canEdit = can("accessBilling");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const queryClient = useQueryClient();

  const { data: codes = [] } = useQuery({ queryKey: ["service-codes"], queryFn: () => base44.entities.ServiceCode.list() });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceCode.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["service-codes"] }); closeDialog(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ServiceCode.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["service-codes"] }); closeDialog(); },
  });

  const closeDialog = () => { setShowDialog(false); setEditing(null); setForm(empty); };
  const openNew = () => { setForm(empty); setEditing(null); setShowDialog(true); };
  const openEdit = (c) => { setForm(c); setEditing(c); setShowDialog(true); };
  const handleSave = () => { if (editing) updateMutation.mutate({ id: editing.id, data: form }); else createMutation.mutate(form); };

  const zeroRateCount = codes.filter(c => !c.rate || c.rate === 0).length;

  return (
    <div>
      {canEdit && zeroRateCount > 0 && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Rate not configured</p>
            <p className="text-xs text-amber-700 mt-0.5">{zeroRateCount} of {codes.length} service codes have a $0.00 rate. Billing, unit tracking, and payroll export will compute to zero until rates are entered. Click a code to set its rate.</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {canEdit ? "State billing codes, rates, and unit configuration." : "Service codes (rates hidden — requires Billing bundle)."}
        </p>
        {canEdit && <Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-2" />Add Code</Button>}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Unit Type</TableHead>
                <TableHead className="hidden md:table-cell">Service Type</TableHead>
                {canEdit && <TableHead>Rate</TableHead>}
                <TableHead>EVV</TableHead>
                <TableHead>Exempt</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.length === 0 && <TableRow><TableCell colSpan={canEdit ? 8 : 7} className="text-center py-8 text-muted-foreground text-sm">No service codes yet.</TableCell></TableRow>}
              {codes.map(c => (
                <TableRow key={c.id} className={canEdit ? "cursor-pointer hover:bg-muted/50" : ""} onClick={canEdit ? () => openEdit(c) : undefined}>
                  <TableCell><span className="font-mono font-semibold text-primary">{c.code}</span></TableCell>
                  <TableCell className="text-sm">{c.description}</TableCell>
                  <TableCell className="text-sm">{c.unit_type || c.rate_type}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{c.service_type || "—"}</TableCell>
                  {canEdit && <TableCell className="font-semibold">${(c.rate || 0).toFixed(2)}{c.unit_type === "15-minute" ? "/15min" : c.unit_type === "Hourly" ? "/hr" : "/day"}</TableCell>}
                  <TableCell>{c.is_evv_required ? <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1 text-xs"><MapPin className="w-3 h-3" />Required</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{c.is_exempt_support_strategies ? <Badge variant="outline" className="text-xs gap-1"><ShieldOff className="w-3 h-3" />Exempt</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                  <TableCell><Badge variant="outline" className={c.active !== false ? "bg-accent/15 text-accent border-accent/20" : "bg-muted text-muted-foreground"}>{c.active !== false ? "Active" : "Inactive"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {canEdit && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit Service Code" : "Add Service Code"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Code</Label><Input className="font-mono" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. T2016" /></div>
                <div><Label>Unit Type *</Label><Select value={form.unit_type} onValueChange={v => setForm({ ...form, unit_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{unitTypes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div><Label>Description *</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Rate ($) *</Label><Input type="number" step="0.01" value={form.rate} onChange={e => setForm({ ...form, rate: parseFloat(e.target.value) || 0 })} /></div>
                <div><Label>Rate Type</Label><Select value={form.rate_type} onValueChange={v => setForm({ ...form, rate_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{rateTypes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Service Type</Label><Select value={form.service_type} onValueChange={v => setForm({ ...form, service_type: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{serviceTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Funding Source</Label><Select value={form.funding_source} onValueChange={v => setForm({ ...form, funding_source: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{fundingSources.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <Switch checked={!!form.is_evv_required} onCheckedChange={v => setForm({ ...form, is_evv_required: v })} />
                <div><p className="text-sm font-medium flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-primary" />EVV Required</p><p className="text-xs text-muted-foreground">GPS location captured at clock-in/out</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <Switch checked={!!form.is_exempt_support_strategies} onCheckedChange={v => setForm({ ...form, is_exempt_support_strategies: v })} />
                <div><p className="text-sm font-medium flex items-center gap-1"><ShieldOff className="w-3.5 h-3.5" />Exempt from Support Strategies</p><p className="text-xs text-muted-foreground">ELS, MTP, PBA, Professional Medication Monitoring, Respite</p></div>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.description || !form.rate}>{editing ? "Update" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}