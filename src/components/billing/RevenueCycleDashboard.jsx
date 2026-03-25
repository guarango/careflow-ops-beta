import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { DollarSign, TrendingUp, AlertTriangle, Clock, Download, Filter, Activity } from "lucide-react";

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function RevenueCycleDashboard() {
  const [dateRange, setDateRange] = useState("month");

  const { data: claims = [] } = useQuery({ queryKey: ["claims"], queryFn: () => base44.entities.Claim.list("-created_date") });
  const { data: denials = [] } = useQuery({ queryKey: ["denials"], queryFn: () => base44.entities.DenialRecord.list("-created_date") });
  const { data: auths = [] } = useQuery({ queryKey: ["authorizations"], queryFn: () => base44.entities.Authorization.list() });
  const { data: evvLogs = [] } = useQuery({ queryKey: ["evv-logs"], queryFn: () => base44.entities.EVVLog.list() });

  // Claim status breakdown
  const statusData = ["Draft","Ready","Submitted","Pending","Paid","Denied","Appealed"].map(s => ({
    name: s, value: claims.filter(c => c.status === s).length
  })).filter(d => d.value > 0);

  // Revenue metrics
  const totalBilled = claims.reduce((s, c) => s + (c.amount_billed || 0), 0);
  const totalPaid = claims.filter(c => c.status === "Paid").reduce((s, c) => s + (c.amount_paid || c.amount_billed || 0), 0);
  const totalDenied = claims.filter(c => c.status === "Denied").reduce((s, c) => s + (c.amount_billed || 0), 0);
  const totalInAppeal = claims.filter(c => c.status === "Appealed").reduce((s, c) => s + (c.amount_billed || 0), 0);
  const collectionRate = totalBilled > 0 ? Math.round(totalPaid / totalBilled * 100) : 0;

  // AR Aging buckets (by submission date)
  const today = new Date();
  const agingBuckets = { current: 0, "30d": 0, "60d": 0, "90d": 0, "90d+": 0 };
  claims.filter(c => ["Submitted","Pending"].includes(c.status)).forEach(c => {
    if (!c.submission_date) return;
    const days = Math.floor((today - new Date(c.submission_date)) / (1000 * 60 * 60 * 24));
    const amt = c.amount_billed || 0;
    if (days <= 30) agingBuckets["current"] += amt;
    else if (days <= 60) agingBuckets["30d"] += amt;
    else if (days <= 90) agingBuckets["60d"] += amt;
    else if (days <= 120) agingBuckets["90d"] += amt;
    else agingBuckets["90d+"] += amt;
  });
  const agingData = Object.entries(agingBuckets).map(([name, value]) => ({ name, value: Math.round(value) }));

  // Denial by category
  const denialByCategory = {};
  denials.forEach(d => { denialByCategory[d.denial_category] = (denialByCategory[d.denial_category] || 0) + (d.amount_denied || 0); });
  const denialCategoryData = Object.entries(denialByCategory).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value: Math.round(value) }));

  // Auth utilization
  const approvedAuths = auths.filter(a => a.status === "Approved");
  const authsApproaching = approvedAuths.filter(a => a.authorized_units > 0 && (a.used_units || 0) / a.authorized_units >= 0.8);
  const authsExhausted = approvedAuths.filter(a => (a.remaining_units || 0) <= 0);

  // EVV rejection rate
  const evvTotal = evvLogs.length;
  const evvRejected = evvLogs.filter(e => e.status === "Rejected").length;
  const evvRejectionRate = evvTotal > 0 ? Math.round(evvRejected / evvTotal * 100) : 0;

  // Export CSV
  const exportCSV = () => {
    const rows = [
      ["Metric", "Value"],
      ["Total Billed", totalBilled],
      ["Total Paid", totalPaid],
      ["Total Denied", totalDenied],
      ["Collection Rate %", collectionRate],
      ["EVV Rejection Rate %", evvRejectionRate],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "revenue_cycle_report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5">
          <Download className="w-3.5 h-3.5" />Export CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Billed", value: `$${totalBilled.toLocaleString()}`, color: "text-primary", icon: DollarSign },
          { label: "Total Collected", value: `$${totalPaid.toLocaleString()}`, color: "text-accent", icon: TrendingUp },
          { label: "Collection Rate", value: `${collectionRate}%`, color: collectionRate >= 90 ? "text-accent" : collectionRate >= 70 ? "text-chart-4" : "text-destructive", icon: TrendingUp },
          { label: "Total Denied", value: `$${totalDenied.toLocaleString()}`, color: "text-destructive", icon: AlertTriangle },
        ].map(({ label, value, color, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1"><DollarSign className={`w-4 h-4 ${color}`} /><p className="text-xs text-muted-foreground">{label}</p></div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "In Appeal", value: `$${totalInAppeal.toLocaleString()}`, color: "text-chart-3" },
          { label: "EVV Rejection Rate", value: `${evvRejectionRate}%`, color: evvRejectionRate > 10 ? "text-destructive" : "text-accent" },
          { label: "Auths Approaching Limit", value: authsApproaching.length, color: "text-chart-4" },
          { label: "Auths Exhausted", value: authsExhausted.length, color: "text-destructive" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Claims by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Denials by Category ($)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={denialCategoryData} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                <Bar dataKey="value" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AR Aging */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />Accounts Receivable Aging</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            {agingData.map(({ name, value }) => (
              <div key={name} className="text-center">
                <p className="text-xs text-muted-foreground">{name === "current" ? "Current (0–30d)" : name === "30d" ? "31–60 days" : name === "60d" ? "61–90 days" : name === "90d" ? "91–120 days" : "120d+"}</p>
                <p className={`text-xl font-bold mt-1 ${name === "90d+" ? "text-destructive" : name === "90d" ? "text-chart-4" : "text-foreground"}`}>${value.toLocaleString()}</p>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={agingData} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={v => `$${v.toLocaleString()}`} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}