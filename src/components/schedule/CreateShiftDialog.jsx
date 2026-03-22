import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO, addDays, addWeeks, addMonths } from "date-fns";
import { Repeat } from "lucide-react";

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

function generateDates(startDate, recurrence, endDate) {
  if (!startDate) return [];
  const dates = [startDate];
  if (recurrence === "none" || !endDate) return dates;
  const end = new Date(endDate);
  let current = parseISO(startDate);
  for (let i = 0; i < 500; i++) {
    if (recurrence === "daily") current = addDays(current, 1);
    else if (recurrence === "weekly") current = addWeeks(current, 1);
    else if (recurrence === "biweekly") current = addWeeks(current, 2);
    else if (recurrence === "monthly") current = addMonths(current, 1);
    if (current > end) break;
    dates.push(format(current, "yyyy-MM-dd"));
  }
  return dates;
}

export default function CreateShiftDialog({ open, onClose, initialDate, clients, staffList, serviceCodes, availabilities }) {
  const [form, setForm] = useState({ ...emptyShift, date: initialDate || "" });
  const [recurrence, setRecurrence] = useState("none");
  const [recurrenceEnd, setRecurrenceEnd] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setForm({ ...emptyShift, date: initialDate || "" });
      setRecurrence("none");
      setRecurrenceEnd("");
    }
  }, [open, initialDate]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ShiftSchedule.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shifts"] }),
  });

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setForm({ ...form, client_id: clientId, client_name: client ? `${client.first_name} ${client.last_name}` : "", service_code_id: "", service_code: "", service_type: "", rate_type: "Hourly", rate: 0, _ei: null });
  };

  const handleEnrollmentSelect = (idx) => {
    const client = clients.find(c => c.id === form.client_id);
    const enroll = client?.service_enrollments?.[parseInt(idx)];
    if (!enroll) return;
    const code = serviceCodes.find(sc => sc.id === enroll.service_code_id);
    setForm({
      ...form, _ei: idx,
      service_code_id: enroll.service_code_id || "",
      service_code: enroll.service_code || code?.code || "",
      service_type: enroll.service_type || "",
      rate_type: enroll.rate_type || code?.rate_type || "Hourly",
      rate: enroll.rate || code?.rate || 0,
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

  const getAvailableStaff = (dayName) => staffList.filter(s => {
    const avail = availabilities.find(a => a.staff_id === s.id);
    if (!avail) return true;
    return avail.availability?.some(slot => slot.day === dayName);
  });

  const handleSave = async () => {
    const hours = calcHours(form.start_time, form.end_time);
    const { _ei, ...baseShift } = form;
    baseShift.total_hours = hours;
    const dates = generateDates(form.date, recurrence, recurrenceEnd);
    for (const date of dates) {
      await createMutation.mutateAsync({ ...baseShift, date });
    }
    onClose();
  };

  const selectedClient = clients.find(c => c.id === form.client_id);
  const enrollments = selectedClient?.service_enrollments || [];
  const hours = calcHours(form.start_time, form.end_time);
  const dayName = form.date ? format(parseISO(form.date), "EEEE") : null;
  const availableStaff = dayName ? getAvailableStaff(dayName) : staffList;
  const dates = generateDates(form.date, recurrence, recurrenceEnd);
  const isValid = form.client_id && form.staff_id && form.date && form.start_time && (recurrence === "none" || recurrenceEnd);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Shift</DialogTitle></DialogHeader>
        <div className="space-y-4">

          <div>
            <Label>Client *</Label>
            <Select value={form.client_id} onValueChange={handleClientSelect}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {form.client_id && (
            <div>
              <Label>Service *</Label>
              {enrollments.length > 0 ? (
                <Select value={form._ei?.toString() || ""} onValueChange={handleEnrollmentSelect}>
                  <SelectTrigger><SelectValue placeholder="Select service for this shift" /></SelectTrigger>
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
                      <SelectItem key={sc.id} value={sc.id}>{sc.code} — {sc.description} (${sc.rate}/{sc.rate_type === "Hourly" ? "hr" : "day"})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {form.service_type && (
                <p className="text-xs text-muted-foreground mt-1">
                  {form.service_type}{form.service_code && <span> · <span className="font-mono text-primary">{form.service_code}</span></span>}
                  {form.rate > 0 && <span> · <span className="font-semibold">${form.rate}/{form.rate_type === "Hourly" ? "hr" : "day"}</span></span>}
                </p>
              )}
            </div>
          )}

          <div>
            <Label>Staff *</Label>
            <Select value={form.staff_id} onValueChange={handleStaffSelect}>
              <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
              <SelectContent>{availableStaff.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.role}</SelectItem>)}</SelectContent>
            </Select>
            {dayName && <p className="text-xs text-muted-foreground mt-1">Showing staff available on {dayName}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div><Label>Start Time *</Label><Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
            <div><Label>End Time</Label><Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
          </div>

          {form.start_time && form.end_time && (
            <div className="bg-muted rounded-lg px-3 py-2 text-sm flex gap-4">
              <span><span className="text-muted-foreground">Duration: </span><span className="font-semibold">{hours}h</span></span>
              {form.rate > 0 && form.rate_type === "Hourly" && <span><span className="text-muted-foreground">Est. billing: </span><span className="font-semibold text-green-600">${(hours * form.rate).toFixed(2)}</span></span>}
              {form.rate > 0 && form.rate_type === "Daily" && <span><span className="text-muted-foreground">Est. billing: </span><span className="font-semibold text-green-600">${form.rate.toFixed(2)}</span></span>}
            </div>
          )}

          {/* Recurrence */}
          <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/20">
            <div className="flex items-center gap-2 mb-1">
              <Repeat className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Recurrence</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Repeat</Label>
                <Select value={recurrence} onValueChange={setRecurrence}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Does not repeat</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {recurrence !== "none" && (
                <div>
                  <Label className="text-xs">End Date *</Label>
                  <Input type="date" value={recurrenceEnd} min={form.date} onChange={e => setRecurrenceEnd(e.target.value)} className="h-8 text-sm" />
                </div>
              )}
            </div>
            {recurrence !== "none" && recurrenceEnd && form.date && (
              <p className="text-xs text-primary font-medium">{dates.length} shifts will be created</p>
            )}
          </div>

          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {recurrence !== "none" && dates.length > 1 ? `Create ${dates.length} Shifts` : "Create Shift"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}