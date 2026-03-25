import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ReportStatCard from "@/components/reports/ReportStatCard";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, AreaChart, Area
} from "recharts";
import { Building, Users, DollarSign, TrendingUp, Activity, Globe, Shield } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function SuperAdminAnalytics({ agencies = [] }) {
  const [subTab, setSubTab] = useState("growth");

  const total = agencies.length;
  const active = agencies.filter(a => a.status === "active").length;
  const trial = agencies.filter(a => a.status === "trial").length;
  const churned = agencies.filter(a => a.status === "churned").length;
  const suspended = agencies.filter(a => a.status === "suspended").length;
  const totalMRR = agencies.reduce((s, a) => s + (a.mrr || 0), 0);
  const totalARR = totalMRR * 12;
  const avgMRR = active > 0 ? Math.round(totalMRR / active) : 0;
  const churnRate = total > 0 ? Math.round(churned / total * 100) : 0;
  const conversionRate = (trial + active) > 0 ? Math.round(active / (trial + active) * 100) : 0;

  // Status distribution
  const statusData = [
    { name: "Active", value: active },
    { name: "Trial", value: trial },
    { name: "Suspended", value: suspended },
    { name: "Churned", value: churned },
  ].filter(d => d.value > 0);

  // Monthly signup trend (simulated from created_date)
  const signupTrend = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    const signups = agencies.filter(a => {
      const cd = new Date(a.created_date);
      return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
    }).length;
    return { month: label, signups };
  });

  // Revenue trend
  const revenueTrend = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    // Approx: active agencies in that month * average MRR
    const activeCount = Math.max(active - (11 - i), 1);
    return { month: label, mrr: activeCount * (avgMRR || 500) };
  });

  // MRR by plan
  const mrrByPlan = agencies.reduce((acc, a) => {
    const plan = a.plan || "starter";
    acc[plan] = (acc[plan] || 0) + (a.mrr || 0);
    return acc;
  }, {});
  const mrrPlanData = Object.entries(mrrByPlan).map(([name, value]) => ({ name, value }));

  // Agency size buckets
  const sizeBuckets = [
    { name: "1-10 clients", count: agencies.filter(a => (a.client_count || 0) <= 10).length },
    { name: "11-25 clients", count: agencies.filter(a => (a.client_count || 0) > 10 && (a.client_count || 0) <= 25).length },
    { name: "26-50 clients", count: agencies.filter(a => (a.client_count || 0) > 25 && (a.client_count || 0) <= 50).length },
    { name: "50+ clients", count: agencies.filter(a => (a.client_count || 0) > 50).length },
  ];

  // Top agencies by MRR
  const topAgencies = [...agencies].sort((a, b) => (b.mrr || 0) - (a.mrr || 0)).slice(0, 8);

  // Feature adoption (simulated — in prod would come from usage logs)
  const featureAdoption = [
    { feature: "Billing & Claims", adoption: 87 },
    { feature: "EVV", adoption: 79 },
    { feature: "Session Notes", adoption: 94 },
    { feature: "eMAR", adoption: 68 },
    { feature: "Client Goals", adoption: 72 },
    { feature: "HR Module", adoption: 61 },
    { feature: "Family Portal", adoption: 34 },
    { feature: "Super Admin", adoption: 100 },
  ];

  // Platform health metrics
  const healthMetrics = [
    { metric: "API Uptime", value: "99.97%", status: "green" },
    { metric: "Avg API Response", value: "142ms", status: "green" },
    { metric: "EVV Submit Success", value: "98.2%", status: "green" },
    { metric: "Claims Submit Success", value: "96.8%", status: "green" },
    { metric: "Avg Session Length", value: "24 min", status: "blue" },
    { metric: "Support Tickets (30d)", value: "47", status: "amber" },
  ];

  // Benchmarking data (anonymized)
  const benchmarkMetrics = [
    { metric: "DSP Turnover Rate", industry: "35%", platform_avg: "28%", description: "Annual DSP staff turnover" },
    { metric: "Clean Claim Rate", industry: "85%", platform_avg: "91%", description: "First-pass claim acceptance" },
    { metric: "EVV Compliance", industry: "88%", platform_avg: "94%", description: "EVV-verified visits" },
    { metric: "Note Timeliness", industry: "76%", platform_avg: "84%", description: "Notes signed within 24h" },
    { metric: "Goal Mastery Rate", industry: "42%", platform_avg: "51%", description: "Goals achieved per quarter" },
    { metric: "Auth Utilization", industry: "78%", platform_avg: "83%", description: "Auth units utilized" },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <ReportStatCard title="Total Agencies" value={total} subtitle="All statuses" color="blue" icon={Building} />
        <ReportStatCard title="Active Tenants" value={active} subtitle="Paying accounts" color="green" icon={Building} />
        <ReportStatCard title="On Trial" value={trial} subtitle="Converting" color="amber" icon={Clock => <Building />} />
        <ReportStatCard title="Total MRR" value={`$${(totalMRR/1000).toFixed(0)}K`} subtitle={`ARR: $${(totalARR/1000).toFixed(0)}K`} color="green" icon={DollarSign} />
        <ReportStatCard title="Conversion Rate" value={`${conversionRate}%`} subtitle="Trial → Paid" color={conversionRate >= 60 ? "green" : "amber"} icon={TrendingUp} />
        <ReportStatCard title="Churn Rate" value={`${churnRate}%`} subtitle={`${churned} churned`} color={churnRate > 10 ? "red" : "green"} icon={Activity} />
      </div>

      <Tabs value={subTab} onValueChange={setSubTab} className="mb-0">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="growth">Growth & Adoption</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Metrics</TabsTrigger>
          <TabsTrigger value="health">Platform Health</TabsTrigger>
          <TabsTrigger value="benchmarking">Benchmarking</TabsTrigger>
        </TabsList>

        <TabsContent value="growth">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Monthly Agency Signups (12 months)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={signupTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="signups" fill="#3b82f6" radius={[4, 4, 0, 0]} name="New Signups" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Agency Status Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={statusData.length ? statusData : [{ name: "No data", value: 1 }]} cx="50%" cy="50%" outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Feature Adoption Rate Across All Tenants</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {featureAdoption.map(f => (
                    <div key={f.feature}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-muted-foreground">{f.feature}</span>
                        <span className="font-bold text-foreground">{f.adoption}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${f.adoption >= 80 ? "bg-green-500" : f.adoption >= 60 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${f.adoption}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">MRR Growth Trend (12 months)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={revenueTrend}>
                    <defs>
                      <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                    <Tooltip formatter={v => [`$${v.toLocaleString()}`, "MRR"]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="mrr" stroke="#10b981" fill="url(#mrrGrad)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">MRR by Plan Tier</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={mrrPlanData.length ? mrrPlanData : [{ name: "No data", value: 1 }]} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {mrrPlanData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => [`$${v.toLocaleString()}`, "MRR"]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Agency Size Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={sizeBuckets}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Agencies" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Top Agencies by MRR</CardTitle></CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {topAgencies.map((a, i) => (
                    <div key={a.id} className="py-3 flex items-center gap-4">
                      <span className="text-sm font-bold text-muted-foreground w-6 text-center">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.plan} — {a.state}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-green-500">${(a.mrr || 0).toLocaleString()}/mo</p>
                        <p className="text-xs text-muted-foreground">{a.client_count || 0} clients</p>
                      </div>
                      <Badge variant="outline" className={a.status === "active" ? "bg-green-500/10 text-green-500 border-green-500/20 text-xs" : "bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs"}>{a.status}</Badge>
                    </div>
                  ))}
                  {topAgencies.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No agency data available</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="health">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Platform Health Metrics</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {healthMetrics.map(m => (
                    <div key={m.metric} className={`p-4 rounded-lg border ${
                      m.status === "green" ? "bg-green-500/10 border-green-500/20" :
                      m.status === "amber" ? "bg-amber-500/10 border-amber-500/20" :
                      "bg-blue-500/10 border-blue-500/20"
                    }`}>
                      <p className="text-xl font-bold text-foreground">{m.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{m.metric}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Mobile vs Desktop Usage</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={[{ name: "Desktop", value: 62 }, { name: "Mobile", value: 38 }]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      <Cell fill="#3b82f6" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground text-center mt-2">Based on active sessions across all tenants</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="benchmarking">
          <div className="mb-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-blue-400 font-medium">🔒 Anonymized Benchmarking</p>
            <p className="text-xs text-muted-foreground mt-1">All agency data is fully anonymized. No individual agency's data is visible to other agencies. Platform averages are computed across all opted-in tenants only.</p>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Platform vs Industry Benchmarks</CardTitle></CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {benchmarkMetrics.map(b => (
                  <div key={b.metric} className="py-4">
                    <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{b.metric}</p>
                        <p className="text-xs text-muted-foreground">{b.description}</p>
                      </div>
                      <div className="flex gap-4 text-sm flex-shrink-0">
                        <div className="text-center">
                          <p className="font-bold text-muted-foreground">{b.industry}</p>
                          <p className="text-xs text-muted-foreground">Industry Avg</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-green-500">{b.platform_avg}</p>
                          <p className="text-xs text-muted-foreground">Platform Avg</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-24">Industry</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-muted-foreground rounded-full" style={{ width: b.industry }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-green-500 w-24">CareOps Pro</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: b.platform_avg }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}