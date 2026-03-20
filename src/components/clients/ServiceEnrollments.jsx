import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

const SERVICE_TYPES = ["Residential", "Day Program", "Community Living", "Respite", "Supported Employment"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const emptyEnrollment = {
  service_type: "",
  service_code_id: "",
  service_code: "",
  rate: 0,
  rate_type: "Hourly",
  schedule_days: [],
  schedule_start_time: "",
  schedule_end_time: "",
};

export default function ServiceEnrollments({ enrollments = [], onChange, serviceCodes = [] }) {
  const add = () => onChange([...enrollments, { ...emptyEnrollment }]);

  const update = (i, field, value) => {
    const updated = enrollments.map((e, idx) => idx === i ? { ...e, [field]: value } : e);
    onChange(updated);
  };

  const remove = (i) => onChange(enrollments.filter((_, idx) => idx !== i));

  const toggleDay = (i, day) => {
    const days = enrollments[i].schedule_days || [];
    update(i, "schedule_days", days.includes(day) ? days.filter(d => d !== day) : [...days, day]);
  };

  const selectCode = (i, codeId) => {
    const code = serviceCodes.find(sc => sc.id === codeId);
    const updated = enrollments.map((e, idx) => idx === i ? {
      ...e,
      service_code_id: codeId,
      service_code: code?.code || "",
      rate: code?.rate || 0,
      rate_type: code?.rate_type || "Hourly",
      service_type: e.service_type || code?.service_type || "",
    } : e);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Service Enrollments</Label>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="w-3.5 h-3.5 mr-1" />Add Service
        </Button>
      </div>

      {enrollments.length === 0 && (
        <p className="text-xs text-muted-foreground border border-dashed border-border rounded-lg py-4 text-center">
          No services added. Click "Add Service" to enroll this client in a service.
        </p>
      )}

      {enrollments.map((enroll, i) => (
        <div key={i} className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service {i + 1}</span>
            <Button type="button" variant="ghost" size="sm" className="text-destructive h-7 px-2" onClick={() => remove(i)}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />Remove
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Service Type</Label>
              <Select value={enroll.service_type} onValueChange={v => update(i, "service_type", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{SERVICE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Service Code</Label>
              <Select value={enroll.service_code_id} onValueChange={v => selectCode(i, v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Link code" /></SelectTrigger>
                <SelectContent>
                  {serviceCodes.map(sc => (
                    <SelectItem key={sc.id} value={sc.id}>
                      <span className="font-mono">{sc.code}</span> — ${sc.rate}/{sc.rate_type === "Hourly" ? "hr" : sc.rate_type === "Daily" ? "day" : "unit"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Start Time</Label>
              <Input type="time" value={enroll.schedule_start_time} onChange={e => update(i, "schedule_start_time", e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">End Time</Label>
              <Input type="time" value={enroll.schedule_end_time} onChange={e => update(i, "schedule_end_time", e.target.value)} className="h-8 text-sm" />
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block">Days Needing Service</Label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map(day => (
                <button key={day} type="button" onClick={() => toggleDay(i, day)}
                  className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-colors ${(enroll.schedule_days || []).includes(day) ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary"}`}>
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}