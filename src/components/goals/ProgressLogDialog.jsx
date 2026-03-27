import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PROMPT_LEVELS = ["Full Physical Assist", "Hand-Over-Hand", "Physical Prompt", "Gestural Prompt", "Verbal Prompt", "Indirect Verbal Cue", "Independent"];

export default function ProgressLogDialog({ goal, onClose, onSave }) {
  const [entry, setEntry] = useState({
    date: new Date().toISOString().split("T")[0],
    score: "",
    prompt_level: goal?.prompt_level_baseline || "",
    trials_correct: "",
    trials_total: "",
    setting: "",
    notes: "",
    recorded_by: "",
  });

  const e = entry;
  const set = (k, v) => setEntry(prev => ({ ...prev, [k]: v }));

  const handleSave = () => {
    const finalEntry = { ...e };
    // Auto-calculate score from trials if provided
    if (e.trials_correct !== "" && e.trials_total !== "") {
      const pct = Math.round((Number(e.trials_correct) / Number(e.trials_total)) * 100);
      finalEntry.score = `${e.trials_correct}/${e.trials_total} (${pct}%)`;
    }
    const updated = { ...goal, progress_entries: [...(goal.progress_entries || []), finalEntry] };
    onSave(updated);
    onClose();
  };

  const method = goal?.primary_measurement_method || "";
  const isTrialBased = ["Percentage of Trials", "Task Analysis Step Count", "Frequency Count"].includes(method);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Log Progress</DialogTitle>
          <p className="text-xs text-muted-foreground truncate">{goal?.goal_title}</p>
        </DialogHeader>

        {goal?.data_collection_instructions && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
            <p className="font-semibold mb-1">Data Collection Instructions:</p>
            <p>{goal.data_collection_instructions}</p>
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date *</Label>
              <Input type="date" value={e.date} onChange={el => set("date", el.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Setting / Location</Label>
              <Input value={e.setting} onChange={el => set("setting", el.target.value)} placeholder="e.g. Kitchen, Community" className="h-8 text-sm" />
            </div>
          </div>

          {isTrialBased ? (
            <div>
              <Label className="text-xs">Trials</Label>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} value={e.trials_correct} onChange={el => set("trials_correct", el.target.value)} placeholder="Correct" className="h-8 text-sm" />
                <span className="text-muted-foreground text-sm">/</span>
                <Input type="number" min={0} value={e.trials_total} onChange={el => set("trials_total", el.target.value)} placeholder="Total" className="h-8 text-sm" />
              </div>
              {e.trials_correct !== "" && e.trials_total !== "" && Number(e.trials_total) > 0 && (
                <p className="text-xs text-primary mt-1">= {Math.round((Number(e.trials_correct) / Number(e.trials_total)) * 100)}%</p>
              )}
              {goal?.minimum_trials_per_session && Number(e.trials_total) > 0 && Number(e.trials_total) < goal.minimum_trials_per_session && (
                <p className="text-xs text-amber-600 mt-1">⚠ Minimum {goal.minimum_trials_per_session} trials required for valid data.</p>
              )}
            </div>
          ) : (
            <div>
              <Label className="text-xs">Score / Result *</Label>
              <Input value={e.score} onChange={el => set("score", el.target.value)} placeholder="e.g. 4 occurrences, 12 minutes, Independent, Level 3" className="h-8 text-sm" />
            </div>
          )}

          {!isTrialBased && e.score === "" && <p className="text-[11px] text-muted-foreground -mt-2">Enter a score manually or use the trial fields above if applicable.</p>}

          <div>
            <Label className="text-xs">Prompt Level Used</Label>
            <Select value={e.prompt_level} onValueChange={v => set("prompt_level", v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{PROMPT_LEVELS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Recorded By</Label>
            <Input value={e.recorded_by} onChange={el => set("recorded_by", el.target.value)} placeholder="Your name" className="h-8 text-sm" />
          </div>

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={e.notes} onChange={el => set("notes", el.target.value)} rows={2} placeholder="Observations, behavior notes, anything relevant..." className="text-sm" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!e.date || (!e.score && e.trials_correct === "")}>
            Log Progress
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}