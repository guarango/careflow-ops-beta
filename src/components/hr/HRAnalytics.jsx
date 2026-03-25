import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { BarChart2, Users, TrendingDown, Award, FileText } from "lucide-react";

const COLORS = ["#0ea5e9", "#22c55e", "#a855f7", "#f59e0b", "#ef4444", "#14b8a6"];

export default function HRAnalytics({ staff, leaveRequests, reviews, trainings }) {
  const active = staff.filter(s => s.status === "Active");
  const terminated = staff.filter(s => s.status === "Terminated");
  const turnoverRate = staff.length > 0 ? Math.round((terminated.length / staff.length) * 100) : 0;

  // Headcount by role
  const byRole = Object.entries(
    active.reduce((acc, s) => { acc[s.role || "Other"] = (acc[s.role || "Other"] || 0) + 1; return acc; }, {})
  ).map(([role, count]) => ({ role, count }));

  // Headcount by employment type
  const byType = Object.entries(
    active.reduce((acc, s) => { acc[s.employment_type || "Unknown"] = (acc[s.employment_type || "Unknown"] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  // Training compliance rate
  const currentTrainings = trainings.filter(t => t.status === "Current").length;
  const trainingComplianceRate = trainings.length > 0 ? Math.round((currentTrainings / trainings.length) * 100) : 100;

  // Leave by type
  const leaveByType = Object.entries(
    leaveRequests.reduce((acc, l) => { acc[l.leave_type || "Other"] = (acc[l.leave_type || "Other"] || 0) + 1; return acc; }, {})
  ).map(([type, count]) => ({ type, count }));

  const metrics = [
    { label: "Total Headcount", value: active.length, icon: Users, color: "text-primary" },
    { label: "Turnover Rate", value: `${turnoverRate}%`, icon: TrendingDown, color: turnoverRate > 20 ? "text-destructive" : "text-accent" },
    { label: "Training Compliance", value: `${trainingComplianceRate}%`, icon: Award, color: trainingComplianceRate < 80 ? "text-amber-600" : "text-accent" },
    { label: "Reviews In Progress", value: reviews.filter(r => r.status === "In Progress" || r.status === "Draft").length, icon: FileText, color: "text-chart-3" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${color}`} />
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Headcount by Role</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byRole} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="role" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Employment Type Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byType} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={3}>
                  {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Leave Requests by Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={leaveByType} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Training Status Breakdown</CardTitle></CardHeader>
          <CardContent className="pt-2">
            {["Current", "Expiring Soon", "Expired", "Not Started", "In Progress"].map(status => {
              const count = trainings.filter(t => t.status === status).length;
              const pct = trainings.length > 0 ? Math.round((count / trainings.length) * 100) : 0;
              const barColors = { Current: "bg-accent", "Expiring Soon": "bg-amber-400", Expired: "bg-destructive", "Not Started": "bg-muted", "In Progress": "bg-primary" };
              return (
                <div key={status} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{status}</span>
                    <span className="font-medium">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColors[status]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}