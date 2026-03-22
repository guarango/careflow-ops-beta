import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import WeekNav from "@/components/schedule/WeekNav";
import ShiftCard from "@/components/schedule/ShiftCard";
import CreateShiftDialog from "@/components/schedule/CreateShiftDialog";
import DailyView from "@/components/schedule/DailyView";
import MonthlyView from "@/components/schedule/MonthlyView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Plus, Users, Clock, Calendar, Filter } from "lucide-react";
import { startOfWeek, addDays, format, isSameDay, parseISO } from "date-fns";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function calcHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 100) / 100);
}

export default function Schedule() {
  const [tab, setTab] = useState("week");
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showDialog, setShowDialog] = useState(false);
  const [dialogDate, setDialogDate] = useState("");

  // Filters
  const [filterStaff, setFilterStaff] = useState("all");
  const [filterCode, setFilterCode] = useState("all");

  const queryClient = useQueryClient();

  const { data: shifts = [] } = useQuery({ queryKey: ["shifts"], queryFn: () => base44.entities.ShiftSchedule.list("-date") });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });
  const { data: staffList = [] } = useQuery({ queryKey: ["staff"], queryFn: () => base44.entities.StaffMember.list() });
  const { data: serviceCodes = [] } = useQuery({ queryKey: ["service-codes"], queryFn: () => base44.entities.ServiceCode.list() });
  const { data: availabilities = [] } = useQuery({ queryKey: ["availabilities"], queryFn: () => base44.entities.StaffAvailability.list() });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShiftSchedule.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shifts"] }); queryClient.invalidateQueries({ queryKey: ["billing"] }); },
  });

  const createBillingMutation = useMutation({
    mutationFn: (data) => base44.entities.BillingRecord.create(data),
  });

  const handleStatusChange = async (shift, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === "Completed" && !shift.billing_created && shift.rate) {
      const hours = calcHours(shift.start_time, shift.end_time);
      let totalAmount = 0;
      if (shift.rate_type === "Hourly") totalAmount = hours * shift.rate;
      else if (shift.rate_type === "Daily") totalAmount = shift.rate;
      else if (shift.rate_type === "Per Unit") totalAmount = Math.ceil((hours * 60) / 15) * shift.rate;
      const billingRecord = await createBillingMutation.mutateAsync({
        client_id: shift.client_id, client_name: shift.client_name,
        service_type: shift.service_type || "Residential", date: shift.date, hours,
        rate: shift.rate, total_amount: totalAmount,
        insurance_provider: clients.find(c => c.id === shift.client_id)?.insurance_provider || "",
        status: "Pending",
        notes: `Auto-created from shift ${shift.id}. Service code: ${shift.service_code || "N/A"}`,
      });
      updates.billing_created = true;
      updates.billing_record_id = billingRecord?.id || "";
    }
    updateShiftMutation.mutate({ id: shift.id, data: updates });
  };

  // Apply filters to all shifts
  const filteredShifts = shifts.filter(s => {
    if (filterStaff !== "all" && s.staff_id !== filterStaff) return false;
    if (filterCode !== "all" && s.service_code !== filterCode && s.service_code_id !== filterCode) return false;
    return true;
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekShifts = filteredShifts.filter(s => s.date && weekDays.some(wd => isSameDay(parseISO(s.date), wd)));
  const activeClients = clients.filter(c => c.status === "Active");
  const uniqueCodes = [...new Set(shifts.map(s => s.service_code).filter(Boolean))];

  const openAddShift = (date) => { setDialogDate(date || ""); setShowDialog(true); };

  return (
    <div>
      <PageHeader
        title="Shift Scheduling"
        subtitle="Build schedules matching staff availability to client needs"
        action={<Button onClick={() => openAddShift("")}><Plus className="w-4 h-4 mr-2" />Create Shift</Button>}
      />

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center mb-4 p-3 bg-muted/40 rounded-lg border">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Staff:</span>
          <Select value={filterStaff} onValueChange={setFilterStaff}>
            <SelectTrigger className="h-7 text-xs w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {staffList.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Service Code:</span>
          <Select value={filterCode} onValueChange={setFilterCode}>
            <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Codes</SelectItem>
              {uniqueCodes.map(code => <SelectItem key={code} value={code}>{code}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {(filterStaff !== "all" || filterCode !== "all") && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setFilterStaff("all"); setFilterCode("all"); }}>Clear filters</Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="day"><CalendarDays className="w-4 h-4 mr-1.5" />Daily</TabsTrigger>
          <TabsTrigger value="week"><Calendar className="w-4 h-4 mr-1.5" />Weekly</TabsTrigger>
          <TabsTrigger value="month"><Calendar className="w-4 h-4 mr-1.5" />Monthly</TabsTrigger>
          <TabsTrigger value="needs"><Users className="w-4 h-4 mr-1.5" />Client Needs</TabsTrigger>
          <TabsTrigger value="availability"><Clock className="w-4 h-4 mr-1.5" />Staff Availability</TabsTrigger>
        </TabsList>

        {/* DAILY */}
        <TabsContent value="day">
          <DailyView
            selectedDay={selectedDay}
            onChange={setSelectedDay}
            shifts={filteredShifts}
            onStatusChange={handleStatusChange}
            onAddShift={() => openAddShift(format(selectedDay, "yyyy-MM-dd"))}
          />
        </TabsContent>

        {/* WEEKLY */}
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
                    {dayShifts.map(s => <ShiftCard key={s.id} shift={s} onStatusChange={handleStatusChange} />)}
                    <button
                      onClick={() => openAddShift(format(day, "yyyy-MM-dd"))}
                      className="w-full text-[10px] text-muted-foreground border border-dashed border-border rounded-lg py-1.5 hover:border-primary hover:text-primary transition-colors"
                    >+ Add</button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* MONTHLY */}
        <TabsContent value="month">
          <MonthlyView month={currentMonth} onChange={setCurrentMonth} shifts={filteredShifts} />
        </TabsContent>

        {/* CLIENT NEEDS */}
        <TabsContent value="needs">
          <div className="space-y-4">
            {activeClients.length === 0 ? (
              <EmptyState icon={Users} title="No active clients" description="Add clients to see their scheduling needs." />
            ) : activeClients.map(client => {
              const clientShifts = shifts.filter(s => s.client_id === client.id && s.status === "Scheduled");
              const enrollments = client.service_enrollments?.length > 0
                ? client.service_enrollments
                : client.service_type ? [{ service_type: client.service_type, service_code: client.service_code, schedule_days: client.schedule_days || [] }] : [];
              return (
                <Card key={client.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{client.first_name} {client.last_name}</CardTitle>
                      <Button size="sm" variant="outline" onClick={() => openAddShift("")}>
                        <Plus className="w-3.5 h-3.5 mr-1" />Schedule Shift
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3 space-y-3">
                    {enrollments.length === 0 && <p className="text-xs text-muted-foreground">No services enrolled.</p>}
                    {enrollments.map((enroll, ei) => {
                      const code = serviceCodes.find(sc => sc.id === enroll.service_code_id);
                      const serviceShifts = clientShifts.filter(s => s.service_type === enroll.service_type);
                      return (
                        <div key={ei} className="border border-border rounded-md p-3 space-y-2">
                          <div className="flex items-center gap-3 flex-wrap text-xs">
                            <span className="font-semibold">{enroll.service_type || "—"}</span>
                            {(code?.code || enroll.service_code) && <span className="font-mono text-primary">{code?.code || enroll.service_code}</span>}
                            {(enroll.rate || code?.rate) > 0 && <span className="text-muted-foreground">${enroll.rate || code?.rate}/{(enroll.rate_type || code?.rate_type) === "Hourly" ? "hr" : "day"}</span>}
                            {enroll.schedule_start_time && <span className="text-muted-foreground">{enroll.schedule_start_time}–{enroll.schedule_end_time}</span>}
                            <span className="text-muted-foreground ml-auto">{serviceShifts.length} shift(s) scheduled</span>
                          </div>
                          {enroll.schedule_days?.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {DAYS.map(day => {
                                if (!enroll.schedule_days?.includes(day)) return null;
                                const covered = serviceShifts.some(s => s.date && format(parseISO(s.date), "EEEE") === day);
                                return (
                                  <span key={day} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${covered ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                                    {day.slice(0, 3)} {covered ? "✓" : "!"}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* STAFF AVAILABILITY */}
        <TabsContent value="availability">
          <StaffAvailabilityTab staffList={staffList} availabilities={availabilities} queryClient={queryClient} />
        </TabsContent>
      </Tabs>

      <CreateShiftDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        initialDate={dialogDate}
        clients={clients}
        staffList={staffList}
        serviceCodes={serviceCodes}
        availabilities={availabilities}
      />
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

  const updateDayTime = (day, field, value) => setAvail(avail.map(a => a.day === day ? { ...a, [field]: value } : a));

  const handleSave = () => {
    const existing = availabilities.find(a => a.staff_id === editingStaff.id);
    const data = { staff_id: editingStaff.id, staff_name: `${editingStaff.first_name} ${editingStaff.last_name}`, availability: avail, max_hours_per_week: maxHours };
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
                <Button size="sm" variant="outline" onClick={() => openEdit(staff)}>{existing ? "Edit Availability" : "Set Availability"}</Button>
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
                  {existing.max_hours_per_week && <span className="text-xs text-muted-foreground self-center ml-2">Max {existing.max_hours_per_week}h/wk</span>}
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
                      <button onClick={() => toggleDay(day)}
                        className={`w-20 text-xs py-1.5 rounded-md border font-medium transition-colors ${slot ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary"}`}>
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