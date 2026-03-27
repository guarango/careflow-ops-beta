import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Archive, Sparkles } from "lucide-react";

const DOMAIN_GOAL_MAP = {
  "Communication": ["Communication"],
  "Health & Wellness": ["Health & Wellness"],
  "Relationships & Social Connections": ["Social Skills"],
  "Community Participation & Inclusion": ["Community Integration"],
  "Employment & Day Activities": ["Vocational/Employment"],
  "Home & Daily Living Skills": ["Activities of Daily Living"],
  "Safety & Rights": ["Behavioral Support"],
  "Recreation & Leisure": ["Leisure & Recreation"],
  "Self-Advocacy & Decision-Making": ["Self-Advocacy"],
};

const STATUS_COLORS = {
  Active: "bg-emerald-100 text-emerald-700",
  Mastered: "bg-blue-100 text-blue-700",
  Discontinued: "bg-slate-100 text-slate-500",
  "On Hold": "bg-amber-100 text-amber-700",
};

function GoalCard({ goal }) {
  const latestEntry = (goal.progress_entries || []).slice(-1)[0];
  return (
    <div className="border border-border rounded-xl p-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm">{goal.goal_title}</p>
        <Badge className={`${STATUS_COLORS[goal.status] || ""} text-xs shrink-0`} variant="outline">{goal.status}</Badge>
      </div>
      {goal.goal_narrative && <p className="text-xs text-muted-foreground">{goal.goal_narrative}</p>}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {goal.primary_measurement_method && <span>{goal.primary_measurement_method}</span>}
        {goal.mastery_criteria && <span>Mastery: {goal.mastery_criteria}</span>}
        {latestEntry && <span>Last data: {latestEntry.date} — {latestEntry.score}</span>}
      </div>
      {(goal.objectives || []).filter(o => o.title).length > 0 && (
        <div className="space-y-0.5 mt-1">
          {goal.objectives.filter(o => o.title).map((obj, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              {obj.status === "Met" ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <span className="w-3 h-3 rounded-full border border-border inline-block shrink-0" />}
              <span className={obj.status === "Met" ? "line-through text-muted-foreground" : ""}>{obj.title}</span>
              {obj.status && <Badge className="text-[10px] py-0 px-1" variant="outline">{obj.status}</Badge>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ISPGoalsSummary({ goals, clientName }) {
  const active = goals.filter(g => g.status === "Active");
  const mastered = goals.filter(g => g.status === "Mastered");
  const discontinued = goals.filter(g => g.status === "Discontinued");

  const domainGroups = {};
  active.forEach(g => {
    const domain = Object.keys(DOMAIN_GOAL_MAP).find(d => DOMAIN_GOAL_MAP[d].includes(g.domain)) || g.domain || "Other";
    if (!domainGroups[domain]) domainGroups[domain] = [];
    domainGroups[domain].push(g);
  });

  return (
    <div className="space-y-6">
      {/* Active Goals by Domain */}
      {Object.entries(domainGroups).map(([domain, dGoals]) => (
        <div key={domain}>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">{domain}</p>
          <div className="space-y-2">
            {dGoals.map(g => <GoalCard key={g.id} goal={g} />)}
          </div>
        </div>
      ))}

      {active.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8 border-dashed border-2 border-border rounded-xl">No active goals found for {clientName}.</p>
      )}

      {/* Achievements */}
      {mastered.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Achievements This Plan Year — Mastered Goals</p>
          </div>
          <div className="space-y-2">
            {mastered.map(g => <GoalCard key={g.id} goal={g} />)}
          </div>
        </div>
      )}

      {/* Archived / Discontinued */}
      {discontinued.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Archive className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Archived Goals</p>
          </div>
          <div className="space-y-2">
            {discontinued.map(g => <GoalCard key={g.id} goal={g} />)}
          </div>
        </div>
      )}
    </div>
  );
}