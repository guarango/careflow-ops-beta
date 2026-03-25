import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tag, Plus, MapPin } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const rateTypes = ["Hourly", "Daily", "Per Unit", "Monthly"];
const fundingSources = ["Medicaid", "Medicaid Waiver", "State", "Private", "Other"];
const serviceTypes = ["Residential", "Day Program", "Community Living", "Respite", "Supported Employment", "Behavioral Support", "Nursing", "Other"];

const empty = { code: "", description: "", rate_type: "Hourly", rate: 0, unit_minutes: 15, funding_source: "Medicaid Waiver", service_type: "", active: true, evv_required: false, notes: "" };

export default function ServiceCodes() {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const queryClient = useQueryClient();
  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["service-codes"],
    queryFn: () => base44.entities.ServiceCode.list(),
  });

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

  const handleSave = () => {
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  return (
    <div>
      <PageHeader title="Service Codes" subtitle="State billing codes & payout rates" action={<Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add Code</Button>} />

      {codes.length === 0 && !isLoading ? (
        <EmptyState icon={Tag} title="No service codes" description="Add Medicaid/state billing codes with payout rates." action={<Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" />Add Code</Button>} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Rate Type</TableHead>
                  <TableHead>State Rate</TableHead>
                  <TableHead>Funding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>EVV</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map(c => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(c)}>
                    <TableCell><span className="font-mono font-semibold text-primary">{c.code}</span></TableCell>
                    <TableCell className="text-sm">{c.description}</TableCell>
                    <TableCell className="text-sm">{c.service_type || "—"}</TableCell>
                    <TableCell className="text-sm">{c.rate_type}</TableCell>
                    <TableCell className="font-semibold">${c.rate?.toFixed(2)}{c.rate_type === "Per Unit" ? "/unit" : c.rate_type === "Hourly" ? "/hr" : c.rate_type === "Daily" ? "/day" : "/mo"}</TableCell>
                    <TableCell className="text-sm">{c.funding_source}</TableCell>
                    <TableCell><Badge variant="outline" className={c.active ? "bg-accent/15 text-accent border-accent/20" : "bg-muted text-muted-foreground"}>{c.active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell>
                     {c.evv_required ? (
                       <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1 text-xs"><MapPin className="w-3 h-3" />Required</Badge>
                     ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Service Code" : "Add Service Code"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Code *</Label><Input className="font-mono" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. T2016" /></div>
              <div>
                <Label>Rate Type *</Label>
                <Select value={form.rate_type} onValueChange={v => setForm({ ...form, rate_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{rateTypes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description *</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>State Rate ($) *</Label><Input type="number" step="0.01" value={form.rate} onChange={e => setForm({ ...form, rate: parseFloat(e.target.value) || 0 })} /></div>
              {form.rate_type === "Per Unit" && (
                <div><Label>Minutes / Unit</Label><Input type="number" value={form.unit_minutes} onChange={e => setForm({ ...form, unit_minutes: parseInt(e.target.value) || 15 })} /></div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Service Type</Label>
                <Select value={form.service_type} onValueChange={v => setForm({ ...form, service_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{serviceTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Funding Source</Label>
                <Select value={form.funding_source} onValueChange={v => setForm({ ...form, funding_source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{fundingSources.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <Switch checked={!!form.evv_required} onCheckedChange={v => setForm({ ...form, evv_required: v })} />
              <div>
                <p className="text-sm font-medium flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-primary" />EVV Required</p>
                <p className="text-xs text-muted-foreground">GPS location must be captured at clock-in and clock-out</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.code || !form.description || !form.rate}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}