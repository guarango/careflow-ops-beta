import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const MODULE_USAGE = [
  { name: "Schedule", usage: 94 },
  { name: "Timecards", usage: 91 },
  { name: "eMAR", usage: 87 },
  { name: "Session Notes", usage: 83 },
  { name: "Billing", usage: 76 },
  { name: "EVV", usage: 71 },
  { name: "Incidents", usage: 65 },
  { name: "Goals", usage: 58 },
  { name: "HR", usage: 52 },
  { name: "Payroll", usage: 49 },
  { name: "API", usage: 18 },
];

const UPTIME_DATA = [
  { day: "Mon", uptime: 99.98 }, { day: "Tue", uptime: 99.99 }, { day: "Wed", uptime: 100 },
  { day: "Thu", uptime: 99.97 }, { day: "Fri", uptime: 99.99 }, { day: "Sat", uptime: 100 },
  { day: "Sun", uptime: 99.98 },
];

const COLORS = ["#0ea5e9", "#10b981", "#a78bfa", "#f59e0b", "#ef4444"];

export default function SuperAdminMetrics({ agencies }) {
  const totalUsers = agencies.reduce((s, a) => s + (a.user_count || 0), 0);
  const totalClients = agencies.reduce((s, a) => s + (a.client_count || 0), 0);

  const planDist = ["starter", "professional", "enterprise"].map(plan => ({
    name: plan.charAt(0).toUpperCase() + plan.slice(1),
    value: agencies.filter(a => a.plan === plan).length,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users (All Tenants)", value: totalUsers },
          { label: "Total Clients (All Tenants)", value: totalClients },
          { label: "Avg Uptime (7d)", value: "99.98%" },
          { label: "Error Rate", value: "0.02%" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold mt-1 text-primary">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Module usage */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Module Usage Rates (%)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={MODULE_USAGE} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={80} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                formatter={(v) => [`${v}%`, "Usage"]}
              />
              <Bar dataKey="usage" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Plan distribution pie */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Subscription Plan Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={planDist} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                {planDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System uptime */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-4">System Uptime — Last 7 Days</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={UPTIME_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis domain={[99.9, 100.1]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
              formatter={(v) => [`${v}%`, "Uptime"]}
            />
            <Line type="monotone" dataKey="uptime" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: "hsl(var(--accent))" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* EVV rates */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-3">EVV Submission Rates (Platform-Wide)</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Accepted", value: "87%", color: "text-accent" },
            { label: "Pending", value: "9%", color: "text-chart-4" },
            { label: "Rejected", value: "4%", color: "text-destructive" },
          ].map(s => (
            <div key={s.label} className="bg-muted/30 rounded-lg p-4 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}