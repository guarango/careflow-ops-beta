import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, BookOpen, Star, Plus, Clock } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";

const leaveTypes = ["PTO", "Sick Leave", "FMLA", "Leave of Absence", "Holiday", "Bereavement", "Other"];

const statusColors = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-green-50 text-green-700 border-green-200",
  Denied: "bg-red-50 text-red-700 border-red-200",
  Cancelled: "bg-gray-50 text-gray-600 border-gray-200",
};

export default function HRSelfService({ staff, leaveRequests, trainings, reviews }) {
  const { user } = useAuth();
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leave_type: "PTO", start_date: "", end_date: "", notes: "" });
  const queryClient = useQueryClient();

  // Find own staff record
  const myStaff = staff.find(s => s.email === user?.email);
  const myLeave = leaveRequests.filter(l => l.staff_id === myStaff?.id);
  const myTrainings = trainings.filter(t => t.staff_id === myStaff?.id);
  const myReviews = reviews.filter(r => r.staff_id === myStaff?.id);

  const createLeaveMutation = useMutation({
    mutationFn: (data) => base44.entities.LeaveRequest.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["leave-requests"] }); setShowLeaveDialog(false); setLeaveForm({ leave_type: "PTO", start_date: "", end_date: "", notes: "" }); },
  });

  const handleSubmitLeave = () => {
    if (!myStaff) return;
    const days = Math.max(0, differenceInCalendarDays(new Date(leaveForm.end_date), new Date(leaveForm.start_date)) + 1);
    createLeaveMutation.mutate({
      staff_id: myStaff.id,
      staff_name: `${myStaff.first_name} ${myStaff.last_name}`,
      ...leaveForm,
      total_days: days,
    });
  };

  const trainingAlerts = myTrainings.filter(t => t.status === "Expiring Soon" || t.status === "Expired");

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold flex items-center gap-2"><User className="w-5 h-5" />My Employee Portal</h2>

      {/* Profile card */}
      {myStaff && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                {myStaff.first_name?.[0]}{myStaff.last_name?.[0]}
              </div>
              <div>
                <p className="font-semibold text-lg">{myStaff.first_name} {myStaff.last_name}</p>
                <p className="text-sm text-muted-foreground">{myStaff.role} · {myStaff.employment_type || "—"}</p>
                <p className="text-xs text-muted-foreground">Hire date: {myStaff.hire_date || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Training alerts */}
      {trainingAlerts.length > 0 && (
        <div className="space-y-2">
          {trainingAlerts.map(t => (
            <div key={t.id} className={`p-3 rounded-lg border text-sm flex items-center gap-3 ${t.status === "Expired" ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
              <BookOpen className="w-4 h-4 flex-shrink-0" />
              <span><strong>{t.training_name}</strong> is {t.status.toLowerCase()}{t.expiry_date && ` (${t.expiry_date})`}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <Calendar className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{myLeave.filter(l => l.status === "Approved").reduce((sum, l) => sum + (l.total_days || 0), 0)}</p>
            <p className="text-xs text-muted-foreground">Days Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <BookOpen className="w-5 h-5 mx-auto text-accent mb-1" />
            <p className="text-2xl font-bold">{myTrainings.filter(t => t.status === "Current").length}</p>
            <p className="text-xs text-muted-foreground">Current Certs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <Star className="w-5 h-5 mx-auto text-chart-4 mb-1" />
            <p className="text-2xl font-bold">{myReviews.filter(r => r.status === "Completed" || r.status === "Signed").length}</p>
            <p className="text-xs text-muted-foreground">Reviews Done</p>
          </CardContent>
        </Card>
      </div>

      {/* Time Off */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4" />My Time Off Requests</CardTitle>
          <Button size="sm" onClick={() => setShowLeaveDialog(true)} className="gap-1">
            <Plus className="w-3 h-3" />Request Time Off
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {myLeave.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No requests yet</p>}
          {myLeave.map(l => (
            <div key={l.id} className="flex items-center justify-between py-2 px-3 rounded-lg border border-border bg-muted/30">
              <div>
                <p className="text-sm font-medium">{l.leave_type}</p>
                <p className="text-xs text-muted-foreground">{l.start_date} – {l.end_date} · {l.total_days || "?"}d</p>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[l.status] || ""}`}>{l.status}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Training summary */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4" />My Training & Certifications</CardTitle></CardHeader>
        <CardContent className="space-y-2 pt-0">
          {myTrainings.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No training records</p>}
          {myTrainings.map(t => (
            <div key={t.id} className="flex items-center justify-between py-2 px-3 rounded-lg border border-border bg-muted/30">
              <div>
                <p className="text-sm font-medium">{t.training_name}</p>
                <p className="text-xs text-muted-foreground">{t.training_category} · Expires: {t.expiry_date || "N/A"}</p>
              </div>
              <Badge variant="outline" className={`text-xs ${t.status === "Current" ? "text-accent border-accent/30 bg-accent/10" : t.status === "Expired" ? "text-destructive border-destructive/30 bg-destructive/10" : "text-amber-600 border-amber-300 bg-amber-50"}`}>
                {t.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Request Time Off</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Leave Type *</Label>
              <Select value={leaveForm.leave_type} onValueChange={v => setLeaveForm(f => ({ ...f, leave_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{leaveTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start *</Label><Input type="date" value={leaveForm.start_date} onChange={e => setLeaveForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><Label>End *</Label><Input type="date" value={leaveForm.end_date} onChange={e => setLeaveForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={leaveForm.notes} onChange={e => setLeaveForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitLeave} disabled={!leaveForm.start_date || !leaveForm.end_date || !myStaff}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}