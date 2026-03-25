import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Plus, Search, CheckCircle, XCircle, MapPin, AlertCircle } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import EVVCapturePanel from "@/components/evv/EVVCapturePanel";

const tcStatuses = ["Pending", "Approved", "Rejected"];

const emptyTC = { staff_id: "", staff_name: "", date: "", clock_in: "", clock_out: "", total_hours: 0, break_minutes: 0, status: "Pending", notes: "", evv_location_in: null, evv_location_out: null, service_code_id: "", service_type: "" };

export default function Timecards() {
  const { can } = useRole();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyTC);
  const [search, setSearch] = useState("");
  const [evvError, setEvvError] = useState(null);

  const queryClient = useQueryClient();
  const { data: timecards = [], isLoading } = useQuery({
    queryKey: ["timecards"],
    queryFn: () => base44.entities.Timecard.list("-created_date"),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.StaffMember.list(),
  });

  const { data: serviceCodes = [] } = useQuery({
    queryKey: ["service-codes"],
    queryFn: () => base44.entities.ServiceCode.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Timecard.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["timecards"] }); setShowDialog(false); setForm(emptyTC); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Timecard.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timecards"] }),
  });

  const handleStaffSelect = (staffId) => {
    const s = staff.find(st => st.id === staffId);
    setForm({ ...form, staff_id: staffId, staff_name: s ? `${s.first_name} ${s.last_name}` : "" });
  };

  const calcHours = () => {
    if (form.clock_in && form.clock_out) {
      const [inH, inM] = form.clock_in.split(":").map(Number);
      const [outH, outM] = form.clock_out.split(":").map(Number);
      const diff = (outH * 60 + outM - inH * 60 - inM - (form.break_minutes || 0)) / 60;
      return Math.max(0, Math.round(diff * 100) / 100);
    }
    return 0;
  };

  const selectedCode = serviceCodes.find(c => c.id === form.service_code_id);
  const evvRequired = selectedCode?.evv_required;

  const handleSave = () => {
    setEvvError(null);
    if (evvRequired) {
      const missing = [];
      if (!form.evv_location_in) missing.push("Clock-In GPS Location");
      if (!form.evv_location_out) missing.push("Clock-Out GPS Location");
      if (!form.service_type) missing.push("Service Type");
      if (!form.staff_id) missing.push("Provider Identity");
      if (!form.date) missing.push("Date of Service");
      if (!form.clock_in || !form.clock_out) missing.push("Start/End Time");
      if (missing.length > 0) {
        setEvvError(`Missing required EVV data: ${missing.join(", ")}`);
        return;
      }
    }
    const hours = calcHours();
    createMutation.mutate({ ...form, total_hours: hours });
  };

  const filtered = timecards.filter(t =>
    `${t.staff_name} ${t.date} ${t.status}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Timecards" subtitle={`${timecards.length} entries`} action={<Button onClick={() => { setForm(emptyTC); setShowDialog(true); }}><Plus className="w-4 h-4 mr-2" />New Entry</Button>} />

      <Card className="mb-6">
        <CardContent className="py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search timecards..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 border-0 bg-transparent focus-visible:ring-0" />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState icon={Clock} title="No timecards" description="Create your first timecard entry." action={<Button onClick={() => setShowDialog(true)} size="sm"><Plus className="w-4 h-4 mr-1" />New Entry</Button>} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>In</TableHead>
                  <TableHead>Out</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.staff_name || "—"}</TableCell>
                    <TableCell className="text-sm">{t.date}</TableCell>
                    <TableCell className="text-sm">{t.clock_in}</TableCell>
                    <TableCell className="text-sm">{t.clock_out || "—"}</TableCell>
                    <TableCell className="font-semibold">{t.total_hours ? `${t.total_hours}h` : "—"}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell>
                      {can("approveTimecards") && t.status === "Pending" && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-accent" onClick={() => updateMutation.mutate({ id: t.id, data: { status: "Approved" } })}>
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => updateMutation.mutate({ id: t.id, data: { status: "Rejected" } })}>
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
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
          <DialogHeader><DialogTitle>New Timecard Entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Staff Member *</Label>
              <Select value={form.staff_id} onValueChange={handleStaffSelect}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date *</Label><Input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Clock In *</Label><Input type="time" value={form.clock_in} onChange={(e) => setForm({...form, clock_in: e.target.value})} /></div>
              <div><Label>Clock Out</Label><Input type="time" value={form.clock_out} onChange={(e) => setForm({...form, clock_out: e.target.value})} /></div>
            </div>
            <div>
              <Label>Service Code</Label>
              <Select value={form.service_code_id} onValueChange={v => { const c = serviceCodes.find(x => x.id === v); setForm({...form, service_code_id: v, service_type: c?.service_type || ""}); }}>
                <SelectTrigger><SelectValue placeholder="Select service code" /></SelectTrigger>
                <SelectContent>{serviceCodes.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.description}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Break (minutes)</Label><Input type="number" value={form.break_minutes} onChange={(e) => setForm({...form, break_minutes: parseInt(e.target.value) || 0})} /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} /></div>
            {evvRequired && (
              <EVVCapturePanel
                capturedIn={form.evv_location_in}
                capturedOut={form.evv_location_out}
                onCapture={(type, data) => setForm(f => type === "in" ? { ...f, evv_location_in: data } : { ...f, evv_location_out: data })}
                required={true}
              />
            )}
            {evvError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{evvError}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.staff_id || !form.date || !form.clock_in}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}