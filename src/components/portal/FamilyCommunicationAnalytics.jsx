import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { MessageSquare, AlertTriangle, TrendingUp, TrendingDown, Users, FileText, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#6b7280", "#8b5cf6"];

export default function FamilyCommunicationAnalytics() {
  const { data: messages = [] } = useQuery({
    queryKey: ["all-portal-messages-analytics"],
    queryFn: () => base44.entities.PortalMessage.list("-sent_at", 500),
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["all-highlight-reports-analytics"],
    queryFn: () => base44.entities.FamilyHighlightReport.list("-report_week_start", 100),
  });

  const { data: grievances = [] } = useQuery({
    queryKey: ["all-grievances-analytics"],
    queryFn: () => base44.entities.PortalGrievance.list("-submitted_date", 200),
  });

  const { data: surveys = [] } = useQuery({
    queryKey: ["all-surveys-analytics"],
    queryFn: () => base44.entities.FamilySatisfactionSurvey.list("-submitted_date", 200),
  });

  const { data: inputs = [] } = useQuery({
    queryKey: ["all-inputs-analytics"],
    queryFn: () => base44.entities.FamilyInputForm.list("-submitted_date", 200),
  });

  // Response time analysis (staff messages to portal user messages)
  const staffMessages = messages.filter(m => m.sender_type === "Staff");
  const familyMessages = messages.filter(m => m.sender_type === "Portal User");

  // Report open rates
  const sentReports = reports.filter(r => r.status === "Sent");
  const openedReports = sentReports.filter(r => r.recipients?.some(rec => rec.opened));
  const openRate = sentReports.length > 0 ? Math.round((openedReports.length / sentReports.length) * 100) : null;

  // Grievance categories
  const grievanceCats = grievances.reduce((acc, g) => {
    acc[g.grievance_type] = (acc[g.grievance_type] || 0) + 1;
    return acc;
  }, {});
  const grievanceChartData = Object.entries(grievanceCats).map(([name, value]) => ({ name, value }));

  // Overdue acknowledgments
  const overdueGrievances = grievances.filter(g => {
    const hours = g.submitted_date ? Math.round((Date.now() - new Date(g.submitted_date).getTime()) / 3600000) : 0;
    return hours > 24 && g.status === "Submitted";
  });

  // Satisfaction averages
  const avgSat = (key) => {
    const vals = surveys.filter(s => s[key] != null).map(s => s[key]);
    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
  };

  const satScores = [
    { label: "Feel Informed", key: "feel_informed", avg: avgSat("feel_informed") },
    { label: "Feel Heard", key: "feel_heard", avg: avgSat("feel_heard") },
    { label: "Trust the Team", key: "trust_team", avg: avgSat("trust_team") },
    { label: "Would Recommend", key: "would_recommend", avg: avgSat("would_recommend") },
  ];

  const avgOverall = satScores.filter(s => s.avg).reduce((a, s) => a + parseFloat(s.avg), 0) / satScores.filter(s => s.avg).length;

  // ISP input submission rate
  const inputSubmitted = inputs.filter(i => i.status !== "Pending").length;

  // Monthly message volume
  const monthlyMsgs = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const label = d.toLocaleString("default", { month: "short" });
    const month = d.getMonth();
    const year = d.getFullYear();
    const count = messages.filter(m => {
      const md = new Date(m.sent_at || m.created_date);
      return md.getMonth() === month && md.getFullYear() === year;
    }).length;
    return { label, count };
  });

  const StatCard = ({ icon: IconComp, label, value, sub, alert, trend }) => (
    <div className={cn("border-2 rounded-xl p-4 bg-white", alert ? "border-red-300" : "border-border")}>
      <div className="flex items-start justify-between mb-1">
        <IconComp className={cn("w-5 h-5 opacity-60", alert ? "text-red-500" : "text-primary")} />
        {trend === "up" && <TrendingUp className="w-4 h-4 text-emerald-500" />}
        {trend === "down" && <TrendingDown className="w-4 h-4 text-red-500" />}
      </div>
      <p className={cn("text-2xl font-bold mt-1", alert ? "text-red-600" : "text-foreground")}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />Communication Quality Dashboard
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">Family trust is not a soft metric — it is one of the strongest leading indicators of agency quality.</p>
      </div>

      {overdueGrievances.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-800">{overdueGrievances.length} grievance{overdueGrievances.length !== 1 ? "s" : ""} past 24-hour acknowledgment window</p>
            <p className="text-xs text-red-700">This is a compliance issue. Grievances require acknowledgment within 24 hours of submission.</p>
          </div>
        </div>
      )}

      {avgOverall > 0 && avgOverall < 3 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
          <p className="text-sm font-bold text-red-800">Family Satisfaction Alert — Director Review Required</p>
          <p className="text-xs text-red-700 mt-1">Average satisfaction score is {avgOverall.toFixed(1)}/5. Declining satisfaction scores generate this alert. The director should review program-level trends.</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={MessageSquare} label="Family Messages" value={familyMessages.length} sub="All time" />
        <StatCard icon={FileText} label="Reports Sent" value={sentReports.length} sub={openRate !== null ? `${openRate}% opened` : "No open data"} />
        <StatCard icon={AlertTriangle} label="Open Grievances" value={grievances.filter(g => g.status !== "Resolved").length} sub={overdueGrievances.length > 0 ? `${overdueGrievances.length} overdue` : "All within SLA"} alert={overdueGrievances.length > 0} />
        <StatCard icon={Star} label="Avg Satisfaction" value={avgOverall > 0 ? `${avgOverall.toFixed(1)}/5` : "—"} sub={`${surveys.length} surveys completed`} trend={avgOverall >= 4 ? "up" : avgOverall > 0 && avgOverall < 3 ? "down" : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Message volume */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Family Message Volume (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthlyMsgs}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Satisfaction scores */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Family Satisfaction Scores</CardTitle>
          </CardHeader>
          <CardContent>
            {surveys.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No surveys submitted yet. Surveys are sent quarterly through the portal.</p>
            ) : (
              <div className="space-y-3">
                {satScores.map(s => (
                  <div key={s.key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{s.label}</span>
                      <span className="font-semibold">{s.avg ? `${s.avg}/5` : "—"}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full">
                      <div
                        className={cn("h-full rounded-full", s.avg >= 4 ? "bg-emerald-500" : s.avg >= 3 ? "bg-amber-400" : "bg-red-500")}
                        style={{ width: s.avg ? `${(parseFloat(s.avg) / 5) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grievance categories */}
        {grievanceChartData.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Grievance Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={140}>
                  <PieChart>
                    <Pie data={grievanceChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55}>
                      {grievanceChartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1">
                  {grievanceChartData.map((g, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="flex-1 truncate">{g.name}</span>
                      <span className="font-medium">{g.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ISP input rate */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">ISP Input Submission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-3xl font-bold">{inputSubmitted}</p>
              <p className="text-xs text-slate-500">of {inputs.length} invited families submitted input</p>
              {inputs.length > 0 && (
                <div className="mt-3 w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: `${Math.round((inputSubmitted / inputs.length) * 100)}%` }} />
                </div>
              )}
              {inputs.length > 0 && inputs.length - inputSubmitted > 0 && (
                <p className="text-xs text-amber-600 mt-2">{inputs.length - inputSubmitted} families have not submitted — check the invitation process</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}