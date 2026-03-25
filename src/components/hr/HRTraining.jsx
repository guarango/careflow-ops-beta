import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, AlertTriangle } from "lucide-react";

const categories = ["CPR/First Aid", "Medication Administration", "Behavioral Support", "State DD Training", "HIPAA", "Safety", "Orientation", "Other"];
const statuses = ["Current", "Expiring Soon", "Expired", "Not Started", "In Progress"];

const emptyRec = { staff_id: "", staff_name: "", training_name: "", training_category: "CPR/First Aid", completed_date: "", expiry_date: "", hours: 0, provider: "", status: "Current", notes: "" };

const statusColors = {
  Current: "text-accent border-accent/30 bg-accent/10",
  "Expiring Soon": "text-amber-600 border-amber-300 bg-amber-50",
  Expired: "text-destructive border-destructive/30 bg-destructive/10",
  "Not Started": "text-muted-foreground border-border",
  "In Progress": "text-primary border-primary/30 bg-primary/10",
};

export default function HRTraining({ trainings, staff }) {
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyRec);
  const [filterStatus, setFilterStatus] = useState("all");
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TrainingRecord.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["training-records"] }); setShowDialog(false); setForm(emptyRec); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TrainingRecord.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["training-records"] }),
  });

  const handleStaffSelect = (id) => {
    const s = staff.find(x => x.id === id);
    setForm(f => ({ ...f, staff_id: id, staff_name: s ? `${s.first_name} ${s.last_name}` : "" }));
  };

  const filtered = filterStatus === "all" ? trainings : trainings.filter(t => t.status === filterStatus);
  const expiring = trainings.filter(t => t.status === "Expiring Soon").length;
  const expired = trainings.filter(t => t.status === "Expired").length;

  return (
    <div className="space-y-6">
      {(expiring > 0 || expired > 0) && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Certification Alerts</p>
            <p className="text-sm text-amber-700">
              {expired > 0 && `${expired} expired certification${expired > 1 ? "s" : ""}. `}
              {expiring > 0 && `${expiring} expiring soon.`}
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-4 h-4" />Training & Certifications</CardTitle>
          <div className="flex gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setShowDialog(true)} className="gap-1">
              <Plus className="w-3.5 h-3.5" />Add Record
            </Button>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Training</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No training records</TableCell></TableRow>
              )}
              {filtered.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-sm">{t.staff_name || "—"}</TableCell>
                  <TableCell className="text-sm">{t.training_name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{t.training_category}</Badge></TableCell>
                  <TableCell className="text-sm">{t.completed_date || "—"}</TableCell>
                  <TableCell className="text-sm">{t.expiry_date || "—"}</TableCell>
                  <TableCell className="text-sm">{t.hours ? `${t.hours}h` : "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${statusColors[t.status] || ""}`}>{t.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Training Record</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee *</Label>
              <Select value={form.staff_id} onValueChange={handleStaffSelect}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Training Name *</Label><Input value={form.training_name} onChange={e => setForm(f => ({ ...f, training_name: e.target.value }))} /></div>
            <div>
              <Label>Category *</Label>
              <Select value={form.training_category} onValueChange={v => setForm(f => ({ ...f, training_category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Completed Date</Label><Input type="date" value={form.completed_date} onChange={e => setForm(f => ({ ...f, completed_date: e.target.value }))} /></div>
              <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
              <div><Label>Hours</Label><Input type="number" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: parseFloat(e.target.value) || 0 }))} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Provider / Instructor</Label><Input value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.staff_id || !form.training_name}>Save Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}