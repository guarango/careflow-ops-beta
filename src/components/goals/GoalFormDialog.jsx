import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const DOMAINS = ["Communication", "Activities of Daily Living", "Community Integration", "Social Skills", "Vocational/Employment", "Health & Wellness", "Behavioral Support", "Self-Advocacy", "Mobility & Motor Skills", "Leisure & Recreation", "Other"];
const GOAL_TYPES = ["Acquisition", "Maintenance", "Generalization", "Reduction"];
const PRIORITIES = ["High", "Medium", "Low"];
const STATUSES = ["Active", "Mastered", "Discontinued", "On Hold"];
const PROMPT_LEVELS = ["Full Physical Assist", "Hand-Over-Hand", "Physical Prompt", "Gestural Prompt", "Verbal Prompt", "Indirect Verbal Cue", "Independent"];
const MEASUREMENT_METHODS = ["Frequency Count", "Duration Recording", "Percentage of Trials", "Momentary Time Sampling", "Partial Interval Recording", "Task Analysis Step Count", "Likert-Scale Rating", "Anecdotal/Observational"];
const DATA_SCHEDULES = ["Every Session", "Daily", "Weekly", "Monthly", "As Natural Opportunity Arises"];
const DATA_ROLES = ["DSP", "Job Coach", "Nurse", "Behavior Analyst", "Teacher", "Any Staff"];
const FRAMEWORKS = ["HCBS Waiver", "ICF/IDD", "State-Funded", "School IEP Transition", "Vocational Rehab", "Private Pay", "Other"];
const OBJ_STATUSES = ["Not Started", "In Progress", "Met", "Not Met"];

function FieldHint({ text }) {
  return <p className="text-[11px] text-muted-foreground mt-0.5 italic">{text}</p>;
}

function SectionLabel({ children }) {
  return <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3 mt-1">{children}</h4>;
}

export default function GoalFormDialog({ open, onClose, editing, form, setForm, clients, onSave, saving }) {
  const [activeTab, setActiveTab] = useState("identity");

  const f = form;
  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const addObjective = () => {
    const objs = [...(f.objectives || []), { title: "", target_date: "", status: "Not Started" }];
    set("objectives", objs);
  };
  const updateObjective = (i, key, val) => {
    const objs = [...(f.objectives || [])];
    objs[i] = { ...objs[i], [key]: val };
    set("objectives", objs);
  };
  const removeObjective = (i) => {
    const objs = [...(f.objectives || [])];
    objs.splice(i, 1);
    set("objectives", objs);
  };

  const isValid = f.client_id && f.goal_title && f.domain;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2 border-b border-border">
          <DialogTitle className="text-base">{editing ? "Edit Goal" : "Add New Goal"}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-5 mx-0 shrink-0 text-[11px]">
            <TabsTrigger value="identity" className="text-[11px]">Identity</TabsTrigger>
            <TabsTrigger value="personcentered" className="text-[11px]">Person-Centered</TabsTrigger>
            <TabsTrigger value="clinical" className="text-[11px]">Clinical</TabsTrigger>
            <TabsTrigger value="measurement" className="text-[11px]">Measurement</TabsTrigger>
            <TabsTrigger value="team" className="text-[11px]">Team</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-1">

            {/* ── TAB 1: IDENTITY ── */}
            <TabsContent value="identity" className="space-y-4 mt-4 pb-4">
              <div>
                <Label>Client *</Label>
                <Select value={f.client_id} onValueChange={v => {
                  const c = clients.find(cl => cl.id === v);
                  setForm(prev => ({ ...prev, client_id: v, client_name: c ? `${c.first_name} ${c.last_name}` : "" }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div>
                <Label>Goal Title * <span className="text-muted-foreground font-normal">(observable, measurable)</span></Label>
                <Input value={f.goal_title} onChange={e => set("goal_title", e.target.value)} placeholder='e.g. "[Name] will independently prepare a simple meal across 3 consecutive sessions with 80% accuracy."' />
                <FieldHint>Write in SMART format: Specific · Measurable · Achievable · Relevant · Time-bound. Start with the person's name and an action verb.</FieldHint>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Domain *</Label>
                  <Select value={f.domain} onValueChange={v => set("domain", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{DOMAINS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Goal Type</Label>
                  <Select value={f.goal_type || ""} onValueChange={v => set("goal_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{GOAL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <FieldHint>Acquisition=new skill · Maintenance=keep skill · Generalization=new settings · Reduction=decrease behavior</FieldHint>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={f.priority || "Medium"} onValueChange={v => set("priority", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={f.status || "Active"} onValueChange={v => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Connection to Personal Outcome</Label>
                <Textarea value={f.connection_to_personal_outcome || ""} onChange={e => set("connection_to_personal_outcome", e.target.value)} rows={2} placeholder='e.g. "Angela wants to live independently someday — this goal supports that by building her meal prep skills so she can manage her own kitchen."' />
                <FieldHint>Link this goal to the person's broader life vision, dreams, or valued outcomes from their ISP.</FieldHint>
              </div>

              <div>
                <Label>Goal Narrative</Label>
                <Textarea value={f.goal_narrative || ""} onChange={e => set("goal_narrative", e.target.value)} rows={3} placeholder="Write a plain-language paragraph suitable for reading aloud at a care team meeting..." />
                <FieldHint>Should be understandable to family members and non-clinical staff. Avoid jargon. Include context, purpose, and what success looks like.</FieldHint>
              </div>
            </TabsContent>

            {/* ── TAB 2: PERSON-CENTERED ── */}
            <TabsContent value="personcentered" className="space-y-4 mt-4 pb-4">
              <SectionLabel>Person-Centered Foundation</SectionLabel>

              <div>
                <Label>Person's Own Words</Label>
                <Textarea value={f.persons_own_words || ""} onChange={e => set("persons_own_words", e.target.value)} rows={2} placeholder='What does this goal mean to the person, in their own words or as expressed to the team? e.g. "I want to make my own food."' />
                <FieldHint>Capture the person's voice, choices, and motivation for this goal directly from them or their circle of support.</FieldHint>
              </div>

              <div>
                <Label>Personal Strengths Relevant to This Goal</Label>
                <Textarea value={f.personal_strengths || ""} onChange={e => set("personal_strengths", e.target.value)} rows={2} placeholder="e.g. Strong visual learner, motivated by praise, enjoys routine, communicates well with familiar staff..." />
                <FieldHint>What does the person already do well that we can build on? Strengths-based planning starts here.</FieldHint>
              </div>

              <div>
                <Label>Preferred Engagement Strategies & Known Reinforcers</Label>
                <Textarea value={f.preferred_strategies || ""} onChange={e => set("preferred_strategies", e.target.value)} rows={2} placeholder="e.g. Verbal praise works best, prefers music during tasks, responds well to choice-making, visual schedules..." />
              </div>

              <div>
                <Label>Who the Person Wants Involved</Label>
                <Input value={f.preferred_people || ""} onChange={e => set("preferred_people", e.target.value)} placeholder="e.g. Prefers working with Maria (DSP), wants mom involved in review meetings, comfortable with job coach Sam..." />
                <FieldHint>Natural supports, specific staff, family members — whoever the person says makes them feel safe and supported.</FieldHint>
              </div>

              <div>
                <Label>Best Times of Day / Settings for Success</Label>
                <Input value={f.best_times_settings || ""} onChange={e => set("best_times_settings", e.target.value)} placeholder="e.g. Morning sessions work best, prefers the community kitchen over the group home, more focused after lunch..." />
              </div>

              <div>
                <Label>Trauma-Informed Considerations / Known Triggers to Avoid</Label>
                <Textarea value={f.trauma_considerations || ""} onChange={e => set("trauma_considerations", e.target.value)} rows={2} placeholder="e.g. Avoid physical prompting — sensory sensitivity. Do not rush or express frustration. Allow extra processing time..." />
                <FieldHint>This field is sensitive. Share only with team members directly supporting this goal. Focus on prevention and the person's safety.</FieldHint>
              </div>
            </TabsContent>

            {/* ── TAB 3: CLINICAL ── */}
            <TabsContent value="clinical" className="space-y-4 mt-4 pb-4">
              <SectionLabel>Baseline Assessment</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Baseline Description *</Label>
                  <Textarea value={f.baseline_description || f.baseline || ""} onChange={e => set("baseline_description", e.target.value)} rows={2} placeholder="Describe current performance level objectively and specifically. e.g. 'Currently requires full physical assist for all 5 steps of toothbrushing, 0/5 independent.'" />
                </div>
                <div>
                  <Label>Baseline Assessment Date</Label>
                  <Input type="date" value={f.baseline_date || ""} onChange={e => set("baseline_date", e.target.value)} />
                </div>
                <div>
                  <Label>Assessed By</Label>
                  <Input value={f.baseline_assessed_by || ""} onChange={e => set("baseline_assessed_by", e.target.value)} placeholder="Clinician or staff name" />
                </div>
              </div>

              <SectionLabel>Short-Term Objectives</SectionLabel>
              <p className="text-xs text-muted-foreground -mt-2 mb-2">Break the goal into 2–4 measurable milestone steps. Each objective should be observable and have its own target date.</p>
              {(f.objectives || []).map((obj, i) => (
                <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-muted/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-muted-foreground">Objective {i + 1}</span>
                    <button type="button" onClick={() => removeObjective(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <Input value={obj.title} onChange={e => updateObjective(i, "title", e.target.value)} placeholder="e.g. Will complete step 1 and 2 of task analysis with gestural prompt only, 3/5 trials" className="text-sm" />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-[11px]">Target Date</Label>
                      <Input type="date" value={obj.target_date} onChange={e => updateObjective(i, "target_date", e.target.value)} className="text-sm h-8" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-[11px]">Status</Label>
                      <Select value={obj.status} onValueChange={v => updateObjective(i, "status", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{OBJ_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addObjective} className="w-full text-xs gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Objective
              </Button>

              <SectionLabel>Mastery Criteria</SectionLabel>
              <div>
                <Label>Mastery Formula</Label>
                <Input value={f.mastery_criteria || f.target || ""} onChange={e => set("mastery_criteria", e.target.value)} placeholder="e.g. 80% accuracy across 3 consecutive sessions with 2 different staff in 2 different settings" />
                <FieldHint>Be specific: % or ratio, number of sessions, number of staff, number of settings. This is what defines "mastered."</FieldHint>
              </div>

              <SectionLabel>Prompting</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Current Prompt Level (Baseline)</Label>
                  <Select value={f.prompt_level_baseline || ""} onValueChange={v => set("prompt_level_baseline", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{PROMPT_LEVELS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Prompt Fading Plan</Label>
                  <Textarea value={f.prompt_fading_plan || ""} onChange={e => set("prompt_fading_plan", e.target.value)} rows={2} placeholder="e.g. Begin with verbal prompts, fade to indirect verbal cue after 3 sessions at criterion, then to independent." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Goal Start Date</Label>
                  <Input type="date" value={f.start_date || ""} onChange={e => set("start_date", e.target.value)} />
                </div>
                <div>
                  <Label>Target Mastery Date</Label>
                  <Input type="date" value={f.target_date || ""} onChange={e => set("target_date", e.target.value)} />
                </div>
              </div>
            </TabsContent>

            {/* ── TAB 4: MEASUREMENT ── */}
            <TabsContent value="measurement" className="space-y-4 mt-4 pb-4">
              <SectionLabel>Measurement Design</SectionLabel>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Primary Measurement Method *</Label>
                  <Select value={f.primary_measurement_method || ""} onValueChange={v => set("primary_measurement_method", v)}>
                    <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent>{MEASUREMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Secondary Measurement Method <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input value={f.secondary_measurement_method || ""} onChange={e => set("secondary_measurement_method", e.target.value)} placeholder="e.g. Anecdotal notes to capture qualitative observations" />
                </div>
                <div>
                  <Label>Minimum Trials Per Session</Label>
                  <Input type="number" min={1} value={f.minimum_trials_per_session || ""} onChange={e => set("minimum_trials_per_session", Number(e.target.value))} placeholder="e.g. 5" />
                  <FieldHint>Data from sessions with fewer than this many trials should be noted as invalid/partial.</FieldHint>
                </div>
                <div>
                  <Label>Data Collection Schedule</Label>
                  <Select value={f.data_collection_schedule || ""} onValueChange={v => set("data_collection_schedule", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{DATA_SCHEDULES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Who Collects Data</Label>
                  <Select value={f.data_collector_role || ""} onValueChange={v => set("data_collector_role", v)}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>{DATA_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Data Collection Instructions <span className="text-muted-foreground font-normal">(for DSP)</span></Label>
                <Textarea value={f.data_collection_instructions || ""} onChange={e => set("data_collection_instructions", e.target.value)} rows={4} placeholder="Write step-by-step instructions for a DSP who has never worked on this goal before. No clinical jargon. Example: 'At each meal, give Alex the chance to pour his own drink. Count how many times out of 5 he does it without help. Write the number (e.g. 3/5) in the data sheet.'" />
                <FieldHint>Write this as if training a brand-new staff member with no clinical background. Clear, specific, jargon-free.</FieldHint>
              </div>
            </TabsContent>

            {/* ── TAB 5: TEAM ── */}
            <TabsContent value="team" className="space-y-4 mt-4 pb-4">
              <SectionLabel>Team & Compliance</SectionLabel>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Goal Author</Label>
                  <Input value={f.goal_author || ""} onChange={e => set("goal_author", e.target.value)} placeholder="Name of person who wrote this goal" />
                </div>
                <div>
                  <Label>Supervising Clinician / BCBA</Label>
                  <Input value={f.supervising_clinician || ""} onChange={e => set("supervising_clinician", e.target.value)} placeholder="Clinical supervisor or behavior analyst" />
                </div>
                <div>
                  <Label>Next Scheduled Review Date</Label>
                  <Input type="date" value={f.next_review_date || ""} onChange={e => set("next_review_date", e.target.value)} />
                </div>
                <div>
                  <Label>Regulatory Framework</Label>
                  <Select value={f.regulatory_framework || ""} onValueChange={v => set("regulatory_framework", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{FRAMEWORKS.map(fw => <SelectItem key={fw} value={fw}>{fw}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Team Notes / Meeting Minutes</Label>
                <Textarea value={f.team_notes || ""} onChange={e => set("team_notes", e.target.value)} rows={4} placeholder="Record any team decisions, parent input, meeting notes, or plan modifications here..." />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="border-t border-border pt-3 shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-1.5">
              {["identity", "personcentered", "clinical", "measurement", "team"].map((t, i) => (
                <button key={t} onClick={() => setActiveTab(t)} className={cn("w-2 h-2 rounded-full transition-colors", activeTab === t ? "bg-primary" : "bg-border hover:bg-muted-foreground")} />
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={onSave} disabled={!isValid || saving}>
                {saving ? "Saving..." : editing ? "Update Goal" : "Create Goal"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}