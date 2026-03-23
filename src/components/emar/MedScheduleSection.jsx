import React, { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const DAYS = ["Su", "M", "Tu", "W", "Th", "F", "Sa"];
const DAY_KEYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const FREQ_OPTIONS = [
  { label: "Once daily", value: "Once daily", times: ["08:00"] },
  { label: "Twice daily (BID)", value: "Twice daily", times: ["08:00", "20:00"] },
  { label: "Three times daily (TID)", value: "Three times daily", times: ["08:00", "12:00", "20:00"] },
  { label: "Four times daily (QID)", value: "Four times daily", times: ["08:00", "12:00", "16:00", "20:00"] },
  { label: "Every morning", value: "Every morning", times: ["08:00"] },
  { label: "Every evening", value: "Every evening", times: ["18:00"] },
  { label: "Bedtime (QHS)", value: "Every night at bedtime", times: ["21:00"] },
  { label: "With meals", value: "With meals", times: ["08:00", "12:00", "18:00"] },
  { label: "As needed (PRN)", value: "As needed", times: [] },
  { label: "Custom", value: "Custom schedule", times: [] },
];

export default function MedScheduleSection({ form, setForm }) {
  const selectedFreq = FREQ_OPTIONS.find(f => f.value === form.frequency);

  // When frequency changes, auto-populate times
  useEffect(() => {
    if (selectedFreq && selectedFreq.times.length > 0) {
      setForm(f => ({ ...f, scheduled_times: [...selectedFreq.times] }));
    }
  }, [form.frequency]);

  // Default all days selected
  const scheduleDays = form.schedule_days || DAY_KEYS;

  const toggleDay = (day) => {
    const current = form.schedule_days || DAY_KEYS;
    const next = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day];
    setForm(f => ({ ...f, schedule_days: next }));
  };

  const updateTime = (i, val) => {
    const times = [...(form.scheduled_times || [])];
    times[i] = val;
    setForm(f => ({ ...f, scheduled_times: times }));
  };

  const addTime = () => {
    setForm(f => ({ ...f, scheduled_times: [...(f.scheduled_times || []), "08:00"] }));
  };

  const removeTime = (i) => {
    const times = [...(form.scheduled_times || [])];
    times.splice(i, 1);
    setForm(f => ({ ...f, scheduled_times: times }));
  };

  return (
    <div className="border-t pt-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Schedule</h3>

      {/* Frequency buttons */}
      <div>
        <Label className="text-xs mb-2 block">Frequency *</Label>
        <div className="flex flex-wrap gap-2">
          {FREQ_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setForm(f => ({ ...f, frequency: opt.value }))}
              className={cn(
                "text-xs px-2.5 py-1.5 rounded-md border font-medium transition-colors",
                form.frequency === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border hover:border-primary"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time slots */}
      {(form.frequency && form.frequency !== "As needed") && (
        <div>
          <Label className="text-xs mb-2 block">Time Slots</Label>
          <div className="flex flex-wrap gap-2 items-center">
            {(form.scheduled_times || []).map((t, i) => (
              <div key={i} className="flex items-center gap-1">
                <Input
                  type="time"
                  value={t}
                  onChange={e => updateTime(i, e.target.value)}
                  className="h-8 w-28 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeTime(i)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >✕</button>
              </div>
            ))}
            <button
              type="button"
              onClick={addTime}
              className="text-xs text-primary hover:underline"
            >+ Add time</button>
          </div>
        </div>
      )}

      {/* Days of week */}
      <div>
        <Label className="text-xs mb-2 block">Days of Week</Label>
        <div className="flex gap-1.5">
          {DAYS.map((d, i) => {
            const dayKey = DAY_KEYS[i];
            const selected = scheduleDays.includes(dayKey);
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(dayKey)}
                className={cn(
                  "w-9 h-9 rounded-full text-xs font-semibold border transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border hover:border-primary"
                )}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* Prescriber + Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Prescriber</Label>
          <Input value={form.prescriber || ""} onChange={e => setForm(f => ({ ...f, prescriber: e.target.value }))} className="h-8 text-sm mt-1" />
        </div>
        <div>
          <Label className="text-xs">Pharmacy</Label>
          <Input value={form.pharmacy || ""} onChange={e => setForm(f => ({ ...f, pharmacy: e.target.value }))} className="h-8 text-sm mt-1" />
        </div>
        <div>
          <Label className="text-xs">Start Date</Label>
          <Input type="date" value={form.start_date || ""} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="h-8 text-sm mt-1" />
        </div>
        <div>
          <Label className="text-xs">End Date <span className="text-muted-foreground">(optional)</span></Label>
          <Input type="date" value={form.end_date || ""} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="h-8 text-sm mt-1" />
        </div>
      </div>

      {/* Special instructions */}
      <div>
        <Label className="text-xs">Special Instructions</Label>
        <Textarea
          value={form.instructions || ""}
          onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
          placeholder="e.g. Give with food, Crush tablet, Monitor for drowsiness"
          rows={2}
          className="text-sm mt-1"
        />
      </div>
    </div>
  );
}