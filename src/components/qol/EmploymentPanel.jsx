import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Briefcase, CheckCircle2, TrendingUp } from "lucide-react";
import { EMPLOYMENT_STATUS_LABELS } from "@/lib/qolEngine";
import { cn } from "@/lib/utils";

const EMP_STATUSES = Object.keys(EMPLOYMENT_STATUS_LABELS);
const COACH_LEVELS = ["Intensive (daily)", "Moderate (weekly)", "Fading (monthly)", "Natural Supports Only", "None"];

export default function EmploymentPanel({ client, employment, goals, lifeVision, onSave }) {
  const [editing, setEditing] = useState(!employment);
  const [form, setForm] = useState({
    status: "Day Program",
    employer_name: "", job_title: "", hours_per_week: "",
    hourly_wage: "", meets_minimum_wage: true,
    job_coach_support_level: "Natural Supports Only",
    start_date: "", barriers_to_employment: "", action_plan: "",
    is_current: true, notes: "",
    ...employment,
  });
  const [saved, setSaved] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const isCIE = form.status === "Competitive Integrated Employment";
  const isSeeking = form.status === "Unemployed — Seeking";
  const aspiresEmployment = lifeVision?.employment_aspiration && !["Day Program", "No Interest in Employment", "Unsure"].includes(lifeVision.employment_aspiration);
  const hasEmploymentGoal = goals.some(g => g.domain === "Vocational/Employment" || g.goal_title?.toLowerCase().includes("employ") || g.goal_title?.toLowerCase().includes("job"));
  const aspirationGap = aspiresEmployment && !hasEmploymentGoal;

  const statusCfg = EMPLOYMENT_STATUS_LABELS[form.status || employment?.status] || EMPLOYMENT_STATUS_LABELS["Day Program"];

  const handleSave = () => {
    onSave({ ...form, client_id: client.id, client_name: `${client.first_name} ${client.last_name}` }, employment?.id);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Aspiration gap */}
      {aspirationGap && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-3">
          <p className="text-sm font-bold text-amber-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Employment Aspiration Gap</p>
          <p className="text-xs text-amber-700 mt-1">
            {client.first_name}'s life vision includes "{lifeVision.employment_aspiration}" but there is no active employment-related goal in their plan. Asking someone what they want their life to look like and then building a plan with no connection to their answer is not person-centered planning. This discrepancy must be addressed at the next planning meeting.
          </p>
        </div>
      )}

      {/* Current status display */}
      {employment && !editing && (
        <div className={cn("border-2 rounded-2xl p-5", isCIE ? "border-emerald-300 bg-emerald-50" : "border-border bg-white")}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <Badge className={cn("mb-2", statusCfg.color)}>{statusCfg.label}</Badge>
              {employment.employer_name && <p className="font-bold text-base">{employment.employer_name}</p>}
              {employment.job_title && <p className="text-sm text-muted-foreground">{employment.job_title}</p>}
            </div>
            {isCIE && <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
          </div>
          {isCIE && (
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center">
                <p className="text-lg font-bold">{employment.hours_per_week || "—"}</p>
                <p className="text-xs text-muted-foreground">hrs/week</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{employment.hourly_wage ? `$${employment.hourly_wage}` : "—"}</p>
                <p className="text-xs text-muted-foreground">hourly wage</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{employment.job_coach_support_level?.split(" ")[0] || "—"}</p>
                <p className="text-xs text-muted-foreground">job coach</p>
              </div>
            </div>
          )}
          {!employment.meets_minimum_wage && isCIE && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-800">
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />Wage is below minimum wage — this must be reviewed and addressed.
            </div>
          )}
          {employment.barriers_to_employment && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground font-medium">Barriers:</p>
              <p className="text-xs mt-0.5">{employment.barriers_to_employment}</p>
            </div>
          )}
          {employment.action_plan && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground font-medium">Action Plan:</p>
              <p className="text-xs mt-0.5">{employment.action_plan}</p>
            </div>
          )}
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setEditing(true)}>Update Employment Record</Button>
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div className="border-2 border-border rounded-2xl p-5 space-y-3 bg-white">
          <p className="font-semibold text-sm">Employment & Meaningful Daytime Activity</p>
          <div><Label>Current Status *</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EMP_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {(isCIE || form.status === "Supported Employment") && <>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Employer Name</Label><Input value={form.employer_name} onChange={e => set("employer_name", e.target.value)} /></div>
              <div><Label>Job Title</Label><Input value={form.job_title} onChange={e => set("job_title", e.target.value)} /></div>
              <div><Label>Hours/Week</Label><Input type="number" value={form.hours_per_week} onChange={e => set("hours_per_week", Number(e.target.value))} /></div>
              <div><Label>Hourly Wage</Label><Input type="number" value={form.hourly_wage} onChange={e => set("hourly_wage", Number(e.target.value))} /></div>
            </div>
            <div><Label>Job Coach Support Level</Label>
              <Select value={form.job_coach_support_level} onValueChange={v => set("job_coach_support_level", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COACH_LEVELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.meets_minimum_wage} onChange={e => set("meets_minimum_wage", e.target.checked)} />
              Meets minimum wage
            </label>
          </>}
          <div><Label>Barriers to Employment / Participation</Label>
            <Textarea rows={2} value={form.barriers_to_employment} onChange={e => set("barriers_to_employment", e.target.value)} className="text-sm" />
          </div>
          <div><Label>Action Plan</Label>
            <Textarea rows={2} value={form.action_plan} onChange={e => set("action_plan", e.target.value)} className="text-sm" />
          </div>
          <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} /></div>
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1 gap-2">{saved ? <><CheckCircle2 className="w-4 h-4" />Saved</> : "Save Record"}</Button>
            {employment && <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>}
          </div>
        </div>
      )}

      {/* Linked employment goals */}
      <div>
        <p className="text-sm font-semibold mb-2">Linked Employment Goals</p>
        {goals.filter(g => g.domain === "Vocational/Employment" || g.goal_title?.toLowerCase().includes("employ") || g.goal_title?.toLowerCase().includes("work")).length === 0 ? (
          <p className="text-xs text-muted-foreground italic border-dashed border-2 border-border rounded-xl p-3 text-center">No employment-related goals on file.</p>
        ) : goals.filter(g => g.domain === "Vocational/Employment").map((g, i) => (
          <div key={i} className="flex items-center justify-between border border-border rounded-xl px-3 py-2 text-xs bg-white">
            <span>{g.goal_title}</span>
            <Badge variant="outline" className="text-[10px]">{g.status}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}