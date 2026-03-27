import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, AlertTriangle, CheckCircle2, Heart } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import BSPIncidentLogger from "./BSPIncidentLogger";
import BSPAnalytics from "./BSPAnalytics";
import BSPStaffAcknowledgment from "./BSPStaffAcknowledgment";
import BSPRevisionLog from "./BSPRevisionLog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const FUNCTION_COLORS = {
  "Escape/Avoidance": "bg-purple-100 text-purple-700",
  "Attention": "bg-blue-100 text-blue-700",
  "Access to Tangibles": "bg-amber-100 text-amber-700",
  "Sensory/Automatic": "bg-teal-100 text-teal-700",
  "Communication": "bg-emerald-100 text-emerald-700",
  "Unknown": "bg-slate-100 text-slate-600"
};

function BehaviorReadView({ b }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button type="button" className="w-full flex items-center justify-between px-4 py-3 text-left bg-muted/30 hover:bg-muted/50 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{b.name}</span>
          {b.function && <Badge variant="outline" className={cn("text-xs", FUNCTION_COLORS[b.function])}>{b.function}</Badge>}
          {b.measurement_method && <span className="text-xs text-muted-foreground">{b.measurement_method}</span>}
          {(b.reactive_strategies || []).some(r => r.is_restrictive) && (
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          )}
        </div>
        <span className="text-xs text-muted-foreground ml-2">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="p-4 space-y-4">
          {b.topography && (
            <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Operational Definition</p><p className="text-sm">{b.topography}</p></div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs font-semibold text-emerald-700 mb-1">Examples (what counts)</p>{(b.examples || []).filter(Boolean).map((e, i) => <p key={i} className="text-xs">• {e}</p>)}</div>
            <div><p className="text-xs font-semibold text-red-700 mb-1">Non-Examples (what does NOT count)</p>{(b.non_examples || []).filter(Boolean).map((e, i) => <p key={i} className="text-xs">• {e}</p>)}</div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[["Mild", b.severity_mild, "amber"], ["Moderate", b.severity_moderate, "orange"], ["Severe", b.severity_severe, "red"]].map(([tier, desc, color]) => desc && (
              <div key={tier} className={`rounded-lg p-2 bg-${color}-50 border border-${color}-200`}>
                <p className={`text-[10px] font-bold text-${color}-700 mb-0.5`}>{tier}</p>
                <p className="text-xs">{desc}</p>
              </div>
            ))}
          </div>
          {b.baseline_rate && <p className="text-xs text-muted-foreground"><strong>Baseline:</strong> {b.baseline_rate} {b.baseline_date && `(assessed ${b.baseline_date})`}</p>}

          {b.replacement_behavior?.definition && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
              <p className="text-xs font-bold text-sky-700 mb-1">Replacement Behavior (FERB)</p>
              <p className="text-sm font-medium">{b.replacement_behavior.definition}</p>
              {b.replacement_behavior.functional_match_explanation && <p className="text-xs text-sky-600 mt-1 italic">{b.replacement_behavior.functional_match_explanation}</p>}
              {b.replacement_behavior.prompt_procedure && <p className="text-xs mt-2"><strong>How to prompt:</strong> {b.replacement_behavior.prompt_procedure}</p>}
              {b.replacement_behavior.reinforcement_procedure && <p className="text-xs mt-1"><strong>How to reinforce:</strong> {b.replacement_behavior.reinforcement_procedure}</p>}
            </div>
          )}

          {(b.antecedent_strategies?.triggers_to_avoid || []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-700 mb-2 uppercase tracking-wide">⚠ Triggers to Actively Avoid</p>
              {b.antecedent_strategies.triggers_to_avoid.map((t, i) => (
                <div key={i} className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-1.5 grid grid-cols-2 gap-2 text-xs">
                  <div><strong>Trigger:</strong> {t.trigger}</div>
                  <div><strong>Staff Action:</strong> {t.required_staff_action}</div>
                </div>
              ))}
            </div>
          )}

          {(b.reactive_strategies || []).map((r, i) => (
            <div key={i} className={cn("border-2 rounded-xl p-3 space-y-2", r.severity_tier === "Mild" ? "border-amber-200 bg-amber-50" : r.severity_tier === "Moderate" ? "border-orange-200 bg-orange-50" : "border-red-200 bg-red-50")}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold">{r.severity_tier} Response Protocol</p>
                {r.is_restrictive && <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Restrictive</span>}
              </div>
              {(r.steps || []).filter(Boolean).length > 0 && (
                <ol className="space-y-1 list-none">
                  {r.steps.filter(Boolean).map((s, si) => <li key={si} className="text-xs flex gap-2"><span className="font-bold text-muted-foreground shrink-0">{si + 1}.</span>{s}</li>)}
                </ol>
              )}
              {(r.helpful_phrases || []).filter(Boolean).length > 0 && (
                <div><p className="text-[10px] font-semibold text-emerald-700 mb-1">✓ Say:</p>{r.helpful_phrases.filter(Boolean).map((p, pi) => <p key={pi} className="text-xs">"{p}"</p>)}</div>
              )}
              {(r.phrases_to_avoid || []).filter(Boolean).length > 0 && (
                <div><p className="text-[10px] font-semibold text-red-700 mb-1">✗ Avoid saying:</p>{r.phrases_to_avoid.filter(Boolean).map((p, pi) => <p key={pi} className="text-xs">"{p}"</p>)}</div>
              )}
              {(r.contraindicated_responses || []).filter(Boolean).length > 0 && (
                <div className="bg-red-100 rounded-lg px-2 py-1.5"><p className="text-[10px] font-bold text-red-800 mb-1">🚫 Never do:</p>{r.contraindicated_responses.filter(Boolean).map((c, ci) => <p key={ci} className="text-xs text-red-700">• {c}</p>)}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BSPDetailView({ bsp: initialBsp, onEdit, onBack }) {
  const queryClient = useQueryClient();

  const { data: incidents = [] } = useQuery({
    queryKey: ["behavior-incidents", initialBsp.id],
    queryFn: () => base44.entities.BehaviorIncident.filter({ bsp_id: initialBsp.id }, "-date"),
  });

  const { data: bspLive = initialBsp } = useQuery({
    queryKey: ["bsp", initialBsp.id],
    queryFn: () => base44.entities.BehaviorSupportPlan.filter({ id: initialBsp.id }).then(r => r[0] || initialBsp),
  });

  const bsp = bspLive;

  const logIncidentMutation = useMutation({
    mutationFn: (data) => base44.entities.BehaviorIncident.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["behavior-incidents", bsp.id] }),
  });

  const updateBspMutation = useMutation({
    mutationFn: (data) => base44.entities.BehaviorSupportPlan.update(bsp.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bsp", bsp.id] }),
  });

  const restrictiveWeek = incidents.filter(i => {
    const d = new Date(i.date);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return i.restrictive_procedure_used && d >= weekAgo;
  }).length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-3">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-1">
          <ArrowLeft className="w-4 h-4" />Back
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-lg">{bsp.client_name}</h2>
            <StatusBadge status={bsp.status} />
            {bsp.includes_restrictive_procedures && (
              <Badge variant="outline" className="border-red-300 text-red-700 text-xs flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />Restrictive Procedures
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {bsp.bsp_author} · {bsp.bsp_author_credential}
            {bsp.next_review_date && ` · Review due: ${format(new Date(bsp.next_review_date), "MMM d, yyyy")}`}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onEdit} className="gap-1.5 shrink-0">
          <Edit className="w-4 h-4" />Edit Plan
        </Button>
      </div>

      {/* Critical alerts */}
      {restrictiveWeek > 3 && (
        <div className="mb-4 bg-red-50 border-2 border-red-300 rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-800"><strong>⚠ Alert:</strong> Restrictive procedure used {restrictiveWeek} times in the past 7 days. Supervisor review required.</p>
        </div>
      )}

      {/* Pending approval */}
      {bsp.status === "Pending Approval" && (
        <div className="mb-4 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
          <p className="text-sm text-amber-800"><strong>Pending administrator approval</strong> — This plan includes restrictive procedures and requires co-signature before activation.</p>
          <Button size="sm" onClick={() => updateBspMutation.mutate({ ...bsp, status: "Active", administrator_cosigned_at: new Date().toISOString() })} disabled={updateBspMutation.isPending}>
            <CheckCircle2 className="w-4 h-4 mr-1" />Approve & Activate
          </Button>
        </div>
      )}

      {/* Plain language summary */}
      {bsp.plain_language_summary && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-bold text-amber-700 mb-1.5">Family & Person Summary</p>
          <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">{bsp.plain_language_summary}</p>
        </div>
      )}

      <Tabs defaultValue="plan">
        <TabsList className="flex-wrap h-auto gap-1 mb-5">
          <TabsTrigger value="plan">Support Plan</TabsTrigger>
          <TabsTrigger value="incidents">Incident Log ({incidents.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="training">Staff Training</TabsTrigger>
          <TabsTrigger value="revisions">Revisions</TabsTrigger>
        </TabsList>

        <TabsContent value="plan">
          {/* FBA */}
          {(bsp.fba_reason_for_referral || bsp.fba_summary_narrative) && (
            <div className="mb-5 bg-white border border-border rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Functional Behavior Assessment Summary</p>
              {bsp.fba_reason_for_referral && <div className="mb-3"><p className="text-xs font-semibold mb-1">Reason for Referral</p><p className="text-sm">{bsp.fba_reason_for_referral}</p></div>}
              {bsp.fba_diagnostic_context && <div className="mb-3"><p className="text-xs font-semibold mb-1">Diagnostic Context</p><p className="text-sm">{bsp.fba_diagnostic_context}</p></div>}
              {bsp.fba_assessment_methods?.length > 0 && <div className="mb-3"><p className="text-xs font-semibold mb-1">Assessment Methods</p><div className="flex flex-wrap gap-1">{bsp.fba_assessment_methods.map(m => <Badge key={m} variant="outline" className="text-xs">{m}</Badge>)}</div></div>}
              {bsp.fba_environmental_factors && <div className="mb-3"><p className="text-xs font-semibold mb-1">Environmental Factors</p><p className="text-sm">{bsp.fba_environmental_factors}</p></div>}
              {bsp.fba_summary_narrative && <div><p className="text-xs font-semibold mb-1">Summary</p><p className="text-sm">{bsp.fba_summary_narrative}</p></div>}
            </div>
          )}

          {/* Target Behaviors */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-4 h-4 text-violet-500" />
              <p className="text-sm font-semibold">Target Behaviors</p>
              <p className="text-xs text-muted-foreground">— behaviors are communication, not character</p>
            </div>
            {(bsp.target_behaviors || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 border-dashed border-2 border-border rounded-xl">No target behaviors defined yet. Edit the plan to add behaviors.</p>
            ) : (
              <div className="space-y-3">
                {(bsp.target_behaviors || []).map((b, i) => <BehaviorReadView key={b.id || i} b={b} />)}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="incidents">
          <BSPIncidentLogger bsp={bsp} incidents={incidents} onLog={(data) => logIncidentMutation.mutate(data)} logging={logIncidentMutation.isPending} />
        </TabsContent>

        <TabsContent value="analytics">
          <BSPAnalytics bsp={bsp} incidents={incidents} />
        </TabsContent>

        <TabsContent value="training">
          <BSPStaffAcknowledgment bsp={bsp} onUpdate={(updated) => updateBspMutation.mutate(updated)} updating={updateBspMutation.isPending} />
        </TabsContent>

        <TabsContent value="revisions">
          <BSPRevisionLog bsp={bsp} onUpdate={(updated) => updateBspMutation.mutate(updated)} updating={updateBspMutation.isPending} />
        </TabsContent>
      </Tabs>
    </div>
  );
}