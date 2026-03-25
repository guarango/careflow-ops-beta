import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserCheck, UserX, Clock, Plus, Search, Mail } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";

const emptyStaff = { first_name: "", last_name: "", email: "", role: "DSP", employment_type: "Full Time", hire_date: "", status: "Active" };

export default function HROverview({ staff, leaveRequests, reviews, trainings }) {
  const [search, setSearch] = useState("");
  const [showOnboard, setShowOnboard] = useState(false);
  const [form, setForm] = useState(emptyStaff);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffMember.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["staff"] }); setShowOnboard(false); setForm(emptyStaff); },
  });

  const active = staff.filter(s => s.status === "Active").length;
  const onLeave = staff.filter(s => s.status === "On Leave").length;
  const pendingLeave = leaveRequests.filter(l => l.status === "Pending").length;
  const expiringTraining = trainings.filter(t => t.status === "Expiring Soon").length;

  const filtered = staff.filter(s =>
    `${s.first_name} ${s.last_name} ${s.role} ${s.status}`.toLowerCase().includes(search.toLowerCase())
  );

  const getStaffTrainings = (sid) => trainings.filter(t => t.staff_id === sid);
  const getStaffReview = (sid) => reviews.find(r => r.staff_id === sid && r.status !== "Completed");

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Staff", value: active, icon: UserCheck, color: "text-accent" },
          { label: "On Leave", value: onLeave, icon: Clock, color: "text-amber-500" },
          { label: "Leave Requests", value: pendingLeave, icon: Users, color: "text-primary" },
          { label: "Expiring Certs", value: expiringTraining, icon: UserX, color: "text-destructive" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${color}`} />
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Staff table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">All Employees</CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 w-48 text-sm" />
            </div>
            <Button size="sm" onClick={() => setShowOnboard(true)} className="gap-1">
              <Plus className="w-3.5 h-3.5" />New Employee
            </Button>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Hire Date</TableHead>
                <TableHead>Open Review</TableHead>
                <TableHead>Training</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => {
                const review = getStaffReview(s.id);
                const staffTrainings = getStaffTrainings(s.id);
                const expiring = staffTrainings.filter(t => t.status === "Expiring Soon").length;
                const expired = staffTrainings.filter(t => t.status === "Expired").length;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                    <TableCell className="text-sm">{s.role}</TableCell>
                    <TableCell className="text-sm">{s.employment_type || "—"}</TableCell>
                    <TableCell className="text-sm">{s.hire_date || "—"}</TableCell>
                    <TableCell>
                      {review ? (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">{review.review_type}</Badge>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {expired > 0 && <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 text-xs mr-1">{expired} expired</Badge>}
                      {expiring > 0 && <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">{expiring} expiring</Badge>}
                      {expired === 0 && expiring === 0 && <span className="text-xs text-muted-foreground">OK</span>}
                    </TableCell>
                    <TableCell><StatusBadge status={s.status || "Active"} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* New Employee Dialog */}
      <Dialog open={showOnboard} onOpenChange={setShowOnboard}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="w-4 h-4" />Onboard New Employee</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>First Name *</Label><Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} /></div>
              <div><Label>Last Name *</Label><Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} /></div>
            </div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Role *</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["DSP","Nurse","QIDP","Supervisor","Admin","Behavioral Specialist","Other"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Employment Type</Label>
                <Select value={form.employment_type} onValueChange={v => setForm(f => ({ ...f, employment_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full Time">Full Time</SelectItem>
                    <SelectItem value="Part Time">Part Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Hire Date</Label><Input type="date" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOnboard(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.first_name || !form.last_name || !form.role}>
              <Mail className="w-3.5 h-3.5 mr-1" />Create & Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}