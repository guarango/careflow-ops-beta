import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import WeekNav from "@/components/schedule/WeekNav";
import ShiftCard from "@/components/schedule/ShiftCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Plus, Users, Clock, AlertCircle } from "lucide-react";
import { startOfWeek, addDays, format, isSameDay, parseISO } from "date-fns";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const emptyShift = {
  client_id: "", client_name: "", staff_id: "", staff_name: "",
  service_code_id: "", service_code: "", service_type: "", rate_type: "Hourly", rate: 0,
  date: "", start_time: "", end_time: "", total_hours: 0,
  status: "Scheduled", billing_created: false, notes: ""
};

function calcHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 100) / 100);
}

export default function Schedule() {
  const [tab, setTab] = useState("week");
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyShift);

  const queryClient = useQueryClient();

  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts"],
    queryFn: () => base44.entities.ShiftSchedule.list("-date"),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: staffList = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.StaffMember.list(),
  });

  const { data: serviceCodes = [] } = useQuery({
    queryKey: ["service-codes"],
    queryFn: () => base44.entities.ServiceCode.list(),
  });

  const { data: availabilities = [] } = useQuery({
    queryKey: ["availabilities"],
    queryFn: () => base44.entities.StaffAvailability.list(),
  });

  const createShiftMutation = useMutation({
    mutationFn: (data) => base44.entities.ShiftSchedule.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shifts"] }); setShowDialog(false); setForm(emptyShift); },
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShiftSchedule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });

  const createBillingMutation = useMutation({
    mutationFn: (data) => base44.entities.BillingRecord.create(data),
  });

  const handleStatusChange = async (shift, newStatus) => {
    const updates = { status: newStatus };

    // Auto-create billing record when shift is completed
    if (newStatus === "Completed" && !shift.billing_created && shift.rate) {
      const hours = calcHours(shift.start_time, shift.end_time);
      let totalAmount = 0;
      if (shift.rate_type === "Hourly") totalAmount = hours * shift.rate;
      else if (shift.rate_type === "Daily") totalAmount = shift.rate;
      else if (shift.rate_type === "Per Unit") totalAmount = Math.ceil((hours * 60) / 15) * shift.rate;

      const billingRecord = await createBillingMutation.mutateAsync({
        client_id: shift.client_id,
        client_name: shift.client_name,
        service_type: shift.service_type || "Residential",
        date: shift.date,
        hours,
        rate: shift.rate,
        total_amount: totalAmount,
        insurance_provider: clients.find(c => c.id === shift.client_id)?.insurance_provider || "",
        status: "Pending",
        notes: `Auto-created from shift ${shift.id}. Service code: ${shift.service_code || "N/A"}`,
      });

      updates.billing_created = true;
      updates.billing_record_id = billingRecord?.id || "";
    }

    updateShiftMutation.mutate({ id: shift.id, data: updates });
  };

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    // Clear service selection — user must pick which enrollment
    setForm({
      ...form,
      client_id: clientId,
      client_name: client ? `${client.first_name} ${client.last_name}` : "",
      service_code_id: "",
      service_code: "",
      service_type: "",
      rate_type: "Hourly",
      rate: 0,
      _enrollment_index: null,
    });
  };

  const handleEnrollmentSelect = (idx) => {
    const client = clients.find(c => c.id === form.client_id);
    const enrollments = client?.service_enrollments || [];
    const enroll = enrollments[parseInt(idx)];
    if (!enroll) return;
    const code = serviceCodes.find(sc => sc.id === enroll.service_code_id);
    setForm({
      ...form,
      _enrollment_index: idx,
      service_code_id: enroll.service_code_id || "",
      service_code: enroll.service_code || code?.code || "",
      service_type: enroll.service_type || "",
      rate_type: enroll.rate_type || code?.rate_type || "Hourly",
      rate: enroll.rate || code?.rate || 0,
      // Pre-fill times from enrollment schedule
      start_time: form.start_time || enroll.schedule_start_time || "",
      end_time: form.end_time || enroll.schedule_end_time || "",
    });
  };

  const handleStaffSelect = (staffId) => {
    const s = staffList.find(st => st.id === staffId);
    setForm({ ...form, staff_id: staffId, staff_name: s ? `${s.first_name} ${s.last_name}` : "" });
  };

  const handleServiceCodeSelect = (codeId) => {
    const code = serviceCodes.find(sc => sc.id === codeId);
    setForm({ ...form, service_code_id: codeId, service_code: code?.code || "", service_type: code?.service_type || "", rate_type: code?.rate_type || "Hourly", rate: code?.rate || 0 });
  };

  const handleSave = () => {
    const hours = calcHours(form.start_time, form.end_time);
    createShiftMutation.mutate({ ...form, total_hours: hours });
  };

  // Get available staff for a given day
  const getAvailableStaff = (day) => {
    return staffList.filter(s => {
      const avail = availabilities.find(a => a.staff_id === s.id);
      if (!avail) return true; // no constraints = available
      return avail.availability?.some(slot => slot.day === day);
    });
  };

  // Week view: build 7-day grid
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const weekShifts = shifts.filter(s => {
    if (!s.date) return false;
    const d = parseISO(s.date);
    return weekDays.some(wd => isSameDay(wd, d));
  });

  // Client needs panel - clients with their scheduled days
  const activeClients = clients.filter(c => c.status === "Active");

  return (
    <div>
      <PageHeader
        title="Shift Scheduling"
        subtitle="Build schedules matching staff availability to client needs"
        action={<Button onClick={() => { setForm(emptyShift); setShowDialog(true); }}><Plus className="w-4 h-4 mr-2" />Create Shift</Button>}
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="week"><CalendarDays className="w-4 h-4 mr-1.5" />Weekly View</TabsTrigger>
          <TabsTrigger value="needs"><Users className="w-4 h-4 mr-1.5" />Client Needs</TabsTrigger>
          <TabsTrigger value="availability"><Clock className="w-4 h-4 mr-1.5" />Staff Availability</TabsTrigger>
        </TabsList>

        {/* WEEKLY SCHEDULE */}
        <TabsContent value="week">
          <div className="flex items-center justify-between mb-4">
            <WeekNav weekStart={weekStart} onChange={setWeekStart} />
            <div className="text-sm text-muted-foreground">{weekShifts.length} shifts this week</div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, i) => {
              const dayShifts = weekShifts.filter(s => s.date && isSameDay(parseISO(s.date), day));
              const isToday = isSameDay(day, new Date());
              return (
                <div key={i} className="min-w-0">
                  <div className={`text-center py-1.5 rounded-lg mb-2 ${isToday ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <p className="text-[10px] font-medium uppercase tracking-wider opacity-70">{format(day, "EEE")}</p>
                    <p className="text-sm font-bold">{format(day, "d")}</p>
                  </div>
                  <div className="space-y-1.5">
                    {dayShifts.map(s => (
                      <ShiftCard key={s.id} shift={s} onStatusChange={handleStatusChange} />
                    ))}
                    <button
                      onClick={() => { setForm({ ...emptyShift, date: format(day, "yyyy-MM-dd") }); setShowDialog(true); }}
                      className="w-full text-[10px] text-muted-foreground border border-dashed border-border rounded-lg py-1.5 hover:border-primary hover:text-primary transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* CLIENT NEEDS */}
        <TabsContent value="needs">
          <div className="space-y-4">
            {activeClients.length === 0 ? (
              <EmptyState icon={Users} title="No active clients" description="Add clients to see their scheduling needs." />
            ) : (
              activeClients.map(client => {
                const clientShifts = shifts.filter(s => s.client_id === client.id && s.status === "Scheduled");
                const code = serviceCodes.find(sc => sc.id === client.service_code_id);
                return (
                  <Card key={client.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{client.first_name} {client.last_name}</CardTitle>
                        <Button size="sm" variant="outline" onClick={() => { setForm({ ...emptyShift, client_id: client.id, client_name: `${client.first_name} ${client.last_name}`, service_code_id: code?.id || "", service_code: code?.code || client.service_code || "", service_type: code?.service_type || client.service_type || "", rate_type: code?.rate_type || "Hourly", rate: code?.rate || 0 }); setShowDialog(true); }}>
                          <Plus className="w-3.5 h-3.5 mr-1" />Schedule Shift
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                        <div><span className="text-muted-foreground">Service Type: </span><span className="font-medium">{client.service_type || "—"}</span></div>
                        <div><span className="text-muted-foreground">Service Code: </span><span className="font-mono font-medium text-primary">{code?.code || client.service_code || "—"}</span></div>
                        <div><span className="text-muted-foreground">Rate: </span><span className="font-medium">{code ? `$${code.rate}/${code.rate_type === "Hourly" ? "hr" : code.rate_type === "Daily" ? "day" : "unit"}` : "—"}</span></div>
                        <div><span className="text-muted-foreground">Needed Days: </span><span className="font-medium">{client.schedule_days?.join(", ") || "Not set"}</span></div>
                      </div>
                      {client.schedule_days?.length > 0 && (
                        <div className="flex gap-1 flex-wrap mb-2">
                          {DAYS.map(day => {
                            const needed = client.schedule_days?.includes(day);
                            const covered = clientShifts.some(s => {
                              if (!s.date) return false;
                              return format(parseISO(s.date), "EEEE") === day;
                            });
                            if (!needed) return null;
                            return (
                              <span key={day} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${covered ? "bg-accent/15 text-accent border-accent/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                                {day.slice(0, 3)} {covered ? "✓" : "!"}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {clientShifts.length > 0 && (
                        <p className="text-xs text-muted-foreground">{clientShifts.length} upcoming shift(s) scheduled</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* STAFF AVAILABILITY */}
        <TabsContent value="availability">
          <StaffAvailabilityTab staffList={staffList} availabilities={availabilities} queryClient={queryClient} />
        </TabsContent>
      </Tabs>

      {/* Create Shift Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Shift</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Client *</Label>
              <Select value={form.client_id} onValueChange={handleClientSelect}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {form.client_id && (() => {
              const client = clients.find(c => c.id === form.client_id);
              const enrollments = client?.service_enrollments || [];
              // Legacy support: single flat service
              const hasEnrollments = enrollments.length > 0;
              return (
                <div>
                  <Label>Service *</Label>
                  {hasEnrollments ? (
                    <Select value={form._enrollment_index?.toString() || ""} onValueChange={handleEnrollmentSelect}>
                      <SelectTrigger><SelectValue placeholder="Select which service this shift is for" /></SelectTrigger>
                      <SelectContent>
                        {enrollments.map((e, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {e.service_type || "Service"}{e.service_code ? ` — ${e.service_code}` : ""}{e.rate ? ` ($${e.rate}/${e.rate_type === "Hourly" ? "hr" : "day"})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select value={form.service_code_id} onValueChange={handleServiceCodeSelect}>
                      <SelectTrigger><SelectValue placeholder="Select service code" /></SelectTrigger>
                      <SelectContent>
                        {serviceCodes.filter(sc => sc.active).map(sc => (
                          <SelectItem key={sc.id} value={sc.id}>
                            <span className="font-mono">{sc.code}</span> — {sc.description} (${sc.rate}/{sc.rate_type === "Hourly" ? "hr" : "day"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {form.service_type && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium text-foreground">{form.service_type}</span>
                      {form.service_code && <span> · <span className="font-mono text-primary">{form.service_code}</span></span>}
                      {form.rate > 0 && <span> · <span className="font-semibold">${form.rate}/{form.rate_type === "Hourly" ? "hr" : "day"}</span></span>}
                    </p>
                  )}
                </div>
              );
            })()}

            <div>
              <Label>Staff *</Label>
              <Select value={form.staff_id} onValueChange={handleStaffSelect}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  {form.date ? (
                    (() => {
                      const dayName = format(parseISO(form.date), "EEEE");
                      const available = getAvailableStaff(dayName);
                      return available.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.role}</SelectItem>
                      ));
                    })()
                  ) : (
                    staffList.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.role}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
              {form.date && <p className="text-xs text-muted-foreground mt-1">Showing staff available on {format(parseISO(form.date), "EEEE")}</p>}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Start Time *</Label><Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
              <div><Label>End Time</Label><Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
            </div>

            {form.start_time && form.end_time && (
              <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                <span className="text-muted-foreground">Duration: </span>
                <span className="font-semibold">{calcHours(form.start_time, form.end_time)}h</span>
                {form.rate > 0 && (
                  <>
                    <span className="text-muted-foreground ml-3">Est. billing: </span>
                    <span className="font-semibold text-accent">
                      ${form.rate_type === "Hourly" ? (calcHours(form.start_time, form.end_time) * form.rate).toFixed(2) : form.rate_type === "Daily" ? form.rate.toFixed(2) : "—"}
                    </span>
                  </>
                )}
              </div>
            )}

            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.client_id || !form.staff_id || !form.date || !form.start_time}>Create Shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StaffAvailabilityTab({ staffList, availabilities, queryClient }) {
  const [editingStaff, setEditingStaff] = useState(null);
  const [avail, setAvail] = useState([]);
  const [maxHours, setMaxHours] = useState(40);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StaffAvailability.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["availabilities"] }); setEditingStaff(null); },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffAvailability.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["availabilities"] }); setEditingStaff(null); },
  });

  const openEdit = (staff) => {
    setEditingStaff(staff);
    const existing = availabilities.find(a => a.staff_id === staff.id);
    setAvail(existing?.availability || []);
    setMaxHours(existing?.max_hours_per_week || 40);
  };

  const toggleDay = (day) => {
    const has = avail.find(a => a.day === day);
    if (has) setAvail(avail.filter(a => a.day !== day));
    else setAvail([...avail, { day, start_time: "09:00", end_time: "17:00" }]);
  };

  const updateDayTime = (day, field, value) => {
    setAvail(avail.map(a => a.day === day ? { ...a, [field]: value } : a));
  };

  const handleSave = () => {
    const existing = availabilities.find(a => a.staff_id === editingStaff.id);
    const data = {
      staff_id: editingStaff.id,
      staff_name: `${editingStaff.first_name} ${editingStaff.last_name}`,
      availability: avail,
      max_hours_per_week: maxHours
    };
    if (existing) updateMutation.mutate({ id: existing.id, data });
    else createMutation.mutate(data);
  };

  return (
    <div className="space-y-4">
      {staffList.filter(s => s.status === "Active").map(staff => {
        const existing = availabilities.find(a => a.staff_id === staff.id);
        return (
          <Card key={staff.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">{staff.first_name} {staff.last_name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{staff.role}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => openEdit(staff)}>
                  {existing ? "Edit Availability" : "Set Availability"}
                </Button>
              </div>
            </CardHeader>
            {existing?.availability?.length > 0 && (
              <CardContent className="pb-3">
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map(day => {
                    const slot = existing.availability.find(a => a.day === day);
                    return slot ? (
                      <div key={day} className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-md px-2 py-1">
                        <span className="font-medium">{day.slice(0, 3)}</span> {slot.start_time}–{slot.end_time}
                      </div>
                    ) : null;
                  })}
                  {existing.max_hours_per_week && (
                    <span className="text-xs text-muted-foreground self-center ml-2">Max {existing.max_hours_per_week}h/wk</span>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      <Dialog open={!!editingStaff} onOpenChange={() => setEditingStaff(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Availability — {editingStaff?.first_name} {editingStaff?.last_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Max Hours / Week</Label>
              <Input type="number" value={maxHours} onChange={e => setMaxHours(parseInt(e.target.value) || 40)} className="w-32" />
            </div>
            <div>
              <Label className="mb-2 block">Available Days & Times</Label>
              <div className="space-y-2">
                {DAYS.map(day => {
                  const slot = avail.find(a => a.day === day);
                  return (
                    <div key={day} className="flex items-center gap-3">
                      <button
                        onClick={() => toggleDay(day)}
                        className={`w-20 text-xs py-1.5 rounded-md border font-medium transition-colors ${slot ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary"}`}
                      >
                        {day.slice(0, 3)}
                      </button>
                      {slot && (
                        <>
                          <Input type="time" value={slot.start_time} onChange={e => updateDayTime(day, "start_time", e.target.value)} className="h-7 text-xs w-28" />
                          <span className="text-xs text-muted-foreground">to</span>
                          <Input type="time" value={slot.end_time} onChange={e => updateDayTime(day, "end_time", e.target.value)} className="h-7 text-xs w-28" />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStaff(null)}>Cancel</Button>
            <Button onClick={handleSave}>Save Availability</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}