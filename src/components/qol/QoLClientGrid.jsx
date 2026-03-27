import React, { useMemo } from "react";
import { QOL_DOMAINS, buildDomainTimeline, calcTrend, hasIntegratedActivityInDays, calcNetworkRatio } from "@/lib/qolEngine";
import { differenceInDays } from "date-fns";

export default function QoLClientGrid({ clients, assessments, contacts, activities, employment, milestones, onSelect }) {
  if (clients.length === 0) return (
    <p className="text-sm text-muted-foreground text-center py-16 border-dashed border-2 border-border rounded-xl">No active clients found.</p>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {clients.map(client => (
        <ClientQoLCard
          key={client.id}
          client={client}
          assessments={assessments.filter(a => a.client_id === client.id)}
          contacts={contacts.filter(c => c.client_id === client.id)}
          activities={activities.filter(a => a.client_id === client.id)}
          employment={employment.find(e => e.client_id === client.id)}
          milestones={milestones.filter(m => m.client_id === client.id)}
          onClick={() => onSelect(client.id)}
        />
      ))}
    </div>
  );
}

function ClientQoLCard({ client, assessments, contacts, activities, employment, milestones, onClick }) {
  const latest = assessments[0];
  const ratings = latest?.domain_ratings || {};

  const domainScores = QOL_DOMAINS.map(d => ({
    ...d,
    score: ratings[d.id] ?? null,
  }));

  const avgScore = domainScores.filter(d => d.score != null).length > 0
    ? Math.round(domainScores.filter(d => d.score != null).reduce((a, d) => a + d.score, 0) / domainScores.filter(d => d.score != null).length * 10) / 10
    : null;

  const netRatio = calcNetworkRatio(contacts);
  const hasIntegrated = hasIntegratedActivityInDays(activities, 60);
  const flags = [];
  if (!hasIntegrated && activities.length > 0) flags.push({ label: "No integrated activity (60d)", color: "bg-amber-100 text-amber-700" });
  if (netRatio.total > 0 && netRatio.ratio < 30) flags.push({ label: "Low natural support ratio", color: "bg-red-100 text-red-700" });
  const daysSinceAssessment = latest ? differenceInDays(new Date(), new Date(latest.assessment_date)) : null;
  if (daysSinceAssessment !== null && daysSinceAssessment > 120) flags.push({ label: `Check-in overdue (${daysSinceAssessment}d)`, color: "bg-orange-100 text-orange-700" });

  const empLabel = employment?.status === "Competitive Integrated Employment" ? "CIE" : employment?.status === "Supported Employment" ? "SE" : null;

  return (
    <button type="button" onClick={onClick} className="text-left bg-white border-2 border-border hover:border-primary/40 hover:shadow-md transition-all rounded-2xl p-4 group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-sm">{client.first_name} {client.last_name}</p>
          {avgScore != null && (
            <p className="text-xs text-muted-foreground mt-0.5">QoL Index: <span className={`font-bold ${avgScore >= 7 ? "text-emerald-600" : avgScore >= 5 ? "text-amber-600" : "text-red-600"}`}>{avgScore}/10</span></p>
          )}
          {!latest && <p className="text-xs text-muted-foreground">No assessment on file</p>}
        </div>
        {empLabel && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">{empLabel}</span>}
      </div>

      {/* Domain dots */}
      <div className="grid grid-cols-8 gap-1 mb-3">
        {QOL_DOMAINS.map(d => {
          const score = ratings[d.id];
          const color = score == null ? "bg-slate-100" : score >= 7 ? "bg-emerald-400" : score >= 5 ? "bg-amber-400" : "bg-red-400";
          return (
            <div key={d.id} title={`${d.label}: ${score ?? "—"}`} className={`h-3 w-full rounded-sm ${color}`} />
          );
        })}
      </div>
      <div className="flex gap-0.5 mb-3">
        {QOL_DOMAINS.map(d => <p key={d.id} className="flex-1 text-center text-[7px] text-muted-foreground leading-tight truncate">{d.label.split(" ")[0]}</p>)}
      </div>

      {/* Flags */}
      {flags.length > 0 && (
        <div className="flex flex-col gap-1">
          {flags.map((f, i) => (
            <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full ${f.color}`}>{f.label}</span>
          ))}
        </div>
      )}

      {/* Milestones */}
      {milestones.length > 0 && (
        <p className="text-[10px] text-emerald-700 mt-1.5">★ {milestones.slice(-1)[0].title}</p>
      )}
    </button>
  );
}