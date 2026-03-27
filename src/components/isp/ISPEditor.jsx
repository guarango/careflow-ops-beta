import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Wand2, ArrowLeft, Save, Plus, Trash2, Heart, Shield } from "lucide-react";
import { assembleISPDraft, DOMAINS } from "./ISPAssembler";
import { cn } from "@/lib/utils";

const SUPPORT_LEVELS = ["No Support", "Intermittent", "Limited", "Extensive", "Pervasive"];

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

export default function ISPEditor({ plan, clients, onSave, onCancel, saving }) {
  const isNew = !plan?.id;
  const [form, setForm] = useState(plan || {});
  const [assembling, setAssembling] = useState(false);
  const [assembled, setAssembled] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setNested = (section, key, val) => setForm(f => ({ ...f, [section]: { ...(f[section] || {}), [key]: val } }));

  const selectedClientId = form.client_id;

  const { data: goals = [] } = useQuery({
    queryKey: ["goals", selectedClientId],
    queryFn: () => selectedClientId ? base44.entities.ClientGoal.filter({ client_id: selectedClientId }) : Promise.resolve([]),
    enabled: !!selectedClientId,
  });
  const { data: sessionNotes = [] } = useQuery({
    queryKey: ["session-notes", selectedClientId],
    queryFn: () => selectedClientId ? base44.entities.SessionNote.filter({ client_id: selectedClientId }, "-date", 50) : Promise.resolve([]),
    enabled: !!selectedClientId,
  });
  const { data: bspList = [] } = useQuery({
    queryKey: ["bsp", selectedClientId],
    queryFn: () => selectedClientId ? base44.entities.BehaviorSupportPlan.filter({ client_id: selectedClientId }) : Promise.resolve([]),
    enabled: !!selectedClientId,
  });
  const { data: medications = [] } = useQuery({
    queryKey: ["medications", selectedClientId],
    queryFn: () => selectedClientId ? base44.entities.Medication.filter({ client_id: selectedClientId }) : Promise.resolve([]),
    enabled: !!selectedClientId,
  });
  const { data: authorizations = [] } = useQuery({
    queryKey: ["authorizations", selectedClientId],
    queryFn: () => selectedClientId ? base44.entities.Authorization.filter({ client_id: selectedClientId }) : Promise.resolve([]),
    enabled: !!selectedClientId,
  });

  const handleAssemble = () => {
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;
    setAssembling(true);
    const bsp = bspList.find(b => b.status === "Active") || bspList[0] || null;
    const draft = assembleISPDraft({ client, goals, sessionNotes, bsp, medications, authorizations });
    setForm(f => ({ ...f, ...draft, client_id: client.id }));
    setAssembled(true);
    setAssembling(false);
  };

  const flags = form.assembly_flags || [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />Back
        </button>
        <h2 className="font-bold text-lg flex-1">{isNew ? "New ISP / PCP" : `Editing: ${form.client_name}`}</h2>
        <div className="flex items-center gap-2">
          {selectedClientId && (
            <Button variant="outline" onClick={handleAssemble} disabled={assembling} className="gap-1.5">
              <Wand2 className="w-4 h-4" />{assembling ? "Assembling..." : assembled ? "Re-Assemble" : "Auto-Assemble Draft"}
            </Button>
          )}
          <Button onClick={() => onSave(form)} disabled={saving} className="gap-1.5">
            <Save className="w-4 h-4" />{saving ? "Saving..." : "Save Plan"}
          </Button>
        </div>
      </div>

      {flags.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 space-y-1">
          <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{flags.length} Required Fields Flagged Before Assembly</p>
          {flags.map((f, i) => <p key={i} className="text-xs text-amber-700">• {f}</p>)}
        </div>
      )}

      <Tabs defaultValue="identity">
        <TabsList className="flex-wrap h-auto gap-1 mb-5">
          <TabsTrigger value="identity">Identity</TabsTrigger>
          <TabsTrigger value="voice" className="text-violet-700">Person's Voice ★</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="domains">Life Domains</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="rights">Rights & Risks</TabsTrigger>
          <TabsTrigger value="team">Team Input</TabsTrigger>
          <TabsTrigger value="signatures">Signatures</TabsTrigger>
        </TabsList>

        {/* ── IDENTITY ── */}
        <TabsContent value="identity" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Client *">
              <Select value={form.client_id || ""} onValueChange={v => {
                const c = clients.find(x => x.id === v);
                setForm(f => ({ ...f, client_id: v, client_name: c ? `${c.first_name} ${c.last_name}` : "" }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Plan Type">
              <Select value={form.plan_type || "Annual Review"} onValueChange={v => set("plan_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Initial", "Annual Review", "Amendment"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Plan Year Start">
              <Input type="date" value={form.plan_year_start || ""} onChange={e => set("plan_year_start", e.target.value)} />
            </Field>
            <Field label="Plan Year End">
              <Input type="date" value={form.plan_year_end || ""} onChange={e => set("plan_year_end", e.target.value)} />
            </Field>
            <Field label="Planning Meeting Date">
              <Input type="date" value={form.planning_meeting_date || ""} onChange={e => set("planning_meeting_date", e.target.value)} />
            </Field>
            <Field label="Next Review Date">
              <Input type="date" value={form.next_review_date || ""} onChange={e => set("next_review_date", e.target.value)} />
            </Field>
            <Field label="Waiver Type">
              <Select value={form.waiver_type || ""} onValueChange={v => set("waiver_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{["HCBS Waiver", "ICF/IDD", "State-Funded", "Private Pay", "Other"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Medicaid ID">
              <Input value={form.medicaid_id || ""} onChange={e => set("medicaid_id", e.target.value)} />
            </Field>
            <Field label="Service Coordinator">
              <Input value={form.service_coordinator_name || ""} onChange={e => set("service_coordinator_name", e.target.value)} placeholder="Name" />
            </Field>
            <Field label="SC Agency">
              <Input value={form.service_coordinator_agency || ""} onChange={e => set("service_coordinator_agency", e.target.value)} placeholder="Agency name" />
            </Field>
            <Field label="Fiscal Intermediary">
              <Input value={form.fiscal_intermediary || ""} onChange={e => set("fiscal_intermediary", e.target.value)} />
            </Field>
            <Field label="Regulatory Framework">
              <Input value={form.regulatory_framework || ""} onChange={e => set("regulatory_framework", e.target.value)} placeholder="e.g., Utah DSPD HCBS Waiver standards" />
            </Field>
          </div>
        </TabsContent>

        {/* ── PERSON'S VOICE ── */}
        <TabsContent value="voice" className="space-y-4">
          <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 flex items-start gap-2 mb-2">
            <Heart className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
            <div className="text-xs text-violet-800">
              <strong>This section belongs to {form.client_name || "the person"}.</strong> It is written in first person, from their perspective. Staff and clinicians do not edit the content — only the person (or their communication support person) may revise it. Auto-Assembly populates this from "Person's Own Words" fields collected throughout the year.
            </div>
          </div>
          {[
            ["most_important_daily", "What is most important to me in my daily life"],
            ["what_to_know_before_supporting", "What I want people to know about me before they support me"],
            ["good_day_looks_like", "What a good day looks like for me"],
            ["bad_day_looks_like_and_helps", "What a bad day looks like — and what helps"],
            ["dreams_and_vision", "My dreams and long-term vision"],
            ["proud_of_this_year", "Things I am proud of this year"],
            ["wants_to_change_or_try", "Things I want to change or try"],
          ].map(([key, label]) => (
            <Field key={key} label={label}>
              <Textarea rows={2} value={(form.persons_voice || {})[key] || ""} onChange={e => setNested("persons_voice", key, e.target.value)} className="text-sm" />
            </Field>
          ))}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Communication method / AAC device used" hint="e.g., PECS, LAMP, speech-generating device, sign language">
              <Input value={(form.persons_voice || {}).aac_device_or_support || ""} onChange={e => setNested("persons_voice", "aac_device_or_support", e.target.value)} />
            </Field>
            <Field label="How their voice was captured" hint="e.g., direct participation, communication support person, AAC device">
              <Input value={(form.persons_voice || {}).voice_capture_method || ""} onChange={e => setNested("persons_voice", "voice_capture_method", e.target.value)} />
            </Field>
          </div>
        </TabsContent>

        {/* ── PROFILE ── */}
        <TabsContent value="profile" className="space-y-4">
          {[
            ["preferred_communication", "Preferred communication methods & AAC systems", null],
            ["sensory_preferences", "Sensory preferences and sensitivities", null],
            ["cultural_background", "Cultural background and practices important to this person", null],
            ["spiritual_preferences", "Religious or spiritual preferences", null],
            ["meaningful_relationships", "Meaningful relationships — family, friends, community, natural supports", "Not just paid staff. Who are the important people in this person's life?"],
            ["living_situation", "Living situation and housemates", null],
            ["daily_routine_preferences", "Daily routine preferences", null],
            ["food_preferences_restrictions", "Food preferences and restrictions", null],
            ["known_triggers_and_helps", "Known triggers and what helps during difficult moments", null],
            ["what_people_who_know_me_say", '"What people who know me best say about me"', "From family and support network input — not staff assessments"],
          ].map(([key, label, hint]) => (
            <Field key={key} label={label} hint={hint}>
              <Textarea rows={2} value={(form.personal_profile || {})[key] || ""} onChange={e => setNested("personal_profile", key, e.target.value)} className="text-sm" />
            </Field>
          ))}
        </TabsContent>

        {/* ── LIFE DOMAINS ── */}
        <TabsContent value="domains" className="space-y-4">
          <p className="text-xs text-muted-foreground">Auto-Assembly scores each domain from active goal data and session trends. Review and edit each domain's narrative.</p>
          {(form.life_domains || DOMAINS.map(d => ({ domain: d }))).map((domain, i) => (
            <div key={i} className="border border-border rounded-xl p-4 space-y-3">
              <p className="font-semibold text-sm">{domain.domain}</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Support Level">
                  <Select value={domain.support_level || ""} onValueChange={v => {
                    const arr = [...(form.life_domains || [])];
                    arr[i] = { ...arr[i], support_level: v };
                    set("life_domains", arr);
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{SUPPORT_LEVELS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Staffing Ratio">
                  <Input value={domain.staffing_ratio || ""} onChange={e => {
                    const arr = [...(form.life_domains || [])];
                    arr[i] = { ...arr[i], staffing_ratio: e.target.value };
                    set("life_domains", arr);
                  }} placeholder="e.g., 1:1, 1:3" />
                </Field>
              </div>
              {[
                ["current_function_narrative", "Current level of function"],
                ["progress_narrative", "Progress since last plan year"],
                ["strengths", "Areas of strength"],
                ["additional_support_needed", "Areas needing additional support"],
                ["persons_priorities", "Person's own priorities for this domain"],
                ["specialized_qualifications", "Specialized staff qualifications needed"],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="text-xs font-medium text-muted-foreground">{label}</label>
                  <Textarea rows={2} value={domain[key] || ""} onChange={e => {
                    const arr = [...(form.life_domains || [])];
                    arr[i] = { ...arr[i], [key]: e.target.value };
                    set("life_domains", arr);
                  }} className="text-sm mt-0.5" />
                </div>
              ))}
            </div>
          ))}
        </TabsContent>

        {/* ── HEALTH ── */}
        <TabsContent value="health" className="space-y-4">
          <p className="text-xs text-muted-foreground">Auto-assembled from health records and MAR. Review and supplement.</p>
          {[
            ["primary_diagnosis", "Primary Diagnosis"],
            ["secondary_diagnoses", "Secondary Diagnoses"],
            ["allergies", "Known Allergies & Contraindications"],
            ["physician_contacts", "Physician & Specialist Contacts"],
            ["hospitalizations_er", "Hospitalizations or ER Visits (past year — date and reason)"],
            ["standing_health_orders", "Standing Health Orders"],
            ["seizure_protocol", "Seizure Protocol (if applicable)"],
            ["dietary_orders", "Dietary Orders and Restrictions"],
            ["health_trend_narrative", "Health Trend Narrative (auto-generated — review and edit)"],
            ["health_changes_influencing_plan", "Health Changes That Influenced Goals or Support Needs This Year"],
          ].map(([key, label]) => (
            <Field key={key} label={label}>
              <Textarea rows={2} value={(form.health_summary || {})[key] || ""} onChange={e => setNested("health_summary", key, e.target.value)} className="text-sm" />
            </Field>
          ))}
        </TabsContent>

        {/* ── SERVICES ── */}
        <TabsContent value="services" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Auto-assembled from active authorizations. Flag and explain any service utilized below 70%.</p>
            <Button size="sm" variant="outline" onClick={() => set("service_grid", [...(form.service_grid || []), {}])} className="gap-1"><Plus className="w-3.5 h-3.5" />Add Service</Button>
          </div>
          {(form.service_grid || []).map((svc, i) => {
            const pct = svc.utilization_pct;
            const under = pct !== null && pct !== undefined && pct < 70;
            return (
              <div key={i} className={cn("border-2 rounded-xl p-4 space-y-3", under ? "border-amber-300 bg-amber-50" : "border-border")}>
                {under && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-800 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Underutilization flag: {pct}% of authorized units used. A written explanation is required — this is a Medicaid audit risk and person-centered concern.
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[["service_type","Service Type"],["provider_agency","Provider Agency"],["funding_source","Funding Source"],["auth_start","Auth Start"],["auth_end","Auth End"]].map(([key, label]) => (
                    <div key={key}>
                      <label className="text-[10px] text-muted-foreground">{label}</label>
                      <Input value={svc[key] || ""} onChange={e => {
                        const arr = [...(form.service_grid || [])];
                        arr[i] = { ...arr[i], [key]: e.target.value };
                        set("service_grid", arr);
                      }} className="text-xs h-7 mt-0.5" type={key.includes("_") && key.includes("start") || key.includes("end") ? "date" : "text"} />
                    </div>
                  ))}
                  <div>
                    <label className="text-[10px] text-muted-foreground">Auth Units/Month</label>
                    <Input type="number" value={svc.authorized_units_monthly || ""} onChange={e => {
                      const arr = [...(form.service_grid || [])]; arr[i] = { ...arr[i], authorized_units_monthly: Number(e.target.value) }; set("service_grid", arr);
                    }} className="text-xs h-7 mt-0.5" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Units Used (Prior Year)</label>
                    <Input type="number" value={svc.units_used_prior_year || ""} onChange={e => {
                      const arr = [...(form.service_grid || [])]; arr[i] = { ...arr[i], units_used_prior_year: Number(e.target.value) }; set("service_grid", arr);
                    }} className="text-xs h-7 mt-0.5" />
                  </div>
                </div>
                {under && (
                  <div>
                    <label className="text-xs font-semibold text-amber-800">Explanation for Underutilization (required) *</label>
                    <Textarea rows={2} value={svc.underutilization_explanation || ""} onChange={e => {
                      const arr = [...(form.service_grid || [])]; arr[i] = { ...arr[i], underutilization_explanation: e.target.value }; set("service_grid", arr);
                    }} className="text-sm mt-0.5" placeholder="Document why this service was underutilized and any corrective actions..." />
                  </div>
                )}
                <div>
                  <label className="text-[10px] text-muted-foreground">Coordinator Notes</label>
                  <Input value={svc.coordinator_notes || ""} onChange={e => {
                    const arr = [...(form.service_grid || [])]; arr[i] = { ...arr[i], coordinator_notes: e.target.value }; set("service_grid", arr);
                  }} className="text-xs h-7 mt-0.5" />
                </div>
                <button type="button" onClick={() => set("service_grid", (form.service_grid || []).filter((_, idx) => idx !== i))} className="text-xs text-destructive flex items-center gap-1"><Trash2 className="w-3 h-3" />Remove</button>
              </div>
            );
          })}
        </TabsContent>

        {/* ── RIGHTS & RISKS ── */}
        <TabsContent value="rights" className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <Shield className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-800">Rights restrictions require written justification. Dignity of risk entries document the person's autonomous choices — these are not incidents, they are examples of self-determination being honored.</p>
          </div>
          <Field label="Rights Statement" hint="Plain language, personalized — not boilerplate">
            <Textarea rows={3} value={(form.rights_risks || {}).rights_statement || ""} onChange={e => setNested("rights_risks", "rights_statement", e.target.value)} className="text-sm" />
          </Field>
          <Field label="Rights Restrictions Currently in Place (if any)" hint="Requires justification and authorization documentation">
            <Textarea rows={2} value={(form.rights_risks || {}).rights_restrictions || ""} onChange={e => setNested("rights_risks", "rights_restrictions", e.target.value)} className="text-sm" />
          </Field>
          {(form.rights_risks || {}).rights_restrictions && (
            <Field label="Justification for Rights Restriction *">
              <Textarea rows={2} value={(form.rights_risks || {}).rights_restriction_justification || ""} onChange={e => setNested("rights_risks", "rights_restriction_justification", e.target.value)} className="text-sm border-amber-300" />
            </Field>
          )}

          {/* Dignity of Risk */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <Label>Dignity of Risk</Label>
                <p className="text-xs text-muted-foreground">Areas where {form.client_name || "the person"} has chosen to take reasonable risks and the team has honored that choice. Required component of genuine person-centered planning.</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setNested("rights_risks", "dignity_of_risk", [...((form.rights_risks || {}).dignity_of_risk || []), {}])} className="gap-1"><Plus className="w-3.5 h-3.5" />Add</Button>
            </div>
            {((form.rights_risks || {}).dignity_of_risk || []).map((entry, i) => (
              <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2 mb-2">
                {[["area","Area of Life"],["persons_choice","Person's Choice / What They Want to Do"],["team_acknowledgment","Team Acknowledgment Statement"],["safeguards_in_place","Safeguards in Place (if any)"]].map(([key, label]) => (
                  <div key={key}>
                    <label className="text-[10px] font-medium text-muted-foreground">{label}</label>
                    <Input value={entry[key] || ""} onChange={e => {
                      const arr = [...((form.rights_risks || {}).dignity_of_risk || [])];
                      arr[i] = { ...arr[i], [key]: e.target.value };
                      setNested("rights_risks", "dignity_of_risk", arr);
                    }} className="text-xs h-7 mt-0.5" />
                  </div>
                ))}
                <button type="button" onClick={() => setNested("rights_risks", "dignity_of_risk", ((form.rights_risks || {}).dignity_of_risk || []).filter((_, idx) => idx !== i))} className="text-xs text-destructive flex items-center gap-1"><Trash2 className="w-3 h-3" />Remove</button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Guardianship / Decision-Making Status">
              <Select value={(form.rights_risks || {}).guardianship_status || ""} onValueChange={v => setNested("rights_risks", "guardianship_status", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{["No Guardian","Full Guardianship","Limited Guardianship","Supported Decision-Making","Power of Attorney","Unknown"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Advance Directive Status">
              <Select value={(form.rights_risks || {}).advance_directive_status || ""} onValueChange={v => setNested("rights_risks", "advance_directive_status", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{["None on File","On File","In Progress","Not Applicable"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Emergency & Crisis Plan">
            <Textarea rows={3} value={(form.rights_risks || {}).emergency_crisis_plan || ""} onChange={e => setNested("rights_risks", "emergency_crisis_plan", e.target.value)} className="text-sm" />
          </Field>
          <Field label="Financial Management Arrangements">
            <Textarea rows={2} value={(form.rights_risks || {}).financial_arrangements || ""} onChange={e => setNested("rights_risks", "financial_arrangements", e.target.value)} className="text-sm" />
          </Field>
        </TabsContent>

        {/* ── TEAM INPUT ── */}
        <TabsContent value="team" className="space-y-4">
          {/* Attendees */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Planning Meeting Attendees</Label>
              <Button size="sm" variant="outline" onClick={() => setNested("team_input", "attendees", [...((form.team_input || {}).attendees || []), {}])} className="gap-1"><Plus className="w-3.5 h-3.5" />Add</Button>
            </div>
            {((form.team_input || {}).attendees || []).map((att, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                <Input placeholder="Name" value={att.name || ""} onChange={e => { const arr=[...((form.team_input||{}).attendees||[])]; arr[i]={...arr[i],name:e.target.value}; setNested("team_input","attendees",arr); }} className="text-xs h-7" />
                <Input placeholder="Relationship" value={att.relationship || ""} onChange={e => { const arr=[...((form.team_input||{}).attendees||[])]; arr[i]={...arr[i],relationship:e.target.value}; setNested("team_input","attendees",arr); }} className="text-xs h-7" />
                <Select value={att.attendance_method || ""} onValueChange={v => { const arr=[...((form.team_input||{}).attendees||[])]; arr[i]={...arr[i],attendance_method:v}; setNested("team_input","attendees",arr); }}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="How" /></SelectTrigger>
                  <SelectContent>{["In Person","Phone","Written Input","Video"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <Field label="What the Team Heard from the Person" hint="Written in plain language — not clinical documentation language">
            <Textarea rows={3} value={(form.team_input || {}).what_team_heard || ""} onChange={e => setNested("team_input", "what_team_heard", e.target.value)} className="text-sm" />
          </Field>

          {/* Action Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Action Items</Label>
              <Button size="sm" variant="outline" onClick={() => setNested("team_input","action_items",[...((form.team_input||{}).action_items||[]),{}])} className="gap-1"><Plus className="w-3.5 h-3.5" />Add</Button>
            </div>
            {((form.team_input || {}).action_items || []).map((item, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                <Input placeholder="Action" value={item.action||""} onChange={e=>{const arr=[...((form.team_input||{}).action_items||[])];arr[i]={...arr[i],action:e.target.value};setNested("team_input","action_items",arr);}} className="text-xs h-7" />
                <Input placeholder="Responsible Party" value={item.responsible_party||""} onChange={e=>{const arr=[...((form.team_input||{}).action_items||[])];arr[i]={...arr[i],responsible_party:e.target.value};setNested("team_input","action_items",arr);}} className="text-xs h-7" />
                <Input type="date" value={item.due_date||""} onChange={e=>{const arr=[...((form.team_input||{}).action_items||[])];arr[i]={...arr[i],due_date:e.target.value};setNested("team_input","action_items",arr);}} className="text-xs h-7" />
              </div>
            ))}
          </div>

          {/* Unresolved Concerns */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Unresolved Concerns or Disagreements</Label>
              <Button size="sm" variant="outline" onClick={() => setNested("team_input","unresolved_concerns",[...((form.team_input||{}).unresolved_concerns||[]),{}])} className="gap-1"><Plus className="w-3.5 h-3.5" />Add</Button>
            </div>
            {((form.team_input || {}).unresolved_concerns || []).map((c, i) => (
              <div key={i} className="border border-amber-200 bg-amber-50 rounded-xl p-3 space-y-2 mb-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Concern" value={c.concern||""} onChange={e=>{const arr=[...((form.team_input||{}).unresolved_concerns||[])];arr[i]={...arr[i],concern:e.target.value};setNested("team_input","unresolved_concerns",arr);}} className="text-xs h-7" />
                  <Input placeholder="Raised by" value={c.raised_by||""} onChange={e=>{const arr=[...((form.team_input||{}).unresolved_concerns||[])];arr[i]={...arr[i],raised_by:e.target.value};setNested("team_input","unresolved_concerns",arr);}} className="text-xs h-7" />
                  <Input placeholder="Follow-up Owner" value={c.follow_up_owner||""} onChange={e=>{const arr=[...((form.team_input||{}).unresolved_concerns||[])];arr[i]={...arr[i],follow_up_owner:e.target.value};setNested("team_input","unresolved_concerns",arr);}} className="text-xs h-7" />
                  <Input type="date" value={c.due_date||""} onChange={e=>{const arr=[...((form.team_input||{}).unresolved_concerns||[])];arr[i]={...arr[i],due_date:e.target.value};setNested("team_input","unresolved_concerns",arr);}} className="text-xs h-7" />
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── SIGNATURES ── */}
        <TabsContent value="signatures" className="space-y-4">
          <div className="bg-slate-50 border border-border rounded-xl px-3 py-2.5 text-xs text-muted-foreground">
            Plans cannot be marked final until all required signatures are collected. If a guardian signs on behalf of the person, the system requires documentation of why the person did not sign independently. Any signatory may attach a written objection.
          </div>
          <div className="flex items-center justify-between">
            <Label>Required Signatories</Label>
            <Button size="sm" variant="outline" onClick={() => set("signatures", [...(form.signatures||[]),{role:"",name:"",email:"",status:"Pending"}])} className="gap-1"><Plus className="w-3.5 h-3.5" />Add</Button>
          </div>
          {(form.signatures || []).map((sig, i) => (
            <div key={i} className={cn("border-2 rounded-xl p-3 space-y-2", sig.status==="Signed"?"border-emerald-200 bg-emerald-50":sig.status==="Objected"?"border-red-200 bg-red-50":"border-border")}>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Role" value={sig.role||""} onChange={e=>{const arr=[...(form.signatures||[])];arr[i]={...arr[i],role:e.target.value};set("signatures",arr);}} className="text-xs h-7" />
                <Input placeholder="Name" value={sig.name||""} onChange={e=>{const arr=[...(form.signatures||[])];arr[i]={...arr[i],name:e.target.value};set("signatures",arr);}} className="text-xs h-7" />
                <Input placeholder="Email" value={sig.email||""} onChange={e=>{const arr=[...(form.signatures||[])];arr[i]={...arr[i],email:e.target.value};set("signatures",arr);}} className="text-xs h-7" />
              </div>
              {/* Guardian signing for person */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={sig.is_guardian_signing_for_person||false} onChange={e=>{const arr=[...(form.signatures||[])];arr[i]={...arr[i],is_guardian_signing_for_person:e.target.checked};set("signatures",arr);}} />
                <span className="text-xs text-muted-foreground">Guardian is signing on behalf of the person</span>
              </label>
              {sig.is_guardian_signing_for_person && (
                <div>
                  <label className="text-xs font-semibold text-amber-800">Why is the person not signing independently? (required) *</label>
                  <Textarea rows={2} value={sig.guardian_justification||""} onChange={e=>{const arr=[...(form.signatures||[])];arr[i]={...arr[i],guardian_justification:e.target.value};set("signatures",arr);}} className="text-xs mt-0.5 border-amber-300" placeholder="Document the specific reason — e.g., full guardianship order on file, cognitive assessment..." />
                </div>
              )}
              {sig.objection_note && (
                <div className="bg-red-100 rounded-lg p-2">
                  <p className="text-xs font-bold text-red-700">Written Objection Filed:</p>
                  <p className="text-xs text-red-700">{sig.objection_note}</p>
                </div>
              )}
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}