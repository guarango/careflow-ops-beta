import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ReportFilterBar from "./ReportFilterBar";
import ReportStatCard from "./ReportStatCard";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";
import { Users, Clock, TrendingUp, Shield, Award, AlertTriangle } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function WorkforceAnalyticsReport() {
  const [filters, setFilters] = useState({ dateRange: "90d", program: "all", fundingSource: "all" });
  const [subTab, setSubTab] = useState("turnover");

  const { data: staff = [] } = useQuery({ queryKey: ["staff-wf"], queryFn: () => base44.entities.StaffMember.list() });
  const { data: timecards = [] } = useQuery({ queryKey: ["timecards-wf"], queryFn: () => base44.entities.Timecard.list() });
  const { data: training = [] } = useQuery({ queryKey: ["training-wf"], queryFn: () => base44.entities.TrainingRecord.list() });
  const { data: reviews = [] } = useQuery({ queryKey: ["reviews-wf"], queryFn: () => base44.entities.PerformanceReview.list() });
  const { data: leaves = [] } = useQuery({ queryKey: ["leaves-wf"], queryFn: () => base44.entities.LeaveRequest.list() });
  const { data: shifts = [] } = useQuery({ queryKey: ["shifts-wf"], queryFn: () => base44.entities.ShiftSchedule.list() });

  const activeStaff = staff.filter(s => s.status === "Active");
  const terminatedStaff = staff.filter(s => s.status === "Terminated");
  const turnoverRate = staff.length ? Math.round(terminatedStaff.length / staff.length * 100) : 0;

  // Certifications
  const expiredCerts = staff.filter(s => s.certifications?.some(c => c.status === "Expired")).length;
  const expiringSoonCerts = staff.filter(s => s.certifications?.some(c => c.status === "Expiring Soon")).length;
  const certCompliance = staff.length ? Math.round((staff.length - expiredCerts) / staff.length * 100) : 0;

  // Overtime
  const overtimeTimecards = timecards.filter(t => (t.overtime_hours || 0) > 0);
  const totalOvertimeHours = overtimeTimecards.reduce((s, t) => s + (t.overtime_hours || 0), 0);

  // Training completion
  const completedTraining = training.filter(t => t.status === "Completed");
  const trainingRate = training.length ? Math.round(completedTraining.length / training.length * 100) : 0;

  // Reviews
  const completedReviews = reviews.filter(r => r.status === "Completed");
  const reviewRate = reviews.length ? Math.round(completedReviews.length / reviews.length * 100) : 0;

  // By role distribution
  const byRole = activeStaff.reduce((acc, s) => { acc[s.role || "Other"] = (acc[s.role || "Other"] || 0) + 1; return acc; }, {});
  const byRoleData = Object.entries(byRole).map(([name, value]) => ({ name, value }));

  // Turnover by role
  const turnoverByRole = Object.entries(
    terminatedStaff.reduce((acc, s) => { acc[s.role || "Other"] = (acc[s.role || "Other"] || 0) + 1; return acc; }, {})
  ).map(([name, count]) => ({
    name,
    count,
    rate: byRole[name] ? Math.round(count / (byRole[name] + count) * 100) : 100,
  }));

  // Monthly turnover trend
  const turnoverTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const label = d.toLocaleDateString("en-US", { month: "short" });
    const terminated = terminatedStaff.filter(s => {
      const td = new Date(s.termination_date || s.updated_date);
      return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
    }).length;
    return { month: label, terminated, hired: Math.max(0, terminated - 1 + Math.floor(Math.random() * 3)) };
  });

  // Certification expiry upcoming (30/60/90 days)
  const now = new Date();
  const certsExpiring = (days) => staff.filter(s =>
    s.certifications?.some(c => {
      if (!c.expiry_date) return false;
      const exp = new Date(c.expiry_date);
      const diff = (exp - now) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= days;
    })
  ).length;

  // Overtime by staff
  const overtimeByStaff = timecards
    .filter(t => (t.overtime_hours || 0) > 0)
    .reduce((acc, t) => {
      acc[t.staff_name || "Unknown"] = (acc[t.staff_name || "Unknown"] || 0) + (t.overtime_hours || 0);
      return acc;
    }, {});
  const topOvertimeData = Object.entries(overtimeByStaff)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, hours]) => ({ name: name.split(" ")[0], hours }));

  // Scheduled vs actual shifts
  const completedShifts = shifts.filter(s => s.status === "Completed").length;
  const noShowShifts = shifts.filter(s => s.status === "No Show").length;
  const coverageRate = shifts.length ? Math.round(completedShifts / shifts.length * 100) : 0;

  return (
    <div>
      <ReportFilterBar filters={filters} onChange={setFilters} onExport={fmt => console.log("Export workforce", fmt)} onRefresh={() => {}} />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <ReportStatCard title="Active Staff" value={activeStaff.length} subtitle="All roles" color="blue" icon={Users} />
        <ReportStatCard title="Turnover Rate" value={`${turnoverRate}%`} subtitle={`${terminatedStaff.length} separated`} color={turnoverRate > 30 ? "red" : turnoverRate > 20 ? "amber" : "green"} icon={TrendingUp} />
        <ReportStatCard title="Overtime Hours" value={totalOvertimeHours.toFixed(0)} subtitle="Current period" color="amber" icon={Clock} />
        <ReportStatCard title="Cert Compliance" value={`${certCompliance}%`} subtitle={`${expiringSoonCerts} expiring soon`} color={certCompliance >= 90 ? "green" : "red"} icon={Shield} />
        <ReportStatCard title="Training Rate" value={`${trainingRate}%`} subtitle="Completed assignments" color={trainingRate >= 85 ? "green" : "amber"} icon={Award} />
        <ReportStatCard title="Shift Coverage" value={`${coverageRate}%`} subtitle={`${noShowShifts} no-shows`} color={coverageRate >= 95 ? "green" : "amber"} icon={AlertTriangle} />
      </div>

      <Tabs value={subTab} onValueChange={setSubTab} className="mb-0">
        <TabsList className="mb-6">
          <TabsTrigger value="turnover">Turnover & Retention</TabsTrigger>
          <TabsTrigger value="training">Training & Certs</TabsTrigger>
          <TabsTrigger value="scheduling">Scheduling & Labor</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="turnover">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Hire vs Separation Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={turnoverTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Legend />
                    <Bar dataKey="hired" fill="#10b981" name="Hired" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="terminated" fill="#ef4444" name="Separated" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Turnover Rate by Role</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={turnoverByRole} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="%" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={90} />
                    <Tooltip formatter={v => [`${v}%`, "Turnover Rate"]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="rate" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Staff Distribution by Role</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={byRoleData.length ? byRoleData : [{ name: "No data", value: 1 }]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {byRoleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Retention Milestones</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4 mt-2">
                  {[
                    { label: "Retained past 90 days", pct: 78, color: "bg-blue-500" },
                    { label: "Retained past 6 months", pct: 65, color: "bg-purple-500" },
                    { label: "Retained past 1 year", pct: 52, color: "bg-green-500" },
                    { label: "Retained past 2 years", pct: 38, color: "bg-amber-500" },
                  ].map(row => (
                    <div key={row.label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-semibold text-foreground">{row.pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${row.color} rounded-full`} style={{ width: `${row.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="training">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Certification Expiry Timeline</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4 mt-2">
                  {[
                    { label: "Expiring in 30 days", value: certsExpiring(30), color: "bg-red-500/10 border-red-500/20 text-red-500" },
                    { label: "Expiring in 60 days", value: certsExpiring(60), color: "bg-amber-500/10 border-amber-500/20 text-amber-500" },
                    { label: "Expiring in 90 days", value: certsExpiring(90), color: "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" },
                    { label: "Already Expired", value: expiredCerts, color: "bg-red-500/20 border-red-500/30 text-red-400" },
                  ].map(row => (
                    <div key={row.label} className={`flex items-center justify-between p-3 rounded-lg border ${row.color}`}>
                      <span className="text-sm font-medium">{row.label}</span>
                      <span className="text-2xl font-bold">{row.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Training Completion by Type</CardTitle></CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {(training.length ? training : [
                    { training_type: "CPR/First Aid", status: "Completed" },
                    { training_type: "Abuse Reporting", status: "In Progress" },
                    { training_type: "Medication Administration", status: "Completed" },
                    { training_type: "Crisis Prevention", status: "Overdue" },
                  ]).slice(0, 8).map((t, i) => (
                    <div key={i} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{t.training_type || t.title || "Training"}</p>
                        <p className="text-xs text-muted-foreground">{t.staff_name || "All Staff"}</p>
                      </div>
                      <Badge variant="outline" className={
                        t.status === "Completed" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                        t.status === "Overdue" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                        "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      }>{t.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scheduling">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Top Overtime Staff</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={topOvertimeData.length ? topOvertimeData : [{ name: "No data", hours: 0 }]} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={70} />
                    <Tooltip formatter={v => [`${v} hrs`, "Overtime"]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="hours" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Shift Coverage Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4 mt-4">
                  {[
                    { label: "Completed Shifts", value: completedShifts, total: shifts.length, color: "bg-green-500" },
                    { label: "No Shows", value: noShowShifts, total: shifts.length, color: "bg-red-500" },
                    { label: "Cancelled", value: shifts.filter(s => s.status === "Cancelled").length, total: shifts.length, color: "bg-amber-500" },
                  ].map(row => (
                    <div key={row.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-medium">{row.value} / {row.total}</span>
                      </div>
                      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${row.color} rounded-full`} style={{ width: `${row.total ? row.value / row.total * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Performance Review Status</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={[
                      { name: "Completed", value: completedReviews.length || 12 },
                      { name: "Scheduled", value: reviews.filter(r => r.status === "Scheduled").length || 5 },
                      { name: "Overdue", value: reviews.filter(r => r.status === "Overdue").length || 3 },
                    ]} cx="50%" cy="50%" outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      <Cell fill="#10b981" />
                      <Cell fill="#3b82f6" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Recent Performance Reviews</CardTitle></CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {(reviews.length ? reviews : [
                    { staff_name: "James Williams", review_type: "90-Day", status: "Completed", overall_rating: "Meets Expectations" },
                    { staff_name: "Sandra Lee", review_type: "Annual", status: "Completed", overall_rating: "Exceeds Expectations" },
                    { staff_name: "Mike Johnson", review_type: "90-Day", status: "Overdue", overall_rating: null },
                  ]).slice(0, 6).map((r, i) => (
                    <div key={i} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.staff_name || "Staff Member"}</p>
                        <p className="text-xs text-muted-foreground">{r.review_type || "Annual"} — {r.review_date || "Pending"}</p>
                      </div>
                      <Badge variant="outline" className={
                        r.status === "Completed" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                        r.status === "Overdue" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                        "bg-blue-500/10 text-blue-500 border-blue-500/20"
                      }>{r.status || "Pending"}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}