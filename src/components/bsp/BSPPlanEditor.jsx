import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Send, AlertTriangle, CheckCircle2, Plus, Trash2, Heart } from "lucide-react";
import BSPTargetBehaviorCard from "./BSPTargetBehaviorCard";
import BSPReinforcementEditor from "./BSPReinforcementEditor";
import { cn } from "@/lib/utils";

const CREDENTIALS = ["BCBA", "BCaBA", "Psychologist", "Licensed Clinical Supervisor", "LCSW", "Other Licensed Clinician"];
const FRAMEWORKS = ["HCBS Waiver", "ICF/IDD", "State Behavioral Support Requirement", "School-Based IEP", "Other"];
const ASSESSMENT_METHODS = ["Direct Observation", "ABC Data Review", "Caregiver Interview", "Standardized Assessment", "Record Review", "Functional Analysis", "Preference Assessment"];

export default function BSPPlanEditor({ plan, clients, onSave, onCancel, saving }) {
  const [form, setForm] = useState(plan || {
    client_id: "", client_name: "", status: "Draft",
    plan_date: new Date().toISOString().split("T")[0],
    next_review_date: "", regulatory_framework: "",
    includes_restrictive_procedures: false,
    bsp_author: "", bsp_author_credential: "", supervising_bcba: "",
    plain_language_summary: "",
    fba_reason_for_referral: "", fba_diagnostic_context: "",
    fba_assessment_methods: [], fba_environmental_factors: "", fba_summary_narrative: "",
    target_behaviors: [],
    reinforcement_system: { identified_reinforcers: [], reinforcer_log: [] },
    revision_log: [], staff_training: { quiz_questions: [], acknowledgments: [] },
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setClient = (id) => {
    const c = clients.find(x => x.id === id);
    set("client_id", id);
    set("client_name", c ? `${c.first_name} ${c.last_name}` : "");
  };
  const toggleMethod = (m) => {
    const curr = form.fba_assessment_methods || [];
    set("fba_assessment_methods", curr.includes(m) ? curr.filter(x => x !== m) : [...curr, m]);
  };

  const addBehavior = () => {
    const newB = {
      id: `b_${Date.now()}`, name: "", topography: "", examples: ["", "", ""], non_examples: ["", "", ""],
      function: "", measurement_method: "", baseline_rate: "", baseline_date: "",
      severity_mild: "", severity_moderate: "", severity_severe: "",
      antecedent_strategies: { setting_modifications: "", schedule_routine_supports: "", sensory_physiological: "", relationship_communication: "", triggers_to_avoid: [] },
      replacement_behavior: { definition: "", functional_match_explanation: "", prompt_procedure: "", reinforcement_procedure: "", current_skill_level: "", reinforcement_schedule: "" },
      reactive_strategies: []
    };
    set("target_behaviors", [...(form.target_behaviors || []), newB]);
  };

  const updateBehavior = (idx, updated) => {
    const arr = [...(form.target_behaviors || [])];
    arr[idx] = updated;
    set("target_behaviors", arr);
  };

  const removeBehavior = (idx) => {
    set("target_behaviors", (form.target_behaviors || []).filter((_, i) => i !== idx));
  };

  const isValid = form.client_id && form.bsp_author && form.bsp_author_credential;
  const hasRestrictive = (form.target_behaviors || []).some(b => (b.reactive_strategies || []).some(r => r.is_restrictive));

  return (
    <div className="max-w-4xl mx-auto">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border pb-3 mb-5 pt-1 flex items-center justify-between gap-3">
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />Back
        </button>
        <div className="text-center">
          <p className="font-bold text-sm">{form.client_name || "New BSP"}</p>
          <p className="text-xs text-muted-foreground">{plan?.id ? `v${form.version || 1} · ${form.status}` : "New Plan"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onSave({ ...form, status: "Draft" })} disabled={saving || !isValid} className="gap-1.5">
            <Save className="w-3.5 h-3.5" />Draft
          </Button>
          <Button size="sm" onClick={() => onSave({ ...form, status: form.includes_restrictive_procedures ? "Pending Approval" : "Active" })} disabled={saving || !isValid} className="gap-1.5">
            <Send className="w-3.5 h-3.5" />{form.includes_restrictive_procedures ? "Submit for Approval" : "Activate Plan"}
          </Button>
        </div>
      </div>

      {form.includes_restrictive_procedures && (
        <div className="mb-4 bg-red-50 border-2 border-red-300 rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <strong className="text-red-800">Restrictive Procedures Included</strong>
            <p className="text-red-700 text-xs mt-0.5">This plan requires administrator co-signature and approval before activation. All restrictive procedures will generate automatic supervisor notifications upon use.</p>
          </div>
        </div>
      )}

      {/* Trauma-informed reminder */}
      <div className="mb-5 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-start gap-2">
        <Heart className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
        <p className="text-xs text-violet-700 leading-relaxed">
          <strong>Behaviors are communication, not character flaws.</strong> This plan documents how we can better understand and respond to {form.client_name || "this person"}'s needs — always centering their dignity, safety, and growth.
        </p>
      </div>

      <Tabs defaultValue="identity">
        <TabsList className="flex-wrap h-auto gap-1 mb-5">
          <TabsTrigger value="identity">Plan Identity</TabsTrigger>
          <TabsTrigger value="fba">FBA Summary</TabsTrigger>
          <TabsTrigger value="behaviors">Target Behaviors</TabsTrigger>
          <TabsTrigger value="reinforcement">Reinforcement</TabsTrigger>
          <TabsTrigger value="summary">Family Summary</TabsTrigger>
        </TabsList>

        {/* ── PLAN IDENTITY ── */}
        <TabsContent value="identity" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Client *</Label>
              <Select value={form.client_id} onValueChange={setClient}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.filter(c => c.status === "Active" || !c.status).map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plan Date</Label>
              <Input type="date" value={form.plan_date} onChange={e => set("plan_date", e.target.value)} />
            </div>
            <div>
              <Label>Next Review Date</Label>
              <Input type="date" value={form.next_review_date} onChange={e => set("next_review_date", e.target.value)} />
            </div>
            <div>
              <Label>Regulatory Framework</Label>
              <Select value={form.regulatory_framework} onValueChange={v => set("regulatory_framework", v)}>
                <SelectTrigger><SelectValue placeholder="Select framework" /></SelectTrigger>
                <SelectContent>{FRAMEWORKS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>BSP Author *</Label>
              <Input value={form.bsp_author} onChange={e => set("bsp_author", e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <Label>Author Credential *</Label>
              <Select value={form.bsp_author_credential} onValueChange={v => set("bsp_author_credential", v)}>
                <SelectTrigger><SelectValue placeholder="Credential" /></SelectTrigger>
                <SelectContent>{CREDENTIALS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Supervising BCBA</Label>
              <Input value={form.supervising_bcba} onChange={e => set("supervising_bcba", e.target.value)} placeholder="Name on record" />
            </div>
            <div>
              <Label>Program Director</Label>
              <Input value={form.program_director} onChange={e => set("program_director", e.target.value)} placeholder="Name" />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.includes_restrictive_procedures}
                  onChange={e => set("includes_restrictive_procedures", e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium">This plan includes restrictive procedures</span>
                <span className="text-xs text-red-600 font-medium">(requires administrator co-signature)</span>
              </label>
            </div>
          </div>
        </TabsContent>

        {/* ── FBA SUMMARY ── */}
        <TabsContent value="fba" className="space-y-4">
          <div>
            <Label>Reason for Referral</Label>
            <p className="text-xs text-muted-foreground mb-1.5">Why was this behavioral support plan initiated?</p>
            <Textarea value={form.fba_reason_for_referral} onChange={e => set("fba_reason_for_referral", e.target.value)} rows={3} placeholder="Describe the circumstances that led to this BSP being developed..." />
          </div>
          <div>
            <Label>Diagnostic Context</Label>
            <p className="text-xs text-muted-foreground mb-1.5">Relevant diagnoses, trauma history, or sensory differences — without reducing the person to their diagnoses.</p>
            <Textarea value={form.fba_diagnostic_context} onChange={e => set("fba_diagnostic_context", e.target.value)} rows={3} placeholder="e.g., History of trauma, sensory processing differences, communication barriers..." />
          </div>
          <div>
            <Label>Assessment Methods Used</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {ASSESSMENT_METHODS.map(m => (
                <button key={m} type="button"
                  onClick={() => toggleMethod(m)}
                  className={cn("px-3 py-1.5 rounded-xl border-2 text-xs font-medium transition-all",
                    (form.fba_assessment_methods || []).includes(m)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-white text-muted-foreground hover:border-primary/30"
                  )}
                >{m}</button>
              ))}
            </div>
          </div>
          <div>
            <Label>Environmental & Setting Factors</Label>
            <p className="text-xs text-muted-foreground mb-1.5">Staffing patterns, schedule structure, sensory environment, health factors, communication barriers.</p>
            <Textarea value={form.fba_environmental_factors} onChange={e => set("fba_environmental_factors", e.target.value)} rows={3} placeholder="Describe environmental conditions that contribute to behavior..." />
          </div>
          <div>
            <Label>FBA Summary Narrative</Label>
            <Textarea value={form.fba_summary_narrative} onChange={e => set("fba_summary_narrative", e.target.value)} rows={4} placeholder="Overall summary of assessment findings and hypotheses..." />
          </div>
        </TabsContent>

        {/* ── TARGET BEHAVIORS ── */}
        <TabsContent value="behaviors">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold">Target Behaviors</p>
              <p className="text-xs text-muted-foreground">Operationally define each behavior so any two staff observing the same event classify it identically.</p>
            </div>
            <Button size="sm" variant="outline" onClick={addBehavior} className="gap-1.5">
              <Plus className="w-4 h-4" />Add Behavior
            </Button>
          </div>
          {(form.target_behaviors || []).length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm">
              No target behaviors defined yet.<br />
              <button type="button" onClick={addBehavior} className="text-primary hover:underline mt-1 text-sm">Add the first behavior →</button>
            </div>
          ) : (
            <div className="space-y-4">
              {(form.target_behaviors || []).map((b, i) => (
                <BSPTargetBehaviorCard
                  key={b.id || i}
                  behavior={b}
                  index={i}
                  onChange={(updated) => updateBehavior(i, updated)}
                  onRemove={() => removeBehavior(i)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── REINFORCEMENT ── */}
        <TabsContent value="reinforcement">
          <BSPReinforcementEditor
            reinforcement={form.reinforcement_system || {}}
            onChange={v => set("reinforcement_system", v)}
          />
        </TabsContent>

        {/* ── FAMILY SUMMARY ── */}
        <TabsContent value="summary" className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            <strong>Plain Language Summary</strong> — Write this at a 6th-grade reading level. Avoid jargon. This is read by the person themselves and their family. Use "you" language where appropriate.
          </div>
          <Textarea
            value={form.plain_language_summary}
            onChange={e => set("plain_language_summary", e.target.value)}
            rows={12}
            placeholder={`Example: This plan is about helping ${form.client_name || "[name]"} feel safe and understood. Sometimes when things feel overwhelming, ${form.client_name || "[name]"} may [describe behavior in simple terms]. This doesn't mean anything is wrong with them — it means they are letting us know something isn't working. Here is how we will help...`}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}