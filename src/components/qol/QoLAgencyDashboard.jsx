import React, { useMemo } from "react";
import { QOL_DOMAINS, calcNetworkRatio, hasIntegratedActivityInDays, EMPLOYMENT_STATUS_LABELS } from "@/lib/qolEngine";
import { AlertTriangle, Users, Briefcase, Globe, TrendingDown, Shield } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { cn } from "@/lib/utils";

const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#6b7280", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316"];

export default function QoLAgencyDashboard({ clients, assessments, contacts, activities, employment, goals, lifeVisions }) {
  const totalClients = clients.length;

  // Average domain scores across all clients
  const domainAverages = useMemo(() => {
    return QOL_DOMAINS.map(d => {
      const scores = assessments.filter(a => a.domain_ratings?.[d.id] != null).map(a => a.domain_ratings[d.id]);
      const avg = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
      return { domain: d.label.split(" ")[0], avg, color: d.colorClass, count: scores.length };
    });
  }, [assessments]);

  // Employment breakdown
  const empBreakdown = useMemo(() => {
    const counts = {};
    employment.forEach(e => {
      const label = EMPLOYMENT_STATUS_LABELS[e.status]?.label || e.status;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [employment]);

  const cieCount = employment.filter(e => e.status === "Competitive Integrated Employment").length;
  const ciePct = totalClients > 0 ? Math.round((cieCount / totalClients) * 100) : 0;

  // Network ratio analysis
  const networkFindings = useMemo(() => {
    return clients.map(c => {
      const clientContacts = contacts.filter(x => x.client_id === c.id);
      const ratio = calcNetworkRatio(clientContacts);
      return { ...c, ratio: ratio.ratio, total: ratio.total, natural: ratio.natural, paid: ratio.paid };
    }).filter(c => c.total >= 2).sort((a, b) => a.ratio - b.ratio);
  }, [clients, contacts]);

  const avgNaturalRatio = networkFindings.length > 0
    ? Math.round(networkFindings.reduce((a, c) => a + c.ratio, 0) / networkFindings.length)
    : null;

  const lowNaturalRatio = networkFindings.filter(c => c.ratio < 30);

  // Community integration
  const noIntegrated60 = clients.filter(c => {
    const cActivities = activities.filter(a => a.client_id === c.id);
    return cActivities.length > 0 && !hasIntegratedActivityInDays(cActivities, 60);
  });

  // Clients with declining QoL (latest score vs previous)
  const decliningClients = useMemo(() => {
    return clients.filter(c => {
      const clientAssessments = assessments.filter(a => a.client_id === c.id).sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date));
      if (clientAssessments.length < 2) return false;
      const latest = clientAssessments[0];
      const prev = clientAssessments[1];
      const latestAvg = Object.values(latest.domain_ratings || {}).reduce((a, b) => a + b, 0) / Math.max(Object.values(latest.domain_ratings || {}).length, 1);
      const prevAvg = Object.values(prev.domain_ratings || {}).reduce((a, b) => a + b, 0) / Math.max(Object.values(prev.domain_ratings || {}).length, 1);
      return (prevAvg - latestAvg) >= 1;
    });
  }, [clients, assessments]);

  // Employment aspiration gaps
  const aspirationGaps = useMemo(() => {
    return clients.filter(c => {
      const vision = lifeVisions.find(v => v.client_id === c.id);
      if (!vision) return false;
      const aspiresEmployment = vision.employment_aspiration && !["Day Program", "No Interest in Employment", "Unsure"].includes(vision.employment_aspiration);
      const hasGoal = goals.some(g => g.client_id === c.id && (g.domain === "Vocational/Employment" || g.goal_title?.toLowerCase().includes("employ")));
      return aspiresEmployment && !hasGoal;
    });
  }, [clients, lifeVisions, goals]);

  const StatCard = ({ icon: IconComp, label, value, color, sub, alert }) => (
    <div className={cn("border-2 rounded-xl p-4", alert ? "border-red-300 bg-red-50" : "border-border bg-white")}>
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={cn("text-2xl font-bold mt-0.5", color)}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <IconComp className={cn("w-5 h-5 opacity-60", color)} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {(decliningClients.length > 0 || lowNaturalRatio.length > 0 || noIntegrated60.length > 0 || aspirationGaps.length > 0) && (
        <div className="space-y-2">
          {decliningClients.length > 0 && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl px-4 py-3">
              <p className="text-sm font-bold text-red-800 flex items-center gap-2 mb-1"><TrendingDown className="w-4 h-4" />{decliningClients.length} Client{decliningClients.length !== 1 ? "s" : ""} with Declining QoL — Needs Clinical Attention</p>
              {decliningClients.map((c, i) => <p key={i} className="text-xs text-red-700">• {c.first_name} {c.last_name}</p>)}
            </div>
          )}
          {aspirationGaps.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-3">
              <p className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4" />{aspirationGaps.length} Employment Aspiration Gap{aspirationGaps.length !== 1 ? "s" : ""} — Person Wants Employment, No Goal Exists</p>
              {aspirationGaps.map((c, i) => <p key={i} className="text-xs text-amber-700">• {c.first_name} {c.last_name}</p>)}
            </div>
          )}
          {noIntegrated60.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-amber-800">{noIntegrated60.length} client{noIntegrated60.length !== 1 ? "s" : ""} without integrated community activity in 60+ days (HCBS compliance risk)</p>
            </div>
          )}
          {lowNaturalRatio.length > 0 && (
            <div className="bg-orange-50 border border-orange-300 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-orange-800">{lowNaturalRatio.length} client{lowNaturalRatio.length !== 1 ? "s" : ""} with &lt;30% natural support ratio — community inclusion plans need review</p>
            </div>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Briefcase} label="In Competitive Employment" value={`${ciePct}%`} color="text-emerald-600" sub={`${cieCount} of ${totalClients} clients`} />
        <StatCard icon={Users} label="Avg Natural Support Ratio" value={avgNaturalRatio != null ? `${avgNaturalRatio}%` : "—"} color={avgNaturalRatio != null && avgNaturalRatio < 30 ? "text-red-600" : "text-blue-600"} sub="Natural vs. paid relationships" alert={avgNaturalRatio != null && avgNaturalRatio < 30} />
        <StatCard icon={Globe} label="No Integrated Activity (60d)" value={noIntegrated60.length} color="text-amber-600" sub={`of ${clients.filter(c => activities.some(a => a.client_id === c.id)).length} tracked`} />
        <StatCard icon={TrendingDown} label="Declining QoL" value={decliningClients.length} color="text-red-600" sub="Assessment-over-assessment drop" alert={decliningClients.length > 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Domain averages */}
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-sm font-semibold mb-3">Average QoL Domain Scores (Agency-Wide)</p>
          {domainAverages.every(d => d.avg === null) ? (
            <p className="text-xs text-muted-foreground text-center py-6">No assessment data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={domainAverages} layout="vertical">
                <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 9 }} />
                <YAxis type="category" dataKey="domain" tick={{ fontSize: 9 }} width={80} />
                <Tooltip formatter={v => v != null ? `${v}/10` : "No data"} />
                <Bar dataKey="avg" radius={[0, 4, 4, 0]} fill="hsl(var(--primary))"
                  label={{ position: "right", fontSize: 9, formatter: v => v != null ? v : "" }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Employment breakdown */}
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-sm font-semibold mb-3">Employment Status Distribution</p>
          {empBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No employment records yet.</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={empBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                    {empBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1">
                {empBreakdown.map((e, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="flex-1 truncate">{e.name}</span>
                    <span className="font-medium">{e.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Network ratio — the uncomfortable finding */}
        <div className="bg-white border border-border rounded-xl p-4 lg:col-span-2">
          <div className="flex items-start gap-2 mb-3">
            <Shield className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Paid Support Ratio — The Finding That Matters</p>
              <p className="text-xs text-muted-foreground">Every agency says they deliver community inclusion. This measures whether the people served actually have friends. A network composed primarily of paid supporters is not community inclusion — it is a civil rights concern.</p>
            </div>
          </div>
          {networkFindings.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No network data yet. Start mapping relationships on individual client profiles.</p>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {networkFindings.map((c, i) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="w-28 truncate font-medium">{c.first_name} {c.last_name}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${c.ratio}%` }} />
                  </div>
                  <span className={cn("w-10 text-right font-bold", c.ratio < 30 ? "text-red-600" : c.ratio < 50 ? "text-amber-600" : "text-emerald-600")}>{c.ratio}%</span>
                  <span className="text-muted-foreground w-24">{c.natural} natural · {c.paid} paid</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}