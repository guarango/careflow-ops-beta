import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";

export default function BSPReinforcementEditor({ reinforcement: r, onChange }) {
  const set = (k, v) => onChange({ ...r, [k]: v });

  const addReinforcer = () => set("identified_reinforcers", [...(r.identified_reinforcers || []), ""]);
  const updateReinforcer = (i, v) => {
    const arr = [...(r.identified_reinforcers || [])];
    arr[i] = v;
    set("identified_reinforcers", arr);
  };
  const removeReinforcer = (i) => set("identified_reinforcers", (r.identified_reinforcers || []).filter((_, idx) => idx !== i));

  const addLogEntry = () => set("reinforcer_log", [...(r.reinforcer_log || []), { reinforcer: "", last_used: new Date().toISOString().split("T")[0], days_in_use: 1, effectiveness_rating: 3, notes: "" }]);
  const updateLog = (i, k, v) => {
    const arr = [...(r.reinforcer_log || [])];
    arr[i] = { ...arr[i], [k]: v };
    set("reinforcer_log", arr);
  };

  const getSaturationWarning = (entry) => {
    if (!entry.last_used) return false;
    const days = entry.days_in_use || 0;
    return days >= 30;
  };

  return (
    <div className="space-y-6">
      {/* Identified Reinforcers */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <Label>Identified Reinforcers</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Based on observed preferences — not assumptions. Include items, activities, social, and sensory reinforcers.</p>
          </div>
          <button type="button" onClick={addReinforcer} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" />Add
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(r.identified_reinforcers || []).map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input value={item} onChange={e => updateReinforcer(i, e.target.value)} placeholder="Reinforcer name or description..." className="text-sm h-8" />
              <button type="button" onClick={() => removeReinforcer(i)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Assessment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Assessment Date</Label>
          <Input type="date" value={r.assessment_date || ""} onChange={e => set("assessment_date", e.target.value)} />
        </div>
        <div>
          <Label>Assessment Method</Label>
          <Input value={r.assessment_method || ""} onChange={e => set("assessment_method", e.target.value)} placeholder='e.g., "Multiple Stimulus Without Replacement"' />
        </div>
      </div>

      {/* Reinforcer Rotation Log */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <Label>Reinforcer Rotation Log</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Track which reinforcers are in use to prevent satiation. You'll be prompted if one has been used 30+ consecutive days.</p>
          </div>
          <button type="button" onClick={addLogEntry} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" />Add entry
          </button>
        </div>

        <div className="space-y-2">
          {(r.reinforcer_log || []).map((entry, i) => {
            const saturation = getSaturationWarning(entry);
            return (
              <div key={i} className={cn("border rounded-xl p-3 space-y-2", saturation ? "border-amber-300 bg-amber-50" : "border-border bg-white")}>
                {saturation && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Satiation risk — this reinforcer has been used for {entry.days_in_use}+ days. Consider rotating.
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[10px] text-muted-foreground">Reinforcer</label>
                    <Input value={entry.reinforcer} onChange={e => updateLog(i, "reinforcer", e.target.value)} placeholder="Name..." className="text-xs h-7 mt-0.5" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Last Used</label>
                    <Input type="date" value={entry.last_used} onChange={e => updateLog(i, "last_used", e.target.value)} className="text-xs h-7 mt-0.5" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Days in Use</label>
                    <Input type="number" value={entry.days_in_use} onChange={e => updateLog(i, "days_in_use", Number(e.target.value))} className="text-xs h-7 mt-0.5" min={0} />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Effectiveness (1–5)</label>
                    <div className="flex gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} type="button" onClick={() => updateLog(i, "effectiveness_rating", n)}
                          className={cn("w-6 h-6 rounded text-[10px] font-bold border transition-all",
                            (entry.effectiveness_rating || 0) >= n ? "bg-primary text-primary-foreground border-primary" : "bg-white border-border text-muted-foreground"
                          )}>{n}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input value={entry.notes || ""} onChange={e => updateLog(i, "notes", e.target.value)} placeholder="Notes on how person responded..." className="text-xs h-7 flex-1" />
                  <button type="button" onClick={() => set("reinforcer_log", (r.reinforcer_log || []).filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}