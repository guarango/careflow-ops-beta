import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, FileText, Download, AlertTriangle, CheckCircle2, Clock, Pen, Heart, Shield, Users } from "lucide-react";
import ISPGoalsSummary from "./ISPGoalsSummary";
import ISPSignaturePanel from "./ISPSignaturePanel";
import ISPPDFExport from "./ISPPDFExport";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const SectionBlock = ({ title, children, className }) => (
  <div className={cn("bg-white border border-border rounded-xl p-4 space-y-3", className)}>
    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
    {children}
  </div>
);

const KV = ({ label, value }) => value ? (
  <div><p className="text-[10px] text-muted-foreground">{label}</p><p className="text-sm">{value}</p></div>
) : null;

const STATUS_COLORS = {
  "Draft": "bg-slate-100 text-slate-600",
  "In Review": "bg-blue-100 text-blue-700",
  "Pending Signatures": "bg-amber-100 text-amber-700",
  "Active": "bg-emerald-100 text-emerald-700",
  "Archived": "bg-slate-100 text-slate-500",
  "Amended": "bg-purple-100 text-purple-700",
};

export default function ISPDetailView({ plan, onEdit, onBack, onUpdate, updating }) {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: goals = [] } = useQuery({
    queryKey: ["goals", plan.client_id],
    queryFn: () => base44.entities.ClientGoal.filter({ client_id: plan.client_id }),
    enabled: !!plan.client_id,
  });

  const sigTotal = (plan.signatures || []).length;
  const sigSigned = (plan.signatures || []).filter(s => s.status === "Signed").length;
  const allSigned = sigTotal > 0 && sigSigned === sigTotal;
  const hasObjection = (plan.signatures || []).some(s => s.status === "Objected");
  const underutilizedUnclearCount = (plan.service_grid || []).filter(s => s.underutilized && !s.underutilization_explanation).length;

  const handleMarkActive = () => {
    onUpdate({
      ...plan,
      status: "Active",
      version_history: [...(plan.version_history || []), {
        version: plan.version || 1,
        saved_at: new Date().toISOString(),
        saved_by: "System",
        summary_of_changes: "Plan finalized and activated",
        is_amendment: false,
      }]
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-1">
          <ArrowLeft className="w-4 h-4" />Back
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-lg">{plan.client_name}</h2>
            <Badge className={cn("text-xs", STATUS_COLORS[plan.status])} variant="outline">{plan.status}</Badge>
            <span className="text-xs text-muted-foreground">{plan.plan_type}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {plan.plan_year_start && format(new Date(plan.plan_year_start), "MMM d, yyyy")} – {plan.plan_year_end && format(new Date(plan.plan_year_end), "MMM d, yyyy")}
            {plan.service_coordinator_name && ` · SC: ${plan.service_coordinator_name}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onEdit} className="gap-1.5"><Edit className="w-4 h-4" />Edit</Button>
          <ISPPDFExport plan={plan} goals={goals} />
        </div>
      </div>

      {/* Status banners */}
      {(plan.assembly_flags || []).length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 space-y-1">
          <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{plan.assembly_flags.length} Outstanding Flags</p>
          {plan.assembly_flags.map((f, i) => <p key={i} className="text-xs text-amber-700">• {f}</p>)}
        </div>
      )}
      {hasObjection && (
        <div className="mb-4 bg-red-50 border-2 border-red-300 rounded-xl px-4 py-3">
          <p className="text-sm text-red-800 font-semibold">⚠ Written objection filed — follow-up workflow required before plan can be finalized.</p>
        </div>
      )}
      {underutilizedUnclearCount > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
          <p className="text-sm text-amber-800"><AlertTriangle className="w-4 h-4 inline mr-1" />{underutilizedUnclearCount} underutilized service{underutilizedUnclearCount !== 1 ? "s" : ""} without explanation — Medicaid audit risk.</p>
        </div>
      )}
      {allSigned && plan.status !== "Active" && (
        <div className="mb-4 bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-emerald-800 font-semibold">All signatures collected — ready to activate.</p>
          <Button size="sm" onClick={handleMarkActive} disabled={updating}><CheckCircle2 className="w-4 h-4 mr-1" />Activate Plan</Button>
        </div>
      )}
      {plan.status !== "Pending Signatures" && plan.status !== "Active" && sigTotal > 0 && (
        <div className="mb-4 bg-slate-50 border border-border rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{sigSigned}/{sigTotal} signatures collected</p>
          <Button size="sm" variant="outline" onClick={() => onUpdate({ ...plan, status: "Pending Signatures" })} disabled={updating}><Pen className="w-4 h-4 mr-1" />Send for Signatures</Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 mb-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="voice" className="text-violet-700">Person's Voice</TabsTrigger>
          <TabsTrigger value="domains">Life Domains</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="rights">Rights & Risks</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="signatures">
            Signatures {sigTotal > 0 && <span className={cn("ml-1 text-xs", allSigned ? "text-emerald-600" : "text-amber-600")}>{sigSigned}/{sigTotal}</span>}
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SectionBlock title="Plan Identity">
              <KV label="Client" value={plan.client_name} />
              <KV label="Medicaid ID" value={plan.medicaid_id} />
              <KV label="Plan Type" value={plan.plan_type} />
              <KV label="Waiver Type" value={plan.waiver_type} />
              <KV label="Funding Source" value={plan.funding_source} />
              <KV label="Regulatory Framework" value={plan.regulatory_framework} />
              <KV label="Plan Year" value={plan.plan_year_start && plan.plan_year_end ? `${format(new Date(plan.plan_year_start),"MMM d, yyyy")} – ${format(new Date(plan.plan_year_end),"MMM d, yyyy")}` : ""} />
              <KV label="Planning Meeting" value={plan.planning_meeting_date ? format(new Date(plan.planning_meeting_date), "MMMM d, yyyy") : ""} />
              <KV label="Next Review" value={plan.next_review_date ? format(new Date(plan.next_review_date), "MMMM d, yyyy") : ""} />
            </SectionBlock>
            <SectionBlock title="Coordination">
              <KV label="Service Coordinator" value={plan.service_coordinator_name} />
              <KV label="SC Agency" value={plan.service_coordinator_agency} />
              <KV label="Fiscal Intermediary" value={plan.fiscal_intermediary} />
            </SectionBlock>
            <SectionBlock title="Behavioral Support">
              <KV label="BSP Status" value={(plan.bsp_summary || {}).bsp_status} />
              <KV label="Supervising BCBA" value={(plan.bsp_summary || {}).supervising_bcba} />
              {(plan.bsp_summary || {}).behavioral_summary_narrative && <p className="text-sm">{plan.bsp_summary.behavioral_summary_narrative}</p>}
            </SectionBlock>
            <SectionBlock title="Version History">
              {(plan.version_history || []).length === 0 ? <p className="text-xs text-muted-foreground">No revisions yet.</p> : (
                <div className="space-y-2">
                  {[...(plan.version_history || [])].reverse().map((v, i) => (
                    <div key={i} className="text-xs">
                      <p className="font-semibold">v{v.version} {v.is_amendment && <Badge className="text-[10px]" variant="outline">Amendment</Badge>}</p>
                      <p className="text-muted-foreground">{v.saved_at ? format(new Date(v.saved_at), "MMM d, yyyy") : ""} — {v.saved_by}</p>
                      <p>{v.summary_of_changes}</p>
                    </div>
                  ))}
                </div>
              )}
            </SectionBlock>
          </div>
        </TabsContent>

        {/* PERSON'S VOICE */}
        <TabsContent value="voice">
          <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
            <Heart className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
            <p className="text-xs text-violet-800">This section was written by or for {plan.client_name}. It appears first in the plan because it is the most important part.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ["most_important_daily","What is most important to me in my daily life"],
              ["what_to_know_before_supporting","What I want people to know before they support me"],
              ["good_day_looks_like","What a good day looks like"],
              ["bad_day_looks_like_and_helps","What a bad day looks like — and what helps"],
              ["dreams_and_vision","My dreams and long-term vision"],
              ["proud_of_this_year","Things I am proud of this year"],
              ["wants_to_change_or_try","Things I want to change or try"],
            ].map(([key, label]) => (
              <div key={key} className="bg-white border border-violet-100 rounded-xl p-3">
                <p className="text-[10px] font-bold text-violet-600 uppercase mb-1">{label}</p>
                <p className="text-sm leading-relaxed">{(plan.persons_voice || {})[key] || <span className="text-muted-foreground italic">Not yet captured</span>}</p>
              </div>
            ))}
          </div>
          {((plan.persons_voice || {}).aac_device_or_support) && (
            <div className="mt-4 bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-800">
              <strong>Communication / AAC:</strong> {plan.persons_voice.aac_device_or_support}<br />
              <strong>Voice captured via:</strong> {plan.persons_voice.voice_capture_method}
            </div>
          )}
        </TabsContent>

        {/* LIFE DOMAINS */}
        <TabsContent value="domains">
          <div className="space-y-4">
            {(plan.life_domains || []).map((d, i) => (
              <div key={i} className="border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-sm">{d.domain}</p>
                  <div className="flex gap-1.5">
                    {d.support_level && <Badge variant="outline" className="text-xs">{d.support_level}</Badge>}
                    {d.staffing_ratio && <Badge variant="outline" className="text-xs">{d.staffing_ratio}</Badge>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {d.current_function_narrative && <div><p className="text-[10px] font-semibold text-muted-foreground mb-1">Current Function</p><p>{d.current_function_narrative}</p></div>}
                  {d.progress_narrative && <div><p className="text-[10px] font-semibold text-muted-foreground mb-1">Progress This Year</p><p>{d.progress_narrative}</p></div>}
                  {d.strengths && <div><p className="text-[10px] font-semibold text-emerald-700 mb-1">Strengths</p><p>{d.strengths}</p></div>}
                  {d.additional_support_needed && <div><p className="text-[10px] font-semibold text-amber-700 mb-1">Additional Support Needed</p><p>{d.additional_support_needed}</p></div>}
                  {d.persons_priorities && <div className="sm:col-span-2"><p className="text-[10px] font-semibold text-violet-700 mb-1">Person's Priorities</p><p>{d.persons_priorities}</p></div>}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* GOALS */}
        <TabsContent value="goals">
          <ISPGoalsSummary goals={goals} clientName={plan.client_name} />
        </TabsContent>

        {/* HEALTH */}
        <TabsContent value="health">
          <SectionBlock title="Health Summary">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(plan.health_summary || {}).map(([key, val]) => val ? (
                <KV key={key} label={key.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())} value={val} />
              ) : null)}
            </div>
          </SectionBlock>
        </TabsContent>

        {/* SERVICES */}
        <TabsContent value="services">
          <div className="space-y-3">
            {(plan.service_grid || []).map((svc, i) => {
              const under = svc.underutilized;
              return (
                <div key={i} className={cn("border-2 rounded-xl p-4", under && !svc.underutilization_explanation ? "border-red-300 bg-red-50" : under ? "border-amber-200 bg-amber-50" : "border-border")}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm">{svc.service_type}</p>
                    <div className="flex gap-1.5">
                      {svc.utilization_pct !== null && svc.utilization_pct !== undefined && (
                        <Badge variant="outline" className={cn("text-xs", svc.utilization_pct < 70 ? "border-red-300 text-red-700" : "border-emerald-300 text-emerald-700")}>{svc.utilization_pct}% utilized</Badge>
                      )}
                      {under && !svc.underutilization_explanation && <Badge className="text-xs bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3 mr-0.5" />Explanation Required</Badge>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <KV label="Provider Agency" value={svc.provider_agency} />
                    <KV label="Funding" value={svc.funding_source} />
                    <KV label="Auth Units/Month" value={svc.authorized_units_monthly?.toString()} />
                    <KV label="Units Used (Prior Year)" value={svc.units_used_prior_year?.toString()} />
                    <KV label="Auth Dates" value={svc.auth_start && svc.auth_end ? `${svc.auth_start} – ${svc.auth_end}` : ""} />
                  </div>
                  {svc.underutilization_explanation && (
                    <div className="mt-2 text-xs"><p className="font-semibold text-amber-700">Underutilization Explanation:</p><p>{svc.underutilization_explanation}</p></div>
                  )}
                  {svc.coordinator_notes && <p className="text-xs text-muted-foreground mt-1">{svc.coordinator_notes}</p>}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* RIGHTS & RISKS */}
        <TabsContent value="rights">
          <div className="space-y-4">
            <SectionBlock title="Rights">
              {(plan.rights_risks || {}).rights_statement && <p className="text-sm">{plan.rights_risks.rights_statement}</p>}
              <KV label="Guardianship Status" value={(plan.rights_risks || {}).guardianship_status} />
              <KV label="Advance Directive" value={(plan.rights_risks || {}).advance_directive_status} />
            </SectionBlock>
            {(plan.rights_risks || {}).rights_restrictions && (
              <SectionBlock title="Rights Restrictions" className="border-amber-200">
                <p className="text-sm">{plan.rights_risks.rights_restrictions}</p>
                {plan.rights_risks.rights_restriction_justification && <div className="bg-amber-50 rounded-lg p-2 text-sm"><p className="text-xs font-semibold text-amber-700 mb-1">Justification:</p>{plan.rights_risks.rights_restriction_justification}</div>}
              </SectionBlock>
            )}
            {((plan.rights_risks || {}).dignity_of_risk || []).length > 0 && (
              <SectionBlock title="Dignity of Risk — Person's Autonomous Choices">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2 text-xs text-amber-800">These entries document choices the person has made that involve reasonable risk. The team has honored these choices as an expression of self-determination. These are not incidents.</div>
                {plan.rights_risks.dignity_of_risk.map((e, i) => (
                  <div key={i} className="border border-amber-200 rounded-xl p-3 space-y-1">
                    <p className="font-semibold text-sm">{e.area}</p>
                    <p className="text-xs"><strong>Their choice:</strong> {e.persons_choice}</p>
                    <p className="text-xs"><strong>Team acknowledgment:</strong> {e.team_acknowledgment}</p>
                    {e.safeguards_in_place && <p className="text-xs"><strong>Safeguards:</strong> {e.safeguards_in_place}</p>}
                  </div>
                ))}
              </SectionBlock>
            )}
            <SectionBlock title="Emergency & Crisis Plan">
              <p className="text-sm">{(plan.rights_risks || {}).emergency_crisis_plan || <span className="text-muted-foreground italic">Not documented</span>}</p>
            </SectionBlock>
          </div>
        </TabsContent>

        {/* TEAM */}
        <TabsContent value="team">
          <div className="space-y-4">
            <SectionBlock title="Planning Meeting Attendees">
              {((plan.team_input || {}).attendees || []).length === 0 ? <p className="text-xs text-muted-foreground">No attendees documented</p> : (
                <div className="space-y-1">
                  {plan.team_input.attendees.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm py-1 border-b border-border last:border-0">
                      <span className="font-medium flex-1">{a.name}</span>
                      <span className="text-muted-foreground text-xs">{a.relationship}</span>
                      <Badge variant="outline" className="text-xs">{a.attendance_method}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </SectionBlock>
            {(plan.team_input || {}).what_team_heard && (
              <SectionBlock title="What the Team Heard from the Person">
                <p className="text-sm leading-relaxed">{plan.team_input.what_team_heard}</p>
              </SectionBlock>
            )}
            {((plan.team_input || {}).action_items || []).length > 0 && (
              <SectionBlock title="Action Items">
                {plan.team_input.action_items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm py-1 border-b border-border last:border-0">
                    <span className="flex-1">{item.action}</span>
                    <span className="text-muted-foreground text-xs">{item.responsible_party}</span>
                    <span className="text-xs text-muted-foreground">{item.due_date}</span>
                  </div>
                ))}
              </SectionBlock>
            )}
            {((plan.team_input || {}).unresolved_concerns || []).length > 0 && (
              <SectionBlock title="Unresolved Concerns" className="border-amber-200">
                {plan.team_input.unresolved_concerns.map((c, i) => (
                  <div key={i} className="bg-amber-50 rounded-lg p-3 text-sm space-y-1 mb-2">
                    <p className="font-medium">{c.concern}</p>
                    <p className="text-xs text-muted-foreground">Raised by: {c.raised_by} · Owner: {c.follow_up_owner} · Due: {c.due_date}</p>
                  </div>
                ))}
              </SectionBlock>
            )}
          </div>
        </TabsContent>

        {/* SIGNATURES */}
        <TabsContent value="signatures">
          <ISPSignaturePanel plan={plan} onUpdate={onUpdate} updating={updating} />
        </TabsContent>
      </Tabs>
    </div>
  );
}