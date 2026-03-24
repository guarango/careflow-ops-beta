import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { format, parseISO, addWeeks } from "date-fns";
import { calcHours } from "./scheduleUtils";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const emptyShift = {
  client_id: "", client_name: "", staff_id: "", staff_name: "",
  service_code_id: "", service_code: "", service_type: "", rate_type: "Hourly", rate: 0,
  date: "", start_time: "", end_time: "", total_hours: 0,
  status: "Scheduled", billing_created: false, notes: "", location: "",
  recurring_series_id: "",
};

export default function NewCreateShiftDialog({ open, onClose, initialDate, clients, staffList, serviceCodes, editingShift }) {
  const [form, setForm] = useState({ ...emptyShift });
  const [recurring, setRecurring] = useState(false);
  const [recurDays, setRecurDays] = useState([]);
  const [recurFreq, setRecurFreq] = useState("weekly");
  const [recurEnd, setRecurEnd] = useState("");
  const [recurNoEnd, setRecurNoEnd] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      if (editingShift) {
        setForm({ ...emptyShift, ...editingShift });
      } else {
        setForm({ ...emptyShift, date: initialDate || "" });
      }
      setRecurring(false);
      setRecurDays([]);
      setRecurFreq("weekly");
      setRecurEnd("");
      setRecurNoEnd(false);
    }
  }, [open, initialDate, editingShift]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ShiftSchedule.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shifts"] }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShiftSchedule.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shifts"] }); onClose(); },
  });

  const selectedClient = clients.find(c => c.id === form.client_id);
  // Filter staff to those assigned to this client
  const assignedStaff = selectedClient
    ? staffList.filter(s => (s.assigned_client_ids || []).includes(form.client_id))
    : [];
  const noStaffAssigned = form.client_id && assignedStaff.length === 0;

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setForm(f => ({
      ...f, client_id: clientId,
      client_name: client ? `${client.first_name} ${client.last_name}` : "",
      location: client?.address || "",
      staff_id: "", staff_name: "",
    }));
  };

  const handleStaffSelect = (staffId) => {
    const s = staffList.find(st => st.id === staffId);
    setForm(f => ({ ...f, staff_id: staffId, staff_name: s ? `${s.first_name} ${s.last_name}` : "" }));
  };

  const handleServiceCodeSelect = (codeId) => {
    const code = serviceCodes.find(sc => sc.id === codeId);
    setForm(f => ({ ...f, service_code_id: codeId, service_code: code?.code || "", service_type: code?.service_type || "", rate_type: code?.rate_type || "Hourly", rate: code?.rate || 0 }));
  };

  const toggleRecurDay = (idx) => {
    setRecurDays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]);
  };

  const generateRecurDates = () => {
    if (!form.date) return [];
    const base = parseISO(form.date);
    const baseDayIdx = base.getDay();
    const selectedDays = recurDays.length > 0 ? recurDays : [baseDayIdx];
    const dates = [];
    const intervalWeeks = recurFreq === "biweekly" ? 2 : 1;
    const maxDate = !recurNoEnd && recurEnd ? new Date(recurEnd) : null;
    const maxIter = 200;
    for (let week = 0; week < maxIter; week++) {
      selectedDays.forEach(dayIdx => {
        const weekBase = addWeeks(base, week * intervalWeeks);
        const diff = (dayIdx - weekBase.getDay() + 7) % 7;
        const date = new Date(weekBase);
        date.setDate(date.getDate() + diff);
        if (week === 0 && diff === 0) return; // skip the original
        if (maxDate && date > maxDate) return;
        dates.push(format(date, "yyyy-MM-dd"));
      });
      if (!recurNoEnd && !recurEnd) break;
      if (maxDate && addWeeks(base, (week + 1) * intervalWeeks) > maxDate) break;
    }
    return [...new Set(dates)].sort();
  };

  const handleSave = async () => {
    const hours = calcHours(form.start_time, form.end_time);
    const baseShift = { ...form, total_hours: hours };
    if (editingShift) {
      updateMutation.mutate({ id: editingShift.id, data: baseShift });
      return;
    }
    const seriesId = recurring ? `series_${Date.now()}` : "";
    await createMutation.mutateAsync({ ...baseShift, recurring_series_id: seriesId });
    if (recurring) {
      const extraDates = generateRecurDates();
      for (const date of extraDates) {
        await createMutation.mutateAsync({ ...baseShift, date, recurring_series_id: seriesId });
      }
    }
    onClose();
  };

  const hours = calcHours(form.start_time, form.end_time);
  const isValid = form.client_id && form.staff_id && form.date && form.start_time && form.end_time && form.service_code_id;

  const recurSummary = () => {
    if (!form.start_time || !form.end_time || !form.date) return "";
    const dayNames = recurDays.map(i => DAYS_FULL[i]);
    const daysStr = dayNames.length > 0 ? dayNames.join(", ") : DAYS_FULL[parseISO(form.date).getDay()];
    const freqStr = recurFreq === "biweekly" ? "every two weeks on" : "every";
    const untilStr = recurNoEnd ? "indefinitely" : recurEnd ? `until ${format(new Date(recurEnd), "MMMM d, yyyy")}` : "";
    const timeStr = `from ${form.start_time} to ${form.end_time}`;
    return `This shift will repeat ${freqStr} ${daysStr} ${timeStr}${untilStr ? " " + untilStr : ""}.`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingShift ? "Edit Shift" : "Add Shift"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client */}
          <div>
            <Label>Client *</Label>
            <Select value={form.client_id} onValueChange={handleClientSelect}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.filter(c => c.status === "Active").map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Staff */}
          <div>
            <Label>Staff *</Label>
            {noStaffAssigned ? (
              <div className="flex gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-1">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                No staff assigned to this client. Assign staff first in the Staff profile.
              </div>
            ) : (
              <Select value={form.staff_id} onValueChange={handleStaffSelect} disabled={!form.client_id}>
                <SelectTrigger><SelectValue placeholder={form.client_id ? "Select staff" : "Select client first"} /></SelectTrigger>
                <SelectContent>
                  {(form.client_id ? assignedStaff : staffList).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Service Code */}
          <div>
            <Label>Service Code *</Label>
            <Select value={form.service_code_id} onValueChange={handleServiceCodeSelect}>
              <SelectTrigger><SelectValue placeholder="Select service code" /></SelectTrigger>
              <SelectContent>
                {serviceCodes.filter(sc => sc.active !== false).map(sc => (
                  <SelectItem key={sc.id} value={sc.id}>
                    {sc.code} — {sc.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date / Time */}
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><Label>Start Time *</Label><Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} /></div>
            <div><Label>End Time *</Label><Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} /></div>
          </div>

          {hours > 0 && (
            <div className="bg-muted/50 rounded-md px-3 py-2 text-sm text-muted-foreground">
              Duration: <span className="font-semibold text-foreground">{hours}h</span>
              {form.rate > 0 && form.rate_type === "Hourly" && (
                <span className="ml-3">Est. billing: <span className="font-semibold text-green-600">${(hours * form.rate).toFixed(2)}</span></span>
              )}
            </div>
          )}

          {/* Location */}
          <div>
            <Label>Location / Address</Label>
            <Input value={form.location || ""} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Auto-populated from client address" />
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>

          {/* Recurring */}
          {!editingShift && (
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold cursor-pointer" htmlFor="recurring-toggle">Make this a recurring shift</Label>
                <Switch id="recurring-toggle" checked={recurring} onCheckedChange={setRecurring} />
              </div>

              {recurring && (
                <div className="space-y-3">
                  {/* Day selector */}
                  <div>
                    <Label className="text-xs mb-1.5 block">Days of week</Label>
                    <div className="flex gap-1">
                      {DAYS_SHORT.map((d, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleRecurDay(i)}
                          className={cn(
                            "w-9 h-9 rounded-full text-xs font-medium border transition-colors",
                            recurDays.includes(i)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:border-primary"
                          )}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Frequency */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Repeat</Label>
                      <Select value={recurFreq} onValueChange={setRecurFreq}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">End date</Label>
                      <Input
                        type="date"
                        value={recurEnd}
                        onChange={e => setRecurEnd(e.target.value)}
                        disabled={recurNoEnd}
                        className="h-8 text-sm"
                        min={form.date}
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={recurNoEnd} onChange={e => setRecurNoEnd(e.target.checked)} className="rounded" />
                    No end date
                  </label>

                  {recurSummary() && (
                    <p className="text-xs text-primary font-medium bg-primary/5 rounded-md px-3 py-2">
                      {recurSummary()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!isValid || createMutation.isPending || updateMutation.isPending}>
            {editingShift ? "Save Changes" : "Create Shift"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}