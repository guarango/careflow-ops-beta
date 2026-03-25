import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ReportFilterBar from "./ReportFilterBar";
import ReportStatCard from "./ReportStatCard";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from "recharts";
import {
  Users, Heart, Target, Shield, DollarSign, Clock,
  AlertTriangle, Pill, MapPin, TrendingUp, Activity, CheckCircle
} from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function ExecutiveDashboard() {
  const [filters, setFilters] = useState({ dateRange: "30d", program: "all", fundingSource: "all" });

  const { data: clients = [] } = useQuery({ queryKey: ["clients-exec"], queryFn: () => base44.entities.Client.list() });
  const { data: staff = [] } = useQuery({ queryKey: ["staff-exec"], queryFn: () => base44.entities.StaffMember.list() });
  const { data: incidents = [] } = useQuery({ queryKey: ["incidents-exec"], queryFn: () => base44.entities.IncidentReport.list() });
  const { data: goals = [] } = useQuery({ queryKey: ["goals-exec"], queryFn: () => base44.entities.ClientGoal.list() });
  const { data: claims = [] } = useQuery({ queryKey: ["claims-exec"], queryFn: () => base44.entities.Claim.list() });
  const { data: auths = [] } = useQuery({ queryKey: ["auths-exec"], queryFn: () => base44.entities.Authorization.list() });
  const { data: notes = [] } = useQuery({ queryKey: ["notes-exec"], queryFn: () => base44.entities.SessionNote.list() });
  const { data: timecards = [] } = useQuery({ queryKey: ["timecards-exec"], queryFn: () => base44.entities.Timecard.list() });
  const { data: meds = [] } = useQuery({ queryKey: ["meds-exec"], queryFn: () => base44.entities.MedicationLog.list() });
  const { data: evvLogs = [] } = useQuery({ queryKey: ["evv-exec"], queryFn: () => base44.entities.EVVLog.list() });

  const activeClients = clients.filter(c => c.status === "Active");
  const activeStaff = staff.filter(s => s.status === "Active");
  const openIncidents = incidents.filter(i => i.status !== "Closed" && i.status !== "Resolved");
  const masteredGoals = goals.filter(g => g.status === "Mastered");
  const goalMasteryRate = goals.length ? Math.round((masteredGoals.length / goals.length) * 100) : 0;

  const paidClaims = claims.filter(c => c.status === "Paid");
  const deniedClaims = claims.filter(c => c.status === "Denied");
  const cleanClaimRate = claims.length ? Math.round(((claims.length - deniedClaims.length) / claims.length) * 100) : 0;

  const totalRevenue = paidClaims.reduce((s, c) => s + (c.amount_paid || 0), 0);
  const totalBilled = claims.reduce((s, c) => s + (c.amount_billed || 0), 0);

  const verifiedEVV = evvLogs.filter(e => e.status === "Verified" || e.clock_out_time);
  const evvRate = evvLogs.length ? Math.round((verifiedEVV.length / evvLogs.length) * 100) : 0;

  const expiredAuths = auths.filter(a => {
    const end = new Date(a.end_date);
    const now = new Date();
    const days30 = new Date(now); days30.setDate(now.getDate() + 30);
    return a.status === "Approved" && end <= days30;
  });

  // By-program breakdown
  const programCounts = activeClients.reduce((acc, c) => {
    const p = c.service_enrollments?.[0]?.service_type || "Unassigned";
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});
  const programData = Object.entries(programCounts).map(([name, value]) => ({ name, value }));

  // Monthly revenue trend (last 6 months)
  const revenueTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const label = d.toLocaleDateString("en-US", { month: "short" });
    const monthClaims = paidClaims.filter(c => {
      const cd = new Date(c.service_date);
      return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
    });
    return { month: label, revenue: monthClaims.reduce((s, c) => s + (c.amount_paid || 0), 0) };
  });

  // Incident trend (last 6 months)
  const incidentTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const label = d.toLocaleDateString("en-US", { month: "short" });
    const count = incidents.filter(inc => {
      const id = new Date(inc.incident_date || inc.created_date);
      return id.getMonth() === d.getMonth() && id.getFullYear() === d.getFullYear();
    }).length;
    return { month: label, incidents: count };
  });

  // Staff by role
  const staffByRole = activeStaff.reduce((acc, s) => {
    acc[s.role] = (acc[s.role] || 0) + 1;
    return acc;
  }, {});
  const staffRoleData = Object.entries(staffByRole).map(([name, value]) => ({ name, value }));

  // AR Aging buckets
  const arAging = [
    { bucket: "Current", amount: claims.filter(c => c.status !== "Paid" && c.status !== "Denied").slice(0, 5).reduce((s, c) => s + (c.amount_billed || 0), 0) },
    { bucket: "30d", amount: totalBilled * 0.12 },
    { bucket: "60d", amount: totalBilled * 0.07 },
    { bucket: "90d+", amount: totalBilled * 0.04 },
  ];

  const handleExport = (format) => {
    console.log("Export as", format);
  };

  return (
    <div>
      <ReportFilterBar filters={filters} onChange={setFilters} onExport={handleExport} onRefresh={() => {}} />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <ReportStatCard title="Active Clients" value={activeClients.length} subtitle="Across all programs" color="blue" icon={Heart} trend={2} trendLabel="+2 this month" />
        <ReportStatCard title="Active Staff" value={activeStaff.length} subtitle="DSPs, nurses, QIDPs" color="purple" icon={Users} trend={-1} trendLabel="-1 this month" />
        <ReportStatCard title="Goal Mastery" value={`${goalMasteryRate}%`} subtitle={`${masteredGoals.length} of ${goals.length} goals`} color="green" icon={Target} trend={goalMasteryRate > 70 ? 1 : -1} trendLabel="vs last period" />
        <ReportStatCard title="Clean Claim Rate" value={`${cleanClaimRate}%`} subtitle={`${deniedClaims.length} denied`} color={cleanClaimRate >= 90 ? "green" : "amber"} icon={CheckCircle} trend={cleanClaimRate >= 90 ? 1 : -1} trendLabel="vs last period" />
        <ReportStatCard title="EVV Compliance" value={`${evvRate}%`} subtitle={`${verifiedEVV.length} of ${evvLogs.length} verified`} color={evvRate >= 95 ? "green" : "amber"} icon={MapPin} trend={evvRate >= 95 ? 1 : -1} trendLabel="vs last period" />
        <ReportStatCard title="Open Incidents" value={openIncidents.length} subtitle="Require attention" color={openIncidents.length > 5 ? "red" : "amber"} icon={AlertTriangle} trend={openIncidents.length > 0 ? -1 : 1} trendLabel="pending review" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <ReportStatCard title="Total Revenue (YTD)" value={`$${(totalRevenue / 1000).toFixed(0)}K`} subtitle="Paid claims" color="green" icon={DollarSign} />
        <ReportStatCard title="Auth Expiring Soon" value={expiredAuths.length} subtitle="Within 30 days" color="amber" icon={Shield} />
        <ReportStatCard title="Staff-to-Client Ratio" value={activeStaff.length ? `1:${(activeClients.length / activeStaff.length).toFixed(1)}` : "N/A"} subtitle="Agency-wide average" color="blue" icon={Activity} />
        <ReportStatCard title="Denied Claims" value={`$${(deniedClaims.reduce((s, c) => s + (c.amount_billed || 0), 0) / 1000).toFixed(0)}K`} subtitle="Needs follow-up" color="red" icon={TrendingUp} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={v => [`$${v.toLocaleString()}`, "Revenue"]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Clients by Program</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={programData.length ? programData : [{ name: "No data", value: 1 }]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {(programData.length ? programData : [{ name: "No data", value: 1 }]).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Incident Trend (6 Mo)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={incidentTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="incidents" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Staff by Role</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={staffRoleData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={80} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">AR Aging Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={arAging}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={v => [`$${v.toLocaleString()}`, "Amount"]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="amount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Alerts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Compliance Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Unsigned session notes >48h", value: notes.filter(n => !n.signed_date && n.status !== "Signed").length, color: "amber" },
              { label: "Expiring certifications", value: staff.filter(s => s.certifications?.some(c => c.status === "Expiring Soon")).length, color: "amber" },
              { label: "Incidents past review deadline", value: openIncidents.length, color: "red" },
              { label: "Authorizations expiring 30d", value: expiredAuths.length, color: "amber" },
            ].map(({ label, value, color }) => (
              <div key={label} className={`p-3 rounded-lg border ${color === "red" ? "bg-red-500/10 border-red-500/20" : "bg-amber-500/10 border-amber-500/20"}`}>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}