import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, TrendingDown, Users, Award, Clock, ShieldAlert } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { daysUntilExpiry } from "@/lib/trainingEngine";
import { format, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

export default function TrainingComplianceDashboard({ staffWithScores, records, library, remediations, onSelectStaff }) {
  const avgScore = staffWithScores.length
    ? Math.round(staffWithScores.reduce((a, s) => a + s.complianceScore, 0) / staffWithScores.length)
    : 0;

  const belowThreshold = staffWithScores.filter(s => s.complianceScore < 75);
  const amber = staffWithScores.filter(s => s.complianceScore >= 75 && s.complianceScore < 90);
  const green = staffWithScores.filter(s => s.complianceScore >= 90);

  // Expiring certifications within 90 days
  const expiring = useMemo(() => records.filter(r => {
    if (!r.expiration_date) return false;
    const days = daysUntilExpiry(r.expiration_date);
    return days !== null && days >= 0 && days <= 90;
  }).sort((a, b) => new Date(a.expiration_date) - new Date(b.expiration_date)), [records]);

  // HR-flagged remediations (3+ cycles)
  const hrFlagged = remediations.filter(r => r.hr_flag);
  const activeRemediations = remediations.filter(r => r.status === "Active");
  const overdueRemediations = remediations.filter(r => r.status === "Overdue");

  // Training pass rate analysis
  const trainingStats = useMemo(() => {
    const stats = {};
    records.forEach(r => {
      if (!stats[r.training_title]) stats[r.training_title] = { total: 0, passed: 0, failed: 0 };
      stats[r.training_title].total++;
      if (r.passed === true) stats[r.training_title].passed++;
      if (r.passed === false) stats[r.training_title].failed++;
    });
    return Object.entries(stats)
      .map(([title, s]) => ({ title, ...s, passRate: s.total ? Math.round((s.passed / s.total) * 100) : 0, remediationRate: s.total ? Math.round((s.failed / s.total) * 100) : 0 }))
      .filter(s => s.total >= 3)
      .sort((a, b) => a.passRate - b.passRate)
      .slice(0, 8);
  }, [records]);

  // Role compliance breakdown
  const roleBreakdown = useMemo(() => {
    const roles = {};
    staffWithScores.forEach(s => {
      if (!roles[s.role]) roles[s.role] = { total: 0, scoreSum: 0 };
      roles[s.role].total++;
      roles[s.role].scoreSum += s.complianceScore;
    });
    return Object.entries(roles).map(([role, d]) => ({ role, avg: Math.round(d.scoreSum / d.total) })).sort((a, b) => a.avg - b.avg);
  }, [staffWithScores]);

  const StatCard = ({ icon: IconComp, label, value, color, sub }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <IconComp className={`w-5 h-5 ${color} opacity-70`} />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* HR flags */}
      {hrFlagged.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl px-4 py-3 space-y-1">
          <p className="text-sm font-bold text-red-800 flex items-center gap-1.5"><ShieldAlert className="w-4 h-4" />{hrFlagged.length} HR Flag{hrFlagged.length !== 1 ? "s" : ""} — Repeated Remediation (3+ cycles)</p>
          {hrFlagged.map((r, i) => (
            <p key={i} className="text-xs text-red-700">• {r.staff_name} — {r.training_title} (cycle {r.cycle_number}). Formal performance review required.</p>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Agency Compliance Rate" value={`${avgScore}%`} color={avgScore >= 90 ? "text-emerald-600" : avgScore >= 75 ? "text-amber-600" : "text-red-600"} sub={`${green.length} green · ${amber.length} amber · ${belowThreshold.length} red`} />
        <StatCard icon={Clock} label="Expiring ≤90 Days" value={expiring.length} color="text-amber-600" sub="Certifications & trainings" />
        <StatCard icon={AlertTriangle} label="Active Remediations" value={activeRemediations.length} color="text-orange-600" sub={`${overdueRemediations.length} overdue`} />
        <StatCard icon={Award} label="Fully Compliant Staff" value={green.length} color="text-emerald-600" sub={`of ${staffWithScores.length} total`} />
      </div>

      {/* Below threshold */}
      {belowThreshold.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-red-700"><AlertTriangle className="w-4 h-4" />Staff Below Compliance Threshold (&lt;75%)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {belowThreshold.map(s => (
              <button key={s.id} type="button" onClick={() => onSelectStaff(s.id)} className="text-left border-2 border-red-300 bg-red-50 rounded-xl p-3 hover:shadow-sm transition-all">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{s.first_name} {s.last_name}</p>
                  <span className="text-red-700 font-bold">{s.complianceScore}%</span>
                </div>
                <p className="text-xs text-muted-foreground">{s.role}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Expiring certs */}
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-sm font-semibold mb-3">Certifications Expiring Within 90 Days</p>
          {expiring.length === 0 ? <p className="text-xs text-muted-foreground text-center py-6">No certifications expiring soon.</p> : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {expiring.map((r, i) => {
                const days = daysUntilExpiry(r.expiration_date);
                const tier = days <= 30 ? "text-red-700 bg-red-100" : days <= 60 ? "text-amber-700 bg-amber-100" : "text-blue-700 bg-blue-100";
                return (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                    <div>
                      <p className="text-xs font-medium">{r.staff_name}</p>
                      <p className="text-[10px] text-muted-foreground">{r.training_title}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tier}`}>
                      {days === 0 ? "Expires today" : days > 0 ? `${days}d` : "Expired"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Role breakdown */}
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-sm font-semibold mb-3">Compliance by Role</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={roleBreakdown} layout="vertical" margin={{ left: 0, right: 30 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
              <YAxis type="category" dataKey="role" tick={{ fontSize: 10 }} width={110} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="avg" radius={[0, 4, 4, 0]}
                fill="hsl(var(--primary))"
                label={{ position: "right", fontSize: 10, formatter: (v) => `${v}%` }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Training quality — low pass rates */}
        <div className="bg-white border border-border rounded-xl p-4 lg:col-span-2">
          <div className="flex items-start gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Training Quality Analysis</p>
              <p className="text-xs text-muted-foreground">If remediation rate exceeds 30%, the curriculum — not the staff — may be the problem. These trainings warrant a content review.</p>
            </div>
          </div>
          {trainingStats.filter(t => t.remediationRate > 0).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No training quality flags at this time.</p>
          ) : (
            <div className="space-y-2">
              {trainingStats.map((t, i) => (
                <div key={i} className={cn("flex items-center justify-between py-2 border-b border-border last:border-0 px-2 rounded", t.remediationRate >= 30 && "bg-amber-50")}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{t.title}</p>
                    <p className="text-[10px] text-muted-foreground">{t.total} staff · {t.passed} passed · {t.failed} failed</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", t.passRate >= 80 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>Pass: {t.passRate}%</span>
                    {t.remediationRate >= 30 && <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-300"><AlertTriangle className="w-3 h-3 mr-0.5" />Review Curriculum</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}