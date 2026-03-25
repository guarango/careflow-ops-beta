import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, CheckCircle, XCircle } from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";

const leaveTypes = ["PTO", "Sick Leave", "FMLA", "Leave of Absence", "Holiday", "Bereavement", "Other"];

const emptyRequest = { staff_id: "", staff_name: "", leave_type: "PTO", start_date: "", end_date: "", notes: "", status: "Pending" };

const statusColors = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-green-50 text-green-700 border-green-200",
  Denied: "bg-red-50 text-red-700 border-red-200",
  Cancelled: "bg-gray-50 text-gray-600 border-gray-200",
};

export default function HRTimeOff({ leaveRequests, staff }) {
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyRequest);
  const [filter, setFilter] = useState("all");
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LeaveRequest.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["leave-requests"] }); setShowDialog(false); setForm(emptyRequest); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LeaveRequest.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leave-requests"] }),
  });

  const handleStaffSelect = (id) => {
    const s = staff.find(x => x.id === id);
    setForm(f => ({ ...f, staff_id: id, staff_name: s ? `${s.first_name} ${s.last_name}` : "" }));
  };

  const calcDays = (start, end) => {
    if (!start || !end) return 0;
    return Math.max(0, differenceInCalendarDays(new Date(end), new Date(start)) + 1);
  };

  const filtered = filter === "all" ? leaveRequests : leaveRequests.filter(r => r.status === filter);

  const approve = (r) => updateMutation.mutate({ id: r.id, data: { status: "Approved", reviewed_date: new Date().toISOString().split("T")[0] } });
  const deny = (r) => updateMutation.mutate({ id: r.id, data: { status: "Denied", reviewed_date: new Date().toISOString().split("T")[0] } });

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending", count: leaveRequests.filter(l => l.status === "Pending").length, color: "text-amber-600" },
          { label: "Approved", count: leaveRequests.filter(l => l.status === "Approved").length, color: "text-accent" },
          { label: "Total This Year", count: leaveRequests.length, color: "text-primary" },
        ].map(({ label, count, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4" />Leave Requests</CardTitle>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-8 w-32 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Denied">Denied</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setShowDialog(true)} className="gap-1">
              <Plus className="w-3.5 h-3.5" />New Request
            </Button>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No leave requests</TableCell></TableRow>
              )}
              {filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-sm">{r.staff_name || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{r.leave_type}</Badge></TableCell>
                  <TableCell className="text-sm">{r.start_date} – {r.end_date}</TableCell>
                  <TableCell className="text-sm font-semibold">{calcDays(r.start_date, r.end_date)}d</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">{r.notes || "—"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[r.status] || ""}`}>
                      {r.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {r.status === "Pending" && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-accent" onClick={() => approve(r)}><CheckCircle className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deny(r)}><XCircle className="w-4 h-4" /></Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Leave Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee *</Label>
              <Select value={form.staff_id} onValueChange={handleStaffSelect}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Leave Type *</Label>
              <Select value={form.leave_type} onValueChange={v => setForm(f => ({ ...f, leave_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{leaveTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date *</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><Label>End Date *</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            {form.start_date && form.end_date && (
              <p className="text-sm text-muted-foreground">Duration: <strong>{calcDays(form.start_date, form.end_date)} days</strong></p>
            )}
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.staff_id || !form.start_date || !form.end_date}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}