import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUMMARY_CADENCES, SUPPORT_STRATEGY_TYPES } from "@/lib/serviceCompliance";

function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3">
      <Switch checked={!!checked} onCheckedChange={onChange} className="mt-0.5" />
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight text-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

export default function ServiceCodeComplianceFields({ form, setForm }) {
  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const strategyRequired = form.support_strategy_required !== false;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Summary cadence *</Label>
          <Select value={form.summary_cadence || ""} onValueChange={(v) => set({ summary_cadence: v })}>
            <SelectTrigger><SelectValue placeholder="Select cadence" /></SelectTrigger>
            <SelectContent>
              {SUMMARY_CADENCES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Support strategy type</Label>
          <Select
            value={strategyRequired ? form.support_strategy_type || "" : ""}
            onValueChange={(v) => set({ support_strategy_type: v })}
            disabled={!strategyRequired}
          >
            <SelectTrigger><SelectValue placeholder={strategyRequired ? "Select type" : "Not required"} /></SelectTrigger>
            <SelectContent>
              {SUPPORT_STRATEGY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <ToggleRow
          label="Support strategy required"
          hint="SOW 1.24(5)"
          checked={strategyRequired}
          onChange={(v) => set({ support_strategy_required: v, support_strategy_type: v ? form.support_strategy_type || "Standard" : null })}
        />
        <ToggleRow
          label="Goal progress in summary"
          hint="SOW 1.25(5)"
          checked={form.goal_progress_required_in_summary !== false}
          onChange={(v) => set({ goal_progress_required_in_summary: v })}
        />
        <ToggleRow
          label="Daily note required"
          hint="Session documentation each visit"
          checked={form.daily_note_required !== false}
          onChange={(v) => set({ daily_note_required: v })}
        />
        <ToggleRow
          label="EVV required"
          hint="SOW 1.12"
          checked={!!form.is_evv_required}
          onChange={(v) => set({ is_evv_required: v })}
        />
        <ToggleRow
          label="Annual report required"
          hint="Fiscal-year report"
          checked={!!form.annual_report_required}
          onChange={(v) => set({ annual_report_required: v })}
        />
        <ToggleRow
          label="Rule confirmed"
          hint="Off shows an amber badge in the grid"
          checked={form.rule_confirmed !== false}
          onChange={(v) => set({ rule_confirmed: v })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>State</Label>
          <Input value={form.state || ""} onChange={(e) => set({ state: e.target.value })} placeholder="UT" />
        </div>
        <div>
          <Label>Rule source</Label>
          <Input
            value={form.rule_source || ""}
            onChange={(e) => set({ rule_source: e.target.value })}
            placeholder="DHHS91172 SOW 1.25"
          />
        </div>
      </div>
    </div>
  );
}