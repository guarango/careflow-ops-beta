import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { todayISO } from "@/lib/dateUtils";
import {
  STRATEGY_STATUSES,
  SUBMISSION_METHODS,
  isStrategyLate,
  saveSupportStrategy,
  strategyDueDate,
} from "@/lib/supportStrategies";
import { LIFE_AREAS } from "./PCSPGoalsEditor";

const MEASUREMENT_METHODS = [
  "Frequency Count",
  "Duration Recording",
  "Percentage of Trials",
  "Momentary Time Sampling",
  "Partial Interval Recording",
  "Task Analysis Step Count",
  "Likert-Scale Rating",
  "Anecdotal/Observational",
];
const DATA_SCHEDULES = [
  "Every Session",
  "Daily",
  "Weekly",
  "Monthly",
  "As Natural Opportunity Arises",
];

const blankStrategy = (client, plan, actor) => ({
  client_id: client.id,
  client_name: `${client.first_name || ""} ${client.last_name || ""}`.trim(),
  pcsp_id: plan.id,
  pcsp_goal_id: "",
  goal_title: "",
  persons_own_words: "",
  domain: "",
  connection_to_personal_outcome: "",
  baseline_description: "",
  baseline_date: todayISO(),
  primary_measurement_method: "",
  data_collection_schedule: "",
  data_collection_instructions: "",
  mastery_criteria: "",
  prompt_fading_plan: "",
  service_code_ids: [],
  goal_author: actor,
  strategy_status: "Draft",
  submitted_to_sc_date: "",
  submission_method: "",
  submission_note: "",
  revision_reason: "",
  submitted_by: "",
});

export default function SupportStrategyDialog({ open, onOpenChange, client, plan, codes, strategy }) {
  const { user } = useAuth();
  const [form, setForm] = useState(() => blankStrategy(client, plan, ""));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(
      strategy
        ? { ...blankStrategy(client, plan, user?.full_name || ""), ...strategy, service_code_ids: strategy.service_code_ids || [] }
        : blankStrategy(client, plan, user?.full_name || user?.email || "")
    );
  }, [open, strategy, client, plan, user]);

  const planServiceIds = (plan.services_on_plan || []).map((s) => s.service_code_id);
  const planCodes = codes.filter((c) => planServiceIds.includes(c.id));
  const due = strategyDueDate(plan);
  const submittedStatus = ["Submitted to SC", "Revised"].includes(form.strategy_status);
  const late = isStrategyLate(form, due);
  const revising = strategy?.strategy_status === "Submitted to SC" && form.strategy_status === "Revised";

  const update = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setError("");
  };

  const pickPcspGoal = (key) => {
    const goal = (plan.pcsp_goals || []).find(
      (g) => (g.goal_id || `text:${g.goal_text_as_written || ""}`) === key
    );
    if (!goal) return update({ pcsp_goal_id: "" });
    const allowed = (goal.responsible_service_code_ids || []).filter((id) => planServiceIds.includes(id));
    update({
      pcsp_goal_id: key,
      goal_title: goal.goal_text_as_written || "",
      persons_own_words: goal.persons_own_words || "",
      domain: LIFE_AREAS.includes(goal.life_area) ? goal.life_area : "Other",
      service_code_ids: allowed,
    });
  };

  const toggleCode = (id) => {
    const current = form.service_code_ids || [];
    update({
      service_code_ids: current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    });
  };

  const handleSave = async () => {
    const required = [
      ["pcsp_goal_id", "Choose which PCSP goal this strategy serves."],
      ["goal_title", "Write the goal as it appears on the PCSP."],
      ["connection_to_personal_outcome", "Describe how the goal connects to the person's outcome."],
      ["baseline_description", "Describe the baseline."],
      ["baseline_date", "Enter the baseline date."],
      ["primary_measurement_method", "Choose the primary measurement method."],
      ["data_collection_schedule", "Choose the data collection schedule."],
      ["data_collection_instructions", "Write the staff instructions."],
      ["mastery_criteria", "Describe the measurable target and mastery criteria."],
    ];
    for (const [key, message] of required) {
      if (!String(form[key] || "").trim()) return setError(message);
    }
    if (!(form.service_code_ids || []).length) {
      return setError("Link at least one service code the agency is responsible for.");
    }
    if (revising && !form.revision_reason.trim()) {
      return setError("Add a reason before revising a submitted strategy.");
    }
    setSaving(true);
    try {
      const payload = { ...form, pcsp_id: plan.id };
      if (submittedStatus) {
        payload.submitted_to_sc_date = form.submitted_to_sc_date || todayISO();
        payload.submitted_by = form.submitted_by || user?.full_name || user?.email || "";
      }
      await saveSupportStrategy({ strategy, payload, plan });
      await queryClient.invalidateQueries({ queryKey: ["pcsp-strategies", client.id] });
      toast({
        title: strategy ? "Support Strategy updated" : "Support Strategy added",
        description: late ? "Submitted after the 30-day deadline — marked late." : undefined,
      });
      onOpenChange(false);
    } catch (e) {
      setError(e?.message || "Could not save the Support Strategy.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {strategy ? "Edit Support Strategy" : "New Support Strategy"} — {form.client_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>PCSP goal this strategy serves *</Label>
              <Select value={form.pcsp_goal_id || ""} onValueChange={pickPcspGoal}>
                <SelectTrigger><SelectValue placeholder="Choose a goal from the PCSP" /></SelectTrigger>
                <SelectContent>
                  {(plan.pcsp_goals || []).map((g, i) => (
                    <SelectItem key={g.goal_id || `text-${i}`} value={g.goal_id || `text:${g.goal_text_as_written || ""}`}>
                      {g.goal_text_as_written || `Goal ${i + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Goal as written on the PCSP *</Label>
              <Textarea rows={2} value={form.goal_title || ""} onChange={(e) => update({ goal_title: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Person's own words</Label>
              <Textarea rows={2} value={form.persons_own_words || ""} onChange={(e) => update({ persons_own_words: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Connection to personal outcome *</Label>
              <Textarea
                rows={2}
                value={form.connection_to_personal_outcome || ""}
                onChange={(e) => update({ connection_to_personal_outcome: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Life area</Label>
              <Select value={form.domain || ""} onValueChange={(v) => update({ domain: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {LIFE_AREAS.map((area) => <SelectItem key={area} value={area}>{area}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Baseline description *</Label>
              <Textarea rows={2} value={form.baseline_description || ""} onChange={(e) => update({ baseline_description: e.target.value })} />
            </div>
            <div>
              <Label>Baseline date *</Label>
              <Input type="date" value={form.baseline_date || ""} onChange={(e) => update({ baseline_date: e.target.value })} />
            </div>
            <div>
              <Label>Primary measurement method *</Label>
              <Select value={form.primary_measurement_method || ""} onValueChange={(v) => update({ primary_measurement_method: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {MEASUREMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data collection schedule *</Label>
              <Select value={form.data_collection_schedule || ""} onValueChange={(v) => update({ data_collection_schedule: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {DATA_SCHEDULES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Staff instructions (what DSP does, what to document) *</Label>
              <Textarea
                rows={4}
                value={form.data_collection_instructions || ""}
                onChange={(e) => update({ data_collection_instructions: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Measurable target &amp; mastery criteria *</Label>
              <Textarea rows={2} value={form.mastery_criteria || ""} onChange={(e) => update({ mastery_criteria: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Prompt fading plan</Label>
              <Textarea rows={2} value={form.prompt_fading_plan || ""} onChange={(e) => update({ prompt_fading_plan: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Responsible service codes * (services on the PCSP)</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {planCodes.map((c) => {
                  const active = (form.service_code_ids || []).includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCode(c.id)}
                      className={
                        active
                          ? "rounded-full border border-primary bg-primary px-2.5 py-0.5 text-[11px] font-medium text-primary-foreground"
                          : "rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground hover:border-primary/40"
                      }
                    >
                      {c.code}
                    </button>
                  );
                })}
                {planCodes.length === 0 && (
                  <p className="text-xs text-amber-700">No service codes on this PCSP yet.</p>
                )}
              </div>
            </div>
            <div>
              <Label>Author</Label>
              <Input value={form.goal_author || ""} onChange={(e) => update({ goal_author: e.target.value })} />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status &amp; submission to the support coordinator
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Strategy status</Label>
                <Select value={form.strategy_status} onValueChange={(v) => update({ strategy_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STRATEGY_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Due {due || "—"} (PCSP activation + 30 days).
                </p>
              </div>
              {submittedStatus && (
                <>
                  <div>
                    <Label>Submitted to SC on *</Label>
                    <Input
                      type="date"
                      value={form.submitted_to_sc_date || ""}
                      onChange={(e) => update({ submitted_to_sc_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Submission method *</Label>
                    <Select value={form.submission_method || ""} onValueChange={(v) => update({ submission_method: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {SUBMISSION_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Submission note</Label>
                    <Input
                      value={form.submission_note || ""}
                      onChange={(e) => update({ submission_note: e.target.value })}
                      placeholder="e.g. Sent with the quarterly packet"
                    />
                  </div>
                  {late && (
                    <p className="sm:col-span-2 text-xs font-medium text-red-600">
                      This submission is after the {due} deadline — it will be marked late.
                    </p>
                  )}
                  <div className="sm:col-span-2">
                    <Label>Revision reason {revising && <span className="text-destructive">*</span>}</Label>
                    <Textarea
                      rows={2}
                      value={form.revision_reason || ""}
                      onChange={(e) => update({ revision_reason: e.target.value })}
                      placeholder="Required when a submitted strategy is revised"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : strategy ? "Save strategy" : "Create strategy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}