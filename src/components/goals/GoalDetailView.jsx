import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle, Clock, Edit2, PlusCircle, Target, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import GoalAlerts from "./GoalAlerts";
import ProgressLogDialog from "./ProgressLogDialog";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const DOMAIN_COLORS = {
  "Communication": "bg-blue-100 text-blue-700 border-blue-200",
  "Activities of Daily Living": "bg-green-100 text-green-700 border-green-200",
  "Community Integration": "bg-teal-100 text-teal-700 border-teal-200",
  "Social Skills": "bg-purple-100 text-purple-700 border-purple-200",
  "Vocational/Employment": "bg-orange-100 text-orange-700 border-orange-200",
  "Health & Wellness": "bg-pink-100 text-pink-700 border-pink-200",
  "Behavioral Support": "bg-red-100 text-red-700 border-red-200",
  "Self-Advocacy": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Mobility & Motor Skills": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Leisure & Recreation": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Other": "bg-gray-100 text-gray-700 border-gray-200",
};

const STATUS_COLORS = {
  "Active": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Mastered": "bg-sky-100 text-sky-700 border-sky-200",
  "Discontinued": "bg-gray-100 text-gray-600 border-gray-200",
  "On Hold": "bg-amber-100 text-amber-700 border-amber-200",
};

const PRIORITY_COLORS = { High: "text-red-600", Medium: "text-amber-600", Low: "text-slate-500" };

const OBJ_STATUS_ICONS = {
  "Met": <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  "In Progress": <Clock className="w-4 h-4 text-amber-500" />,
  "Not Started": <Circle className="w-4 h-4 text-slate-300" />,
  "Not Met": <Circle className="w-4 h-4 text-red-400" />,
};

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-0.5">{label}</span>
      <span className="text-sm text-foreground leading-snug">{value}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">{title}</h4>
      <div className="space-y-0">{children}</div>
    </div>
  );
}

export default function GoalDetailView({ goal, onEdit, onUpdated }) {
  const [showLog, setShowLog] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientGoal.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["goals"] }); onUpdated?.(); },
  });

  const handleLogSave = (updated) => {
    updateMutation.mutate({ id: goal.id, data: updated });
  };

  const generateSummary = async () => {
    setLoadingAI(true);
    const entries = goal.progress_entries || [];
    const recent = entries.slice(-5);
    const prompt = `You are writing a progress summary for an ISP/PCP review meeting.
Goal: "${goal.goal_title}"
Domain: ${goal.domain}
Baseline: ${goal.baseline_description || goal.baseline || "Not specified"}
Mastery Criteria: ${goal.mastery_criteria || goal.target || "Not specified"}
Recent Progress Entries (last 5):
${recent.map(e => `- ${e.date}: ${e.score}${e.prompt_level ? ` | Prompt: ${e.prompt_level}` : ""}${e.notes ? ` | Notes: ${e.notes}` : ""}`).join("\n") || "No data entered yet."}
Write a 2-3 sentence plain-language progress summary suitable for reading aloud at a care team meeting. Be specific, strength-based, and professional. Do not use clinical jargon.`;

    const result = await base44.integrations.Core.InvokeLLM({ prompt });
    setAiSummary(result);
    setLoadingAI(false);
  };

  const entries = goal.progress_entries || [];
  const hasData = entries.length > 0;

  // Simple compliance calc
  const compliancePct = (() => {
    if (!hasData || !goal.mastery_criteria) return null;
    const pctMatch = goal.mastery_criteria.match(/(\d+)%/);
    if (!pctMatch) return null;
    const target = parseInt(pctMatch[1]);
    const scored = entries.filter(e => {
      const m = e.score?.match(/(\d+)%/) || e.score?.match(/(\d+)\/(\d+)/);
      return !!m;
    });
    if (scored.length === 0) return null;
    const avg = scored.reduce((sum, e) => {
      const m = e.score?.match(/(\d+)%/);
      if (m) return sum + parseInt(m[1]);
      const m2 = e.score?.match(/(\d+)\/(\d+)/);
      if (m2) return sum + Math.round((parseInt(m2[1]) / parseInt(m2[2])) * 100);
      return sum;
    }, 0) / scored.length;
    return { avg: Math.round(avg), target };
  })();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            {goal.priority && <span className={`text-xs font-bold uppercase ${PRIORITY_COLORS[goal.priority]}`}>{goal.priority} Priority</span>}
            <Badge variant="outline" className={`text-[10px] border ${DOMAIN_COLORS[goal.domain] || DOMAIN_COLORS.Other}`}>{goal.domain}</Badge>
            {goal.goal_type && <Badge variant="outline" className="text-[10px]">{goal.goal_type}</Badge>}
            <Badge variant="outline" className={`text-[10px] border ${STATUS_COLORS[goal.status] || ""}`}>{goal.status}</Badge>
          </div>
          <h3 className="font-semibold text-base leading-snug">{goal.goal_title}</h3>
          {goal.mastery_criteria && <p className="text-xs text-muted-foreground mt-1">Target: {goal.mastery_criteria}</p>}
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => setShowLog(true)}>
            <PlusCircle className="w-3 h-3" />Log
          </Button>
          <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" onClick={() => onEdit(goal)}>
            <Edit2 className="w-3 h-3" />Edit
          </Button>
        </div>
      </div>

      <GoalAlerts goal={goal} />

      {/* Compliance meter */}
      {compliancePct && (
        <div className="bg-slate-50 border border-border rounded-lg px-4 py-2.5 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Avg Score vs Target</span>
              <span className={`font-bold ${compliancePct.avg >= compliancePct.target ? "text-emerald-600" : compliancePct.avg >= compliancePct.target * 0.8 ? "text-amber-600" : "text-red-600"}`}>{compliancePct.avg}% / {compliancePct.target}%</span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${compliancePct.avg >= compliancePct.target ? "bg-emerald-500" : compliancePct.avg >= compliancePct.target * 0.8 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, Math.round((compliancePct.avg / compliancePct.target) * 100))}%` }} />
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{entries.length} entries</span>
        </div>
      )}

      <Tabs defaultValue="progress">
        <TabsList className="text-[11px]">
          <TabsTrigger value="progress" className="text-[11px]">Progress</TabsTrigger>
          <TabsTrigger value="details" className="text-[11px]">Goal Details</TabsTrigger>
          <TabsTrigger value="personcentered" className="text-[11px]">Person-Centered</TabsTrigger>
          <TabsTrigger value="team" className="text-[11px]">Team</TabsTrigger>
        </TabsList>

        {/* Progress Tab */}
        <TabsContent value="progress" className="mt-3">
          {goal.data_collection_instructions && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 mb-3">
              <p className="font-semibold mb-0.5">📋 Data Collection Instructions</p>
              <p>{goal.data_collection_instructions}</p>
            </div>
          )}

          {/* Objectives */}
          {(goal.objectives || []).length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Short-Term Objectives</p>
              <div className="space-y-1.5">
                {goal.objectives.map((obj, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm bg-muted/40 rounded-lg px-3 py-2">
                    <span className="mt-0.5">{OBJ_STATUS_ICONS[obj.status] || OBJ_STATUS_ICONS["Not Started"]}</span>
                    <div className="flex-1 min-w-0">
                      <span className={cn("leading-snug", obj.status === "Met" && "line-through text-muted-foreground")}>{obj.title}</span>
                      {obj.target_date && <span className="text-[10px] text-muted-foreground ml-2">by {obj.target_date}</span>}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{obj.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Summary */}
          <div className="mb-3">
            {aiSummary ? (
              <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2.5 text-xs text-foreground">
                <p className="font-semibold text-primary mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" />AI Progress Summary</p>
                <p className="leading-relaxed">{aiSummary}</p>
                <button onClick={() => setAiSummary(null)} className="text-[10px] text-muted-foreground mt-1 hover:underline">Dismiss</button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={generateSummary} disabled={loadingAI} className="text-xs h-7 gap-1.5">
                <Sparkles className="w-3 h-3" />
                {loadingAI ? "Generating..." : "Generate Progress Summary"}
              </Button>
            )}
          </div>

          {/* Progress log */}
          {!hasData ? (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              No progress data yet.
              <button onClick={() => setShowLog(true)} className="ml-2 text-primary hover:underline">Log the first entry →</button>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {[...entries].reverse().map((e, i) => (
                <div key={i} className="flex flex-wrap items-start gap-x-3 gap-y-0.5 text-xs bg-muted/40 rounded-lg px-3 py-2">
                  <span className="text-muted-foreground font-medium w-20 shrink-0">{e.date}</span>
                  <span className="font-semibold text-foreground">{e.score}</span>
                  {e.prompt_level && <span className="text-muted-foreground">Prompt: {e.prompt_level}</span>}
                  {e.setting && <span className="text-muted-foreground">📍 {e.setting}</span>}
                  {e.notes && <span className="text-muted-foreground italic col-span-full ml-20">{e.notes}</span>}
                  {e.recorded_by && <span className="text-muted-foreground ml-auto shrink-0">— {e.recorded_by}</span>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Goal Details Tab */}
        <TabsContent value="details" className="mt-3 space-y-0">
          <Section title="Baseline">
            <InfoRow label="Baseline Description" value={goal.baseline_description || goal.baseline} />
            <InfoRow label="Assessed" value={goal.baseline_date ? `${goal.baseline_date}${goal.baseline_assessed_by ? " by " + goal.baseline_assessed_by : ""}` : null} />
            <InfoRow label="Prompt Level at Baseline" value={goal.prompt_level_baseline} />
            <InfoRow label="Prompt Fading Plan" value={goal.prompt_fading_plan} />
          </Section>
          <Section title="Measurement">
            <InfoRow label="Primary Method" value={goal.primary_measurement_method || goal.method} />
            <InfoRow label="Secondary Method" value={goal.secondary_measurement_method} />
            <InfoRow label="Min Trials / Session" value={goal.minimum_trials_per_session ? `${goal.minimum_trials_per_session} trials` : null} />
            <InfoRow label="Collection Schedule" value={goal.data_collection_schedule || goal.frequency} />
            <InfoRow label="Who Collects Data" value={goal.data_collector_role} />
          </Section>
          <Section title="Plan Dates">
            <InfoRow label="Start Date" value={goal.start_date} />
            <InfoRow label="Target Mastery Date" value={goal.target_date} />
            <InfoRow label="Next Review" value={goal.next_review_date} />
            <InfoRow label="Regulatory Framework" value={goal.regulatory_framework} />
          </Section>
          {goal.goal_narrative && (
            <Section title="Goal Narrative">
              <p className="text-sm leading-relaxed text-foreground bg-muted/40 rounded-lg px-3 py-2.5">{goal.goal_narrative}</p>
            </Section>
          )}
          {goal.connection_to_personal_outcome && (
            <Section title="Connection to Personal Outcome">
              <p className="text-sm leading-relaxed text-foreground bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">{goal.connection_to_personal_outcome}</p>
            </Section>
          )}
        </TabsContent>

        {/* Person-Centered Tab */}
        <TabsContent value="personcentered" className="mt-3">
          {goal.persons_own_words && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 mb-3 text-sm italic text-emerald-800">
              <p className="text-[10px] font-bold uppercase text-emerald-600 mb-1 not-italic">In Their Own Words</p>
              "{goal.persons_own_words}"
            </div>
          )}
          <Section title="Strengths & Strategies">
            <InfoRow label="Personal Strengths" value={goal.personal_strengths} />
            <InfoRow label="Preferred Strategies & Reinforcers" value={goal.preferred_strategies} />
            <InfoRow label="Preferred People Involved" value={goal.preferred_people} />
            <InfoRow label="Best Times / Settings" value={goal.best_times_settings} />
          </Section>
          {goal.trauma_considerations && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5 text-sm">
              <p className="text-[10px] font-bold uppercase text-rose-600 mb-1">Trauma-Informed Considerations</p>
              <p className="text-rose-800">{goal.trauma_considerations}</p>
            </div>
          )}
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="mt-3">
          <Section title="Team">
            <InfoRow label="Goal Author" value={goal.goal_author} />
            <InfoRow label="Supervising Clinician" value={goal.supervising_clinician} />
          </Section>
          {goal.team_notes && (
            <Section title="Meeting Notes">
              <p className="text-sm leading-relaxed text-foreground bg-muted/40 rounded-lg px-3 py-2.5 whitespace-pre-wrap">{goal.team_notes}</p>
            </Section>
          )}
        </TabsContent>
      </Tabs>

      {showLog && (
        <ProgressLogDialog
          goal={goal}
          onClose={() => setShowLog(false)}
          onSave={handleLogSave}
        />
      )}
    </div>
  );
}