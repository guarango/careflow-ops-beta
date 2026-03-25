import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, DollarSign, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export default function RemittancePanel() {
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState({ payer_name: "", check_number: "", payment_date: "", total_paid: 0, total_billed: 0, total_denied: 0, claims_paid: 0, claims_denied: 0, period_start: "", period_end: "", notes: "" });
  const qc = useQueryClient();

  const { data: remittances = [] } = useQuery({
    queryKey: ["remittances"],
    queryFn: () => base44.entities.Remittance.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Remittance.create({ ...data, status: "Posted" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["remittances"] }); setShowImport(false); },
  });

  const totalPaid = remittances.reduce((s, r) => s + (r.total_paid || 0), 0);
  const totalBilled = remittances.reduce((s, r) => s + (r.total_billed || 0), 0);
  const totalDenied = remittances.reduce((s, r) => s + (r.total_denied || 0), 0);

  const statusColor = { Received: "bg-amber-50 text-amber-700", Processing: "bg-blue-50 text-blue-700", Posted: "bg-green-50 text-green-700", Error: "bg-red-50 text-red-700" };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-accent" /><p className="text-xs text-muted-foreground">Total Paid (ERA)</p></div>
          <p className="text-2xl font-bold text-accent">${totalPaid.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4 text-primary" /><p className="text-xs text-muted-foreground">Total Billed</p></div>
          <p className="text-2xl font-bold text-primary">${totalBilled.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1"><XCircle className="w-4 h-4 text-destructive" /><p className="text-xs text-muted-foreground">Total Denied</p></div>
          <p className="text-2xl font-bold text-destructive">${totalDenied.toLocaleString()}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />835 ERA Remittance Log</CardTitle>
            <Button size="sm" onClick={() => setShowImport(true)} className="gap-1.5"><Upload className="w-3.5 h-3.5" />Post ERA</Button>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payer</TableHead>
                <TableHead>Check #</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Total Billed</TableHead>
                <TableHead>Total Paid</TableHead>
                <TableHead>Total Denied</TableHead>
                <TableHead>Claims Paid</TableHead>
                <TableHead>Claims Denied</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {remittances.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">No remittance records yet. Post an 835 ERA to begin.</TableCell></TableRow>
              )}
              {remittances.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.payer_name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.check_number || "—"}</TableCell>
                  <TableCell className="text-sm">{r.payment_date}</TableCell>
                  <TableCell>${(r.total_billed || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-accent font-semibold">${(r.total_paid || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-destructive">${(r.total_denied || 0).toLocaleString()}</TableCell>
                  <TableCell>{r.claims_paid || 0}</TableCell>
                  <TableCell>{r.claims_denied || 0}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[r.status] || ""}`}>{r.status}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Post ERA Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Upload className="w-4 h-4" />Post 835 ERA Remittance</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Payer Name *</Label><Input value={form.payer_name} onChange={e => setForm(f => ({ ...f, payer_name: e.target.value }))} /></div>
            <div><Label>Check Number</Label><Input value={form.check_number} onChange={e => setForm(f => ({ ...f, check_number: e.target.value }))} /></div>
            <div><Label>Payment Date *</Label><Input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} /></div>
            <div><Label>Period Start</Label><Input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} /></div>
            <div><Label>Period End</Label><Input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} /></div>
            <div><Label>Total Billed ($)</Label><Input type="number" value={form.total_billed} onChange={e => setForm(f => ({ ...f, total_billed: parseFloat(e.target.value) || 0 }))} /></div>
            <div><Label>Total Paid ($)</Label><Input type="number" value={form.total_paid} onChange={e => setForm(f => ({ ...f, total_paid: parseFloat(e.target.value) || 0 }))} /></div>
            <div><Label>Total Denied ($)</Label><Input type="number" value={form.total_denied} onChange={e => setForm(f => ({ ...f, total_denied: parseFloat(e.target.value) || 0 }))} /></div>
            <div><Label>Total Adjusted ($)</Label><Input type="number" value={form.total_adjusted} onChange={e => setForm(f => ({ ...f, total_adjusted: parseFloat(e.target.value) || 0 }))} /></div>
            <div><Label>Claims Paid</Label><Input type="number" value={form.claims_paid} onChange={e => setForm(f => ({ ...f, claims_paid: parseInt(e.target.value) || 0 }))} /></div>
            <div><Label>Claims Denied</Label><Input type="number" value={form.claims_denied} onChange={e => setForm(f => ({ ...f, claims_denied: parseInt(e.target.value) || 0 }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.payer_name || !form.payment_date}>Post ERA</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}