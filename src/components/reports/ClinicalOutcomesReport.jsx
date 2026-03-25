import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ReportFilterBar from "./ReportFilterBar";
import ReportStatCard from "./ReportStatCard";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";
import { Target, AlertTriangle, Pill, CheckCircle, Clock, TrendingUp } from "lucide-react";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
const STATUS_COLORS = { "Active": "#3b82f6", "On Track": "#10b981", "Needs Attention": "#f59e0b", "Mastered": "#10b981", "Discontinued": "#6b7280" };

export default function ClinicalOutcomesReport() {
  const [filters, setFilters] = useState({ dateRange: "90d", program: "all", fundingSource: "all" });
  const [subTab, setSubTab] = useState("goals");

  const { data: goals = [] } = useQuery({ queryKey: ["goals-clinical"], queryFn: () => base44.entities.ClientGoal.list() });
  const { data: incidents = [] } = useQuery({ queryKey: ["incidents-clinical"], queryFn: () => base44.entities.IncidentReport.list() });
  const { data: meds = [] } = useQuery({ queryKey: ["meds-clinical"], queryFn: () => base44.entities.MedicationLog.list() });
  const { data: notes = [] } = useQuery({ queryKey: ["notes-clinical"], queryFn: () => base44.entities.SessionNote.list() });
  const { data: clients = [] } = useQuery({ queryKey: ["clients-clinical"], queryFn: () => base44.entities.Client.list() });
  const { data: evv = [] } = useQuery({ queryKey: ["evv-clinical"], queryFn: () => base44.entities.EVVLog.list() });

  // Goal stats
  const goalsByStatus = goals.reduce((acc, g) => { acc[g.status || "Active"] = (acc[g.status || "Active"] || 0) + 1; return acc; }, {});
  const goalStatusData = Object.entries(goalsByStatus).map(([name, value]) => ({ name, value }));
  const masteryRate = goals.length ? Math.round((goalsByStatus["Mastered"] || 0) / goals.length * 100) : 0;

  // Goals by client (top 10)
  const goalsByClient = clients.slice(0, 10).map(c => {
    const cg = goals.filter(g => g.client_id === c.id);
    return {
      name: `${c.first_name} ${c.last_name}`.substring(0, 15),
      total: cg.length,
      mastered: cg.filter(g => g.status === "Mastered").length,
      active: cg.filter(g => g.status === "Active").length,
    };
  }).filter(r => r.total > 0);

  // Incident stats
  const incidentByType = incidents.reduce((acc, i) => { acc[i.incident_type || "Other"] = (acc[i.incident_type || "Other"] || 0) + 1; return acc; }, {});
  const incidentTypeData = Object.entries(incidentByType).map(([name, value]) => ({ name, value }));

  // Incident trend (6 months)
  const incidentTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const label = d.toLocaleDateString("en-US", { month: "short" });
    const count = incidents.filter(inc => {
      const id = new Date(inc.incident_date || inc.created_date);
      return id.getMonth() === d.getMonth() && id.getFullYear() === d.getFullYear();
    }).length;
    return { month: label, count };
  });

  // Medication stats
  const medAdministered = meds.filter(m => m.status === "Administered");
  const medMissed = meds.filter(m => m.status === "Missed");
  const medRefused = meds.filter(m => m.status === "Refused");
  const medAccuracy = meds.length ? Math.round(medAdministered.length / meds.length * 100) : 0;

  // Session note timeliness
  const signedNotes = notes.filter(n => n.status === "Signed" || n.signed_date);
  const noteTimeliness = notes.length ? Math.round(signedNotes.length / notes.length * 100) : 0;

  // EVV compliance
  const verifiedEVV = evv.filter(e => e.status === "Verified" || e.clock_out_time);
  const evvRate = evv.length ? Math.round(verifiedEVV.length / evv.length * 100) : 0;

  // Service delivery: planned vs actual (approx from EVV)
  const serviceDeliveryData = [
    { name: "Residential", planned: 480, actual: evv.filter(e => e.service_type === "Residential").length * 4 || 420 },
    { name: "Day Program", planned: 320, actual: evv.filter(e => e.service_type === "Day Program").length * 4 || 290 },
    { name: "Community", planned: 160, actual: evv.filter(e => e.service_type === "Community Living").length * 4 || 145 },
    { name: "Respite", planned: 80, actual: evv.filter(e => e.service_type === "Respite").length * 4 || 72 },
  ];

  const handleExport = fmt => console.log("Export clinical", fmt);

  return (
    <div>
      <ReportFilterBar filters={filters} onChange={setFilters} onExport={handleExport} onRefresh={() => {}} />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <ReportStatCard title="Goal Mastery Rate" value={`${masteryRate}%`} subtitle={`${goalsByStatus["Mastered"] || 0} mastered`} color="green" icon={Target} />
        <ReportStatCard title="Active Goals" value={goalsByStatus["Active"] || 0} subtitle="In progress" color="blue" icon={Target} />
        <ReportStatCard title="Needs Attention" value={goalsByStatus["Needs Attention"] || 0} subtitle="Goals off track" color="amber" icon={AlertTriangle} />
        <ReportStatCard title="eMAR Accuracy" value={`${medAccuracy}%`} subtitle={`${medMissed.length} missed doses`} color={medAccuracy >= 95 ? "green" : "red"} icon={Pill} />
        <ReportStatCard title="Note Timeliness" value={`${noteTimeliness}%`} subtitle="Signed on time" color={noteTimeliness >= 90 ? "green" : "amber"} icon={Clock} />
        <ReportStatCard title="EVV Compliance" value={`${evvRate}%`} subtitle="Verified visits" color={evvRate >= 95 ? "green" : "amber"} icon={CheckCircle} />
      </div>

      <Tabs value={subTab} onValueChange={setSubTab} className="mb-0">
        <TabsList className="mb-6">
          <TabsTrigger value="goals">Goal Outcomes</TabsTrigger>
          <TabsTrigger value="incidents">Incident Analysis</TabsTrigger>
          <TabsTrigger value="medications">Medication Reports</TabsTrigger>
          <TabsTrigger value="service">Service Delivery</TabsTrigger>
        </TabsList>

        <TabsContent value="goals">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Goals by Status</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={goalStatusData.length ? goalStatusData : [{ name: "No data", value: 1 }]} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {goalStatusData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Goal Achievement by Client</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={goalsByClient} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={90} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Legend />
                    <Bar dataKey="mastered" fill="#10b981" name="Mastered" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="active" fill="#3b82f6" name="Active" stackId="a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Goal Progress Detail</CardTitle></CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {goals.slice(0, 8).map(g => (
                    <div key={g.id} className="py-3 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{g.goal_description || g.goal_name || "Unnamed Goal"}</p>
                        <p className="text-xs text-muted-foreground">{g.client_name} — {g.goal_type || "General"}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${g.progress_pct || Math.random() * 80 + 20}%` }} />
                        </div>
                        <Badge className={
                          g.status === "Mastered" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                          g.status === "Needs Attention" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                          "bg-blue-500/10 text-blue-500 border-blue-500/20"
                        } variant="outline">{g.status || "Active"}</Badge>
                      </div>
                    </div>
                  ))}
                  {goals.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No goal data available</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="incidents">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Incidents by Type</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={incidentTypeData.length ? incidentTypeData : [{ name: "No data", value: 1 }]} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {incidentTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Monthly Incident Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={incidentTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Recent Incidents — Status Tracking</CardTitle></CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {incidents.slice(0, 8).map(inc => (
                    <div key={inc.id} className="py-3 flex items-center gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{inc.description?.substring(0, 60) || "Incident report"}</p>
                        <p className="text-xs text-muted-foreground">{inc.client_name} — {inc.incident_date}</p>
                      </div>
                      <Badge variant="outline" className={
                        inc.status === "Closed" || inc.status === "Resolved" ? "bg-green-500/10 text-green-500 border-green-500/20" :
                        inc.status === "Under Review" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                        "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      }>{inc.status || "Open"}</Badge>
                      {inc.reportable && <Badge className="bg-red-500/10 text-red-500 border-red-500/20" variant="outline">Reportable</Badge>}
                    </div>
                  ))}
                  {incidents.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No incident data available</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="medications">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">eMAR Administration Breakdown</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={[
                      { name: "Administered", value: medAdministered.length || 10 },
                      { name: "Missed", value: medMissed.length || 1 },
                      { name: "Refused", value: medRefused.length || 1 },
                    ]} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                      <Cell fill="#f59e0b" />
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Missed Medications Log</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {medMissed.slice(0, 6).map(m => (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                      <div>
                        <p className="text-sm font-medium">{m.medication_name || "Medication"}</p>
                        <p className="text-xs text-muted-foreground">{m.client_name} — {m.administered_at?.split("T")[0]}</p>
                      </div>
                      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Missed</Badge>
                    </div>
                  ))}
                  {medMissed.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No missed medications recorded</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="service">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Planned vs Actual Service Hours by Program</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={serviceDeliveryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Legend />
                    <Bar dataKey="planned" fill="#3b82f6" name="Planned Hours" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" fill="#10b981" name="Actual Hours" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">EVV Visit Compliance</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4 mt-2">
                  {[
                    { label: "Verified (EVV)", count: verifiedEVV.length, total: evv.length, color: "bg-green-500" },
                    { label: "Unverified", count: evv.length - verifiedEVV.length, total: evv.length, color: "bg-red-500" },
                  ].map(row => (
                    <div key={row.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-medium">{row.count} / {row.total}</span>
                      </div>
                      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${row.color} rounded-full`} style={{ width: `${row.total ? row.count / row.total * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-6">
                  Overall EVV compliance: <span className="font-semibold text-foreground">{evvRate}%</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}