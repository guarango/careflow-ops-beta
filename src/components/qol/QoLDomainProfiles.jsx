import React, { useState } from "react";
import { QOL_DOMAINS, buildDomainTimeline, calcTrend, trendLabel, trendColor, interpretScore, detectPriorityDiscrepancy, getDomain } from "@/lib/qolEngine";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

const PRIORITY_COLORS = { high: "bg-red-100 text-red-800 border-red-300", medium: "bg-amber-100 text-amber-800 border-amber-300", low: "bg-slate-100 text-slate-700 border-slate-300" };

export default function QoLDomainProfiles({ client, assessments, goals, incidents, contacts, activities, lifeVision }) {
  const [selected, setSelected] = useState(QOL_DOMAINS[0].id);
  const latest = assessments[0];
  const name = `${client.first_name}`;

  return (
    <div className="flex gap-4">
      {/* Domain selector */}
      <div className="w-44 shrink-0 space-y-1">
        {QOL_DOMAINS.map(d => {
          const score = latest?.domain_ratings?.[d.id];
          const isSelected = selected === d.id;
          const color = score == null ? "bg-slate-100" : score >= 7 ? "bg-emerald-400" : score >= 5 ? "bg-amber-400" : "bg-red-400";
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelected(d.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between gap-2 text-sm",
                isSelected ? "bg-primary text-white" : "hover:bg-muted border border-border bg-white"
              )}
            >
              <span className="truncate">{d.label}</span>
              {score != null && <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-full text-white", color, isSelected && "opacity-90")}>{score}</span>}
            </button>
          );
        })}
      </div>

      {/* Domain detail */}
      <div className="flex-1 min-w-0">
        <DomainDetail
          domain={getDomain(selected)}
          client={client}
          assessments={assessments}
          latest={latest}
          goals={goals.filter(g => g.domain === getDomain(selected)?.label || g.domain?.toLowerCase().includes(selected.replace("_", " ").split("_")[0]))}
          incidents={incidents}
          contacts={contacts}
          activities={activities}
          lifeVision={lifeVision}
        />
      </div>
    </div>
  );
}

function DomainDetail({ domain, client, assessments, latest, goals, incidents, contacts, activities, lifeVision }) {
  if (!domain) return null;
  const timeline = buildDomainTimeline(assessments, domain.id);
  const trend = calcTrend(timeline.map(t => t.score));
  const currentScore = latest?.domain_ratings?.[domain.id];
  const personPriority = latest?.domain_person_priorities?.[domain.id];
  const teamPriority = null; // would come from ISP team assessment
  const discrepancy = detectPriorityDiscrepancy(personPriority, teamPriority);
  const interpretation = interpretScore(currentScore, domain, client.first_name);

  const personWords = latest?.persons_voice?.[getVoiceKey(domain.id)];
  const domainGoals = goals.filter(g => g.domain === domain.label);
  const domainIncidents = incidents.slice(0, 5);

  return (
    <div className={cn("border-2 rounded-2xl p-5", domain.borderClass, domain.bgClass)}>
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className={cn("font-bold text-lg", domain.colorClass)}>{domain.label}</h3>
          <p className="text-xs text-muted-foreground">{domain.description}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">HCBS: {domain.hcbs_indicator}</p>
        </div>
        <div className="text-right shrink-0">
          {currentScore != null ? (
            <>
              <p className={cn("text-3xl font-bold", domain.colorClass)}>{currentScore}<span className="text-sm font-normal text-muted-foreground">/10</span></p>
              <p className={cn("text-xs font-medium", trendColor(trend))}>{trendLabel(trend)}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Not yet rated</p>
          )}
        </div>
      </div>

      {/* Person's voice — always first */}
      {personWords && (
        <div className="bg-white border border-border rounded-xl p-4 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">{client.first_name}'s Own Words</p>
          <p className="text-sm italic text-foreground leading-relaxed">"{personWords}"</p>
        </div>
      )}
      {!personWords && (
        <div className="bg-white/60 border border-dashed border-border rounded-xl p-3 mb-4 text-center">
          <p className="text-xs text-muted-foreground">No verbatim input captured for this domain yet. Complete a QoL interview to capture {client.first_name}'s voice.</p>
        </div>
      )}

      {/* Interpretation */}
      {interpretation && <p className="text-xs text-muted-foreground mb-4 italic">{interpretation}</p>}

      {/* Priority discrepancy */}
      {personPriority && (
        <div className={cn("flex items-center gap-2 text-xs rounded-xl px-3 py-2 mb-3 border", discrepancy ? "bg-amber-50 border-amber-300 text-amber-800" : "bg-white border-border text-muted-foreground")}>
          {discrepancy && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
          <span><strong>{client.first_name} rates this domain priority: {personPriority}.</strong>{discrepancy && " This is higher than the team's current priority rating — this discrepancy must be addressed at the next planning meeting."}</span>
        </div>
      )}

      {/* Timeline chart */}
      {timeline.length >= 2 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-1">Score History</p>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={timeline}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={d => d.slice(5)} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 9 }} width={20} />
              <Tooltip formatter={v => `${v}/10`} />
              <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Objective sources */}
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Objective Data Sources</p>
        <div className="flex flex-wrap gap-1.5">
          {domain.objective_sources.map((src, i) => (
            <span key={i} className="text-[10px] bg-white border border-border px-2 py-0.5 rounded-full">{src}</span>
          ))}
        </div>
      </div>

      {/* Linked goals */}
      {domainGoals.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Linked Goals</p>
          <div className="space-y-1">
            {domainGoals.map((g, i) => (
              <div key={i} className="flex items-center justify-between bg-white border border-border rounded-xl px-3 py-1.5 text-xs">
                <span>{g.goal_title}</span>
                <Badge variant="outline" className="text-[10px]">{g.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getVoiceKey(domainId) {
  const map = {
    emotional_wellbeing: "good_day",
    interpersonal_relations: "important_people",
    social_inclusion: "community_activities",
    self_determination: "feels_listened_to",
    rights: "feels_safe",
    personal_development: "most_proud_of",
    material_wellbeing: "good_life_looks_like",
    physical_wellbeing: "good_day",
  };
  return map[domainId] || "good_life_looks_like";
}