import React, { useState } from "react";
import { ChevronDown, ChevronUp, Trash2, Plus, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const FUNCTIONS = ["Escape/Avoidance", "Attention", "Access to Tangibles", "Sensory/Automatic", "Communication", "Unknown"];
const METHODS = ["Frequency Count", "Duration Recording", "Intensity Rating", "Partial Interval", "Whole Interval", "Momentary Time Sampling"];
const REINFORCEMENT_SCHEDULES = ["Continuous (FR1)", "Fixed Ratio", "Variable Ratio", "Fixed Interval", "Variable Interval", "Natural/Intermittent"];
const SEVERITY_TIERS = ["Mild", "Moderate", "Severe"];
const TIER_COLORS = { Mild: "border-amber-300 bg-amber-50", Moderate: "border-orange-300 bg-orange-50", Severe: "border-red-300 bg-red-50" };

export default function BSPTargetBehaviorCard({ behavior: b, index, onChange, onRemove }) {
  const [expanded, setExpanded] = useState(true);
  const [section, setSection] = useState("definition");

  const set = (k, v) => onChange({ ...b, [k]: v });
  const setNested = (parent, k, v) => onChange({ ...b, [parent]: { ...(b[parent] || {}), [k]: v } });
  const setReplacement = (k, v) => setNested("replacement_behavior", k, v);
  const setAntecedent = (k, v) => setNested("antecedent_strategies", k, v);

  const updateExample = (arr, i, val) => {
    const copy = [...(arr || ["", "", ""])];
    copy[i] = val;
    return copy;
  };

  const addTrigger = () => {
    const existing = b.antecedent_strategies?.triggers_to_avoid || [];
    setAntecedent("triggers_to_avoid", [...existing, { trigger: "", required_staff_action: "" }]);
  };

  const updateTrigger = (i, k, v) => {
    const arr = [...(b.antecedent_strategies?.triggers_to_avoid || [])];
    arr[i] = { ...arr[i], [k]: v };
    setAntecedent("triggers_to_avoid", arr);
  };

  const addReactiveStrategy = (tier) => {
    const existing = b.reactive_strategies || [];
    if (existing.some(r => r.severity_tier === tier)) return;
    onChange({
      ...b, reactive_strategies: [...existing, {
        severity_tier: tier, steps: [""], helpful_phrases: [""], phrases_to_avoid: [""],
        environmental_modifications: "", when_to_call_backup: "", who_to_call: "",
        post_incident_documentation: "", contraindicated_responses: [""],
        is_restrictive: false, restrictive_details: {}
      }]
    });
  };

  const updateReactive = (rIdx, k, v) => {
    const arr = [...(b.reactive_strategies || [])];
    arr[rIdx] = { ...arr[rIdx], [k]: v };
    onChange({ ...b, reactive_strategies: arr });
  };

  const updateReactiveList = (rIdx, k, itemIdx, val) => {
    const arr = [...(b.reactive_strategies || [])];
    const list = [...(arr[rIdx][k] || [])];
    list[itemIdx] = val;
    arr[rIdx] = { ...arr[rIdx], [k]: list };
    onChange({ ...b, reactive_strategies: arr });
  };

  const addToReactiveList = (rIdx, k) => {
    const arr = [...(b.reactive_strategies || [])];
    arr[rIdx] = { ...arr[rIdx], [k]: [...(arr[rIdx][k] || []), ""] };
    onChange({ ...b, reactive_strategies: arr });
  };

  const SECTIONS = [
    { id: "definition", label: "Definition" },
    { id: "antecedent", label: "Antecedent Strategies" },
    { id: "replacement", label: "Replacement Behavior" },
    { id: "reactive", label: "Reactive Strategies" },
  ];

  return (
    <div className={cn("border-2 rounded-xl bg-white shadow-sm", b.name ? "border-border" : "border-amber-300")}>
      <button type="button" className="w-full flex items-center justify-between px-4 py-3 text-left" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">B{index + 1}</span>
          <span className="font-semibold text-sm">{b.name || <em className="text-muted-foreground font-normal">Unnamed behavior</em>}</span>
          {b.function && <span className="text-xs bg-muted px-1.5 py-0.5 rounded hidden sm:block">{b.function}</span>}
          {(b.reactive_strategies || []).some(r => r.is_restrictive) && (
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={e => { e.stopPropagation(); onRemove(); }} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/40">
          {/* Section tabs */}
          <div className="flex gap-1 px-4 pt-3 overflow-x-auto">
            {SECTIONS.map(s => (
              <button key={s.id} type="button" onClick={() => setSection(s.id)}
                className={cn("text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all", section === s.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}
              >{s.label}</button>
            ))}
          </div>

          <div className="p-4 space-y-4">
            {/* DEFINITION */}
            {section === "definition" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label>Behavior Name *</Label>
                    <Input value={b.name} onChange={e => set("name", e.target.value)} placeholder='e.g., "Property Destruction" — specific, not vague' />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Topography (Operational Definition)</Label>
                    <p className="text-xs text-muted-foreground mb-1">Write so precisely that two different staff observing the same event would classify it identically.</p>
                    <Textarea value={b.topography} onChange={e => set("topography", e.target.value)} rows={3} placeholder="Physically describe the exact movements, sounds, or actions that constitute this behavior..." />
                  </div>
                  <div>
                    <Label>Function</Label>
                    <Select value={b.function} onValueChange={v => set("function", v)}>
                      <SelectTrigger><SelectValue placeholder="Select function" /></SelectTrigger>
                      <SelectContent>{FUNCTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Measurement Method</Label>
                    <Select value={b.measurement_method} onValueChange={v => set("measurement_method", v)}>
                      <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                      <SelectContent>{METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Baseline Rate</Label>
                    <Input value={b.baseline_rate} onChange={e => set("baseline_rate", e.target.value)} placeholder='e.g., "3-4x per day, avg 8 min duration"' />
                  </div>
                  <div>
                    <Label>Baseline Date</Label>
                    <Input type="date" value={b.baseline_date} onChange={e => set("baseline_date", e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {["examples", "non_examples"].map((field, fi) => (
                    <div key={field} className={fi === 0 ? "sm:col-span-2 grid grid-cols-3 gap-2" : ""}>
                      {fi === 1 && <p className="text-xs font-semibold text-muted-foreground mb-1 sm:col-span-3">3 Examples of what DOES count</p>}
                    </div>
                  ))}

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Examples (what counts)</p>
                    {(b.examples || ["", "", ""]).map((ex, i) => (
                      <Input key={i} value={ex} onChange={e => set("examples", updateExample(b.examples, i, e.target.value))} placeholder={`Example ${i + 1}...`} className="mb-1.5 text-sm h-8" />
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Non-Examples (what does NOT count)</p>
                    {(b.non_examples || ["", "", ""]).map((ex, i) => (
                      <Input key={i} value={ex} onChange={e => set("non_examples", updateExample(b.non_examples, i, e.target.value))} placeholder={`Non-example ${i + 1}...`} className="mb-1.5 text-sm h-8" />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Severity Tiers</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[["severity_mild", "Mild", "amber"], ["severity_moderate", "Moderate", "orange"], ["severity_severe", "Severe", "red"]].map(([k, label, color]) => (
                      <div key={k} className={`rounded-xl border-2 p-3 border-${color}-200 bg-${color}-50`}>
                        <p className={`text-xs font-bold text-${color}-700 mb-1.5`}>{label}</p>
                        <Textarea value={b[k] || ""} onChange={e => set(k, e.target.value)} rows={2} placeholder={`Describe what ${label.toLowerCase()} looks like...`} className="text-xs resize-none bg-white/70" />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ANTECEDENT STRATEGIES */}
            {section === "antecedent" && (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700">
                  <strong>Proactive strategies</strong> — how to prevent the behavior before it starts. These are the most powerful interventions.
                </div>
                {[
                  ["setting_modifications", "Setting Modifications", "Environmental changes that reduce triggers (lighting, noise, space, visual clutter)"],
                  ["schedule_routine_supports", "Schedule & Routine Supports", "Predictability strategies, transition warnings, visual schedules"],
                  ["sensory_physiological", "Sensory & Physiological Supports", "Sensory diet, sleep/health considerations, hunger/pain screening"],
                  ["relationship_communication", "Relationship & Communication Supports", "Preferred staff, communication system accommodations, rapport-building"]
                ].map(([k, label, desc]) => (
                  <div key={k}>
                    <Label>{label}</Label>
                    <p className="text-xs text-muted-foreground mb-1.5">{desc}</p>
                    <Textarea value={b.antecedent_strategies?.[k] || ""} onChange={e => setAntecedent(k, e.target.value)} rows={2} placeholder={`Describe ${label.toLowerCase()}...`} className="text-sm" />
                  </div>
                ))}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Specific Triggers to Actively Avoid</Label>
                    <button type="button" onClick={addTrigger} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus className="w-3 h-3" />Add trigger</button>
                  </div>
                  {(b.antecedent_strategies?.triggers_to_avoid || []).map((t, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2 mb-2 bg-red-50 border border-red-100 rounded-lg p-2">
                      <Input value={t.trigger} onChange={e => updateTrigger(i, "trigger", e.target.value)} placeholder="Trigger to avoid..." className="text-sm h-8 bg-white" />
                      <Input value={t.required_staff_action} onChange={e => updateTrigger(i, "required_staff_action", e.target.value)} placeholder="Required staff action..." className="text-sm h-8 bg-white" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* REPLACEMENT BEHAVIOR */}
            {section === "replacement" && (
              <div className="space-y-4">
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-xs text-sky-700">
                  <strong>Functionally Equivalent Replacement Behavior (FERB)</strong> — the appropriate behavior that gets the person the same outcome the problem behavior was getting them. The function must match.
                </div>
                <div>
                  <Label>Replacement Behavior Definition</Label>
                  <Textarea value={b.replacement_behavior?.definition || ""} onChange={e => setReplacement("definition", e.target.value)} rows={2} placeholder="Precisely define the replacement behavior..." />
                </div>
                <div>
                  <Label>Functional Match Explanation</Label>
                  <p className="text-xs text-muted-foreground mb-1.5">Why does this replacement work? How does it serve the same function as the target behavior?</p>
                  <Textarea value={b.replacement_behavior?.functional_match_explanation || ""} onChange={e => setReplacement("functional_match_explanation", e.target.value)} rows={2} placeholder="e.g., Both the target behavior and the replacement result in escape from demands..." />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>How to Prompt the Replacement</Label>
                    <Textarea value={b.replacement_behavior?.prompt_procedure || ""} onChange={e => setReplacement("prompt_procedure", e.target.value)} rows={2} placeholder="Step-by-step prompting procedure..." className="text-sm" />
                  </div>
                  <div>
                    <Label>How to Reinforce the Replacement</Label>
                    <Textarea value={b.replacement_behavior?.reinforcement_procedure || ""} onChange={e => setReplacement("reinforcement_procedure", e.target.value)} rows={2} placeholder="What reinforcement to deliver and when..." className="text-sm" />
                  </div>
                  <div>
                    <Label>Current Skill Level</Label>
                    <Input value={b.replacement_behavior?.current_skill_level || ""} onChange={e => setReplacement("current_skill_level", e.target.value)} placeholder='e.g., "Emerging — 20% independent"' />
                  </div>
                  <div>
                    <Label>Reinforcement Schedule</Label>
                    <Select value={b.replacement_behavior?.reinforcement_schedule || ""} onValueChange={v => setReplacement("reinforcement_schedule", v)}>
                      <SelectTrigger><SelectValue placeholder="Select schedule" /></SelectTrigger>
                      <SelectContent>{REINFORCEMENT_SCHEDULES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* REACTIVE STRATEGIES */}
            {section === "reactive" && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                  <strong>What staff do when the behavior occurs</strong> — written as numbered checklists, not clinical prose. Tiered by severity.
                </div>
                <div className="flex gap-2 flex-wrap">
                  {SEVERITY_TIERS.map(tier => {
                    const exists = (b.reactive_strategies || []).some(r => r.severity_tier === tier);
                    return (
                      <button key={tier} type="button" onClick={() => !exists && addReactiveStrategy(tier)}
                        className={cn("px-3 py-1.5 rounded-xl border-2 text-xs font-medium transition-all",
                          exists ? "border-current bg-white cursor-default" : "border-dashed border-border text-muted-foreground hover:border-primary/40",
                          tier === "Mild" && exists ? "text-amber-700 border-amber-300" : "",
                          tier === "Moderate" && exists ? "text-orange-700 border-orange-300" : "",
                          tier === "Severe" && exists ? "text-red-700 border-red-300" : ""
                        )}
                      >{exists ? `✓ ${tier} Protocol` : `+ Add ${tier} Protocol`}</button>
                    );
                  })}
                </div>

                {(b.reactive_strategies || []).map((r, rIdx) => (
                  <div key={rIdx} className={cn("border-2 rounded-xl p-4 space-y-3", TIER_COLORS[r.severity_tier] || "border-border")}>
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{r.severity_tier} — Response Protocol</p>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="checkbox" checked={r.is_restrictive} onChange={e => updateReactive(rIdx, "is_restrictive", e.target.checked)} />
                        <span className="text-red-600 font-medium">Includes restrictive procedure</span>
                      </label>
                    </div>

                    <div>
                      <p className="text-xs font-semibold mb-1.5">Step-by-Step Staff Response</p>
                      {(r.steps || [""]).map((step, si) => (
                        <div key={si} className="flex gap-2 mb-1.5">
                          <span className="text-xs font-bold text-muted-foreground mt-2 w-5 shrink-0">{si + 1}.</span>
                          <Input value={step} onChange={e => updateReactiveList(rIdx, "steps", si, e.target.value)} placeholder={`Step ${si + 1}...`} className="text-sm h-8 bg-white/70" />
                        </div>
                      ))}
                      <button type="button" onClick={() => addToReactiveList(rIdx, "steps")} className="text-xs text-primary hover:underline mt-1">+ Add step</button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold mb-1.5 text-emerald-700">✓ Helpful phrases</p>
                        {(r.helpful_phrases || [""]).map((p, pi) => (
                          <Input key={pi} value={p} onChange={e => updateReactiveList(rIdx, "helpful_phrases", pi, e.target.value)} placeholder="Phrase that helps de-escalate..." className="text-xs mb-1 h-7 bg-white/70" />
                        ))}
                        <button type="button" onClick={() => addToReactiveList(rIdx, "helpful_phrases")} className="text-xs text-primary hover:underline">+ Add phrase</button>
                      </div>
                      <div>
                        <p className="text-xs font-semibold mb-1.5 text-red-700">✗ Phrases to avoid</p>
                        {(r.phrases_to_avoid || [""]).map((p, pi) => (
                          <Input key={pi} value={p} onChange={e => updateReactiveList(rIdx, "phrases_to_avoid", pi, e.target.value)} placeholder="Phrase that may escalate..." className="text-xs mb-1 h-7 bg-white/70" />
                        ))}
                        <button type="button" onClick={() => addToReactiveList(rIdx, "phrases_to_avoid")} className="text-xs text-primary hover:underline">+ Add phrase</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">When to call for backup</Label>
                        <Input value={r.when_to_call_backup} onChange={e => updateReactive(rIdx, "when_to_call_backup", e.target.value)} placeholder='e.g., "After 10 minutes or if injury risk"' className="text-sm h-8 mt-1 bg-white/70" />
                      </div>
                      <div>
                        <Label className="text-xs">Who specifically to call</Label>
                        <Input value={r.who_to_call} onChange={e => updateReactive(rIdx, "who_to_call", e.target.value)} placeholder="Name and role..." className="text-sm h-8 mt-1 bg-white/70" />
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold mb-1.5 text-red-700">🚫 Do-Not-Do List (contraindicated responses)</p>
                      {(r.contraindicated_responses || [""]).map((c, ci) => (
                        <Input key={ci} value={c} onChange={e => updateReactiveList(rIdx, "contraindicated_responses", ci, e.target.value)} placeholder="Response that may escalate or harm..." className="text-xs mb-1 h-7 bg-white/70 border-red-200" />
                      ))}
                      <button type="button" onClick={() => addToReactiveList(rIdx, "contraindicated_responses")} className="text-xs text-primary hover:underline">+ Add</button>
                    </div>

                    {r.is_restrictive && (
                      <div className="bg-red-100 border-2 border-red-300 rounded-xl p-3 space-y-2">
                        <p className="text-xs font-bold text-red-800">🚨 Restrictive Procedure — Required Documentation</p>
                        <div>
                          <Label className="text-xs text-red-700">Legal Authorization</Label>
                          <Input value={r.restrictive_details?.legal_authorization || ""} onChange={e => updateReactive(rIdx, "restrictive_details", { ...r.restrictive_details, legal_authorization: e.target.value })} placeholder="Document legal basis for this procedure..." className="text-sm h-8 mt-1 bg-white" />
                        </div>
                        <div>
                          <Label className="text-xs text-red-700">Less Restrictive Alternatives Tried</Label>
                          <Input value={r.restrictive_details?.less_restrictive_tried || ""} onChange={e => updateReactive(rIdx, "restrictive_details", { ...r.restrictive_details, less_restrictive_tried: e.target.value })} placeholder="Document alternatives attempted before this..." className="text-sm h-8 mt-1 bg-white" />
                        </div>
                        <div>
                          <Label className="text-xs text-red-700">Staff Training Required Before Use</Label>
                          <Input value={r.restrictive_details?.training_requirement || ""} onChange={e => updateReactive(rIdx, "restrictive_details", { ...r.restrictive_details, training_requirement: e.target.value })} placeholder='e.g., "CPI certification required"' className="text-sm h-8 mt-1 bg-white" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}