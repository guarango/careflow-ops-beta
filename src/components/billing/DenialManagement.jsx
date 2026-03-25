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
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Search, Plus, TrendingUp, Clock, CheckCircle2, XCircle } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

const APPEAL_STAGES = ["Needs Review", "Appeal In Progress", "Appeal Submitted", "Overturn Won", "Overturn Denied"];
const CATEGORIES = ["Eligibility", "Authorization", "EVV", "Timely Filing", "Duplicate", "Coding Error", "Other"];

const STAGE_COLORS = {
  "Needs Review": "bg-red-50 text-red-700 border-red-200",
  "Appeal In Progress": "bg-amber-50 text-amber-700 border-amber-200",
  "Appeal Submitted": "bg-blue-50 text-blue-700 border-blue-200",
  "Overturn Won": "bg-green-50 text-green-700 border-green-200",
  "Overturn Denied": "bg-gray-100 text-gray-600 border-gray-200",
};

const empty = { claim_id: "", claim_number: "", client_name: "", service_date: "", payer: "", amount_denied: 0, denial_code: "", denial_reason: "", denial_category: "Other", date_denied: "", appeal_deadline: "", appeal_status: "Needs Review", appeal_notes: "", amount_recovered: 0 };

export default function DenialManagement() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const qc = useQueryClient();

  const { data: denials = [], isLoading } = useQuery({
    queryKey: ["denials"],
    queryFn: () => base44.entities.DenialRecord.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DenialRecord.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["denials"] }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DenialRecord.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["denials"] }); closeDialog(); },
  });

  const closeDialog = () => { setShowDialog(false); setEditing(null); setForm(empty); };
  const openEdit = (d) => { setForm(d); setEditing(d); setShowDialog(true); };
  const openNew = () => { setForm(empty); setEditing(null); setShowDialog(true); };
  const handleSave = () => {
    if (editing) updateMutation.mutate({ id: editing.id, data: form });
    else createMutation.mutate(form);
  };

  const filtered = denials.filter(d => {
    const matchSearch = `${d.client_name} ${d.denial_code} ${d.payer}`.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === "all" || d.appeal_status === stageFilter;
    const matchCat = categoryFilter === "all" || d.denial_category === categoryFilter;
    return matchSearch && matchStage && matchCat;
  });

  const totalDenied = denials.reduce((s, d) => s + (d.amount_denied || 0), 0);
  const totalRecovered = denials.filter(d => d.appeal_status === "Overturn Won").reduce((s, d) => s + (d.amount_recovered || d.amount_denied || 0), 0);
  const needsReview = denials.filter(d => d.appeal_status === "Needs Review").length;

  const today = new Date();
  const deadlineSoon = denials.filter(d => {
    if (!d.appeal_deadline || ["Overturn Won", "Overturn Denied"].includes(d.appeal_status)) return false;
    const days = differenceInDays(parseISO(d.appeal_deadline), today);
    return days >= 0 && days <= 14;
  });

  return (
    <div className="space-y-6">
      {deadlineSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">Appeal Deadlines Approaching</span>
          </div>
          {deadlineSoon.map(d => {
            const days = differenceInDays(parseISO(d.appeal_deadline), today);
            return <p key={d.id} className="text-xs text-amber-600">• {d.client_name} — {d.denial_code} — deadline in {days} days ({d.appeal_deadline})</p>;
          })}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Total Denied</p>
          <p className="text-2xl font-bold text-destructive">${totalDenied.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Recovered (Appeals)</p>
          <p className="text-2xl font-bold text-accent">${totalRecovered.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Needs Review</p>
          <p className="text-2xl font-bold text-chart-4">{needsReview}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Deadlines ≤14 days</p>
          <p className="text-2xl font-bold text-amber-600">{deadlineSoon.length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" />Denial Management Queue</CardTitle>
            <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="w-3.5 h-3.5" />Add Denial</Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search denials..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Stages" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {APPEAL_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Denial Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date Denied</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Appeal Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No denied claims in queue.</TableCell></TableRow>
              )}
              {filtered.map(d => {
                const daysToDeadline = d.appeal_deadline ? differenceInDays(parseISO(d.appeal_deadline), today) : null;
                return (
                  <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(d)}>
                    <TableCell className="font-medium text-sm">{d.client_name}</TableCell>
                    <TableCell className="text-sm">{d.payer}</TableCell>
                    <TableCell className="font-mono text-xs">{d.denial_code}</TableCell>
                    <TableCell><span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{d.denial_category}</span></TableCell>
                    <TableCell className="font-semibold text-destructive">${(d.amount_denied || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-sm">{d.date_denied}</TableCell>
                    <TableCell className="text-sm">
                      {daysToDeadline !== null ? (
                        <span className={daysToDeadline <= 14 && daysToDeadline >= 0 ? "text-amber-600 font-semibold" : daysToDeadline < 0 ? "text-destructive" : ""}>
                          {daysToDeadline < 0 ? "Expired" : `${daysToDeadline}d`}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STAGE_COLORS[d.appeal_status] || ""}`}>{d.appeal_status}</span>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Denial Record" : "Add Denial Record"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Client Name *</Label><Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} /></div>
            <div><Label>Claim Number</Label><Input value={form.claim_number} onChange={e => setForm(f => ({ ...f, claim_number: e.target.value }))} /></div>
            <div><Label>Payer *</Label><Input value={form.payer} onChange={e => setForm(f => ({ ...f, payer: e.target.value }))} /></div>
            <div><Label>Service Date</Label><Input type="date" value={form.service_date} onChange={e => setForm(f => ({ ...f, service_date: e.target.value }))} /></div>
            <div><Label>Denial Code *</Label><Input value={form.denial_code} onChange={e => setForm(f => ({ ...f, denial_code: e.target.value }))} placeholder="e.g. CO-4" /></div>
            <div><Label>Amount Denied ($) *</Label><Input type="number" value={form.amount_denied} onChange={e => setForm(f => ({ ...f, amount_denied: parseFloat(e.target.value) || 0 }))} /></div>
            <div>
              <Label>Denial Category *</Label>
              <Select value={form.denial_category} onValueChange={v => setForm(f => ({ ...f, denial_category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Appeal Status</Label>
              <Select value={form.appeal_status} onValueChange={v => setForm(f => ({ ...f, appeal_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{APPEAL_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date Denied</Label><Input type="date" value={form.date_denied} onChange={e => setForm(f => ({ ...f, date_denied: e.target.value }))} /></div>
            <div><Label>Appeal Deadline</Label><Input type="date" value={form.appeal_deadline} onChange={e => setForm(f => ({ ...f, appeal_deadline: e.target.value }))} /></div>
            <div><Label>Amount Recovered ($)</Label><Input type="number" value={form.amount_recovered} onChange={e => setForm(f => ({ ...f, amount_recovered: parseFloat(e.target.value) || 0 }))} /></div>
            <div className="col-span-2"><Label>Denial Reason *</Label><Input value={form.denial_reason} onChange={e => setForm(f => ({ ...f, denial_reason: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Appeal Notes</Label><Textarea value={form.appeal_notes} onChange={e => setForm(f => ({ ...f, appeal_notes: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.client_name || !form.payer || !form.denial_code}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}