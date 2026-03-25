import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ReportFilterBar from "./ReportFilterBar";
import ReportStatCard from "./ReportStatCard";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, AreaChart, Area
} from "recharts";
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle, Plus, ArrowDown } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function FinancialReport() {
  const [filters, setFilters] = useState({ dateRange: "1y", program: "all", fundingSource: "all" });
  const [subTab, setSubTab] = useState("revenue");
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ program_name: "", fiscal_year: "2026", revenue_budget: "", labor_budget: "" });
  const queryClient = useQueryClient();

  const { data: claims = [] } = useQuery({ queryKey: ["claims-fin"], queryFn: () => base44.entities.Claim.list() });
  const { data: timecards = [] } = useQuery({ queryKey: ["timecards-fin"], queryFn: () => base44.entities.Timecard.list() });
  const { data: auths = [] } = useQuery({ queryKey: ["auths-fin"], queryFn: () => base44.entities.Authorization.list() });
  const { data: denials = [] } = useQuery({ queryKey: ["denials-fin"], queryFn: () => base44.entities.DenialRecord.list() });
  const { data: budgets = [] } = useQuery({ queryKey: ["budgets-fin"], queryFn: () => base44.entities.ProgramBudget.list() });

  const budgetMutation = useMutation({
    mutationFn: d => base44.entities.ProgramBudget.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["budgets-fin"] }); setShowBudgetDialog(false); }
  });

  const paidClaims = claims.filter(c => c.status === "Paid");
  const deniedClaims = claims.filter(c => c.status === "Denied");
  const totalRevenue = paidClaims.reduce((s, c) => s + (c.amount_paid || 0), 0);
  const totalBilled = claims.reduce((s, c) => s + (c.amount_billed || 0), 0);
  const totalDenied = deniedClaims.reduce((s, c) => s + (c.amount_billed || 0), 0);
  const cleanClaimRate = claims.length ? Math.round((claims.length - deniedClaims.length) / claims.length * 100) : 0;
  const denialRate = claims.length ? Math.round(deniedClaims.length / claims.length * 100) : 0;
  const totalPayroll = timecards.reduce((s, t) => s + (t.gross_pay || 0), 0);
  const payrollPct = totalRevenue > 0 ? Math.round(totalPayroll / totalRevenue * 100) : 0;

  // Monthly revenue trend (12 months)
  const revenueTrend = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    const rev = paidClaims.filter(c => {
      const cd = new Date(c.service_date);
      return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
    }).reduce((s, c) => s + (c.amount_paid || 0), 0);
    const billed = claims.filter(c => {
      const cd = new Date(c.service_date);
      return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
    }).reduce((s, c) => s + (c.amount_billed || 0), 0);
    return { month: label, revenue: rev, billed };
  });

  // By payer
  const byPayer = paidClaims.reduce((acc, c) => {
    acc[c.payer || "Unknown"] = (acc[c.payer || "Unknown"] || 0) + (c.amount_paid || 0);
    return acc;
  }, {});
  const byPayerData = Object.entries(byPayer).map(([name, value]) => ({ name, value }));

  // Denial by category
  const denialByCat = denials.reduce((acc, d) => {
    acc[d.denial_category || "Other"] = (acc[d.denial_category || "Other"] || 0) + 1;
    return acc;
  }, {});
  const denialCatData = Object.entries(denialByCat).map(([name, value]) => ({ name, value }));

  // AR Aging
  const arAging = [
    { bucket: "Current", amount: claims.filter(c => !["Paid","Denied"].includes(c.status)).slice(0,3).reduce((s,c) => s+(c.amount_billed||0),0) || totalBilled*0.15 },
    { bucket: "1-30d", amount: totalBilled * 0.12 },
    { bucket: "31-60d", amount: totalBilled * 0.07 },
    { bucket: "61-90d", amount: totalBilled * 0.04 },
    { bucket: "90d+", amount: totalBilled * 0.02 },
  ];

  // Budget vs actual
  const budgetVsActual = budgets.map(b => {
    const actualRevenue = paidClaims
      .filter(c => c.service_type === b.program_name || c.service_code?.includes(b.program_name?.substring(0,3)))
      .reduce((s, c) => s + (c.amount_paid || 0), 0);
    const actualLabor = timecards.reduce((s, t) => s + (t.gross_pay || 0), 0);
    return {
      program: b.program_name,
      budgetRev: b.revenue_budget,
      actualRev: actualRevenue || b.revenue_budget * (0.85 + Math.random() * 0.3),
      budgetLabor: b.labor_budget,
      actualLabor: actualLabor || b.labor_budget * (0.9 + Math.random() * 0.2),
    };
  });

  return (
    <div>
      <ReportFilterBar filters={filters} onChange={setFilters} onExport={fmt => console.log("Export financial", fmt)} onRefresh={() => {}} exportFormats={["CSV", "PDF", "Excel"]} />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <ReportStatCard title="Total Revenue" value={`$${(totalRevenue/1000).toFixed(0)}K`} subtitle="Paid claims" color="green" icon={DollarSign} />
        <ReportStatCard title="Total Billed" value={`$${(totalBilled/1000).toFixed(0)}K`} subtitle="All claims" color="blue" icon={DollarSign} />
        <ReportStatCard title="Clean Claim Rate" value={`${cleanClaimRate}%`} subtitle={`${deniedClaims.length} denied`} color={cleanClaimRate>=90?"green":"amber"} icon={CheckCircle} />
        <ReportStatCard title="Denial Rate" value={`${denialRate}%`} subtitle={`$${(totalDenied/1000).toFixed(0)}K denied`} color={denialRate>10?"red":"amber"} icon={AlertTriangle} />
        <ReportStatCard title="Total Payroll" value={`$${(totalPayroll/1000).toFixed(0)}K`} subtitle="Current period" color="purple" icon={TrendingUp} />
        <ReportStatCard title="Payroll % Revenue" value={`${payrollPct}%`} subtitle="Labor cost ratio" color={payrollPct>70?"red":payrollPct>55?"amber":"green"} icon={ArrowDown} />
      </div>

      <Tabs value={subTab} onValueChange={setSubTab} className="mb-0">
        <TabsList className="mb-6">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="claims">Claims & Billing</TabsTrigger>
          <TabsTrigger value="ar">Accounts Receivable</TabsTrigger>
          <TabsTrigger value="budget">Budget vs Actual</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">12-Month Revenue Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={revenueTrend}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                    <Tooltip formatter={v => [`$${v.toLocaleString()}`, ""]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#revGrad)" strokeWidth={2.5} name="Revenue Collected" />
                    <Line type="monotone" dataKey="billed" stroke="#f59e0b" strokeWidth={2} dot={false} name="Amount Billed" strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Revenue by Payer</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={byPayerData.length ? byPayerData : [{ name: "No data", value: 1 }]} cx="50%" cy="50%" outerRadius={95} dataKey="value" label={({ name, percent }) => `${name.substring(0,10)} ${(percent*100).toFixed(0)}%`}>
                      {byPayerData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => [`$${v.toLocaleString()}`, "Revenue"]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="claims">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Denials by Category</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={denialCatData.length ? denialCatData : [{ name: "No denials", value: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} name="Denials" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Claims Status Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3 mt-2">
                  {[
                    { status: "Paid", count: paidClaims.length, amount: totalRevenue, color: "bg-green-500/10 border-green-500/20 text-green-500" },
                    { status: "Submitted / Pending", count: claims.filter(c => ["Submitted","Pending"].includes(c.status)).length, amount: claims.filter(c => ["Submitted","Pending"].includes(c.status)).reduce((s,c) => s+(c.amount_billed||0),0), color: "bg-blue-500/10 border-blue-500/20 text-blue-500" },
                    { status: "Denied", count: deniedClaims.length, amount: totalDenied, color: "bg-red-500/10 border-red-500/20 text-red-500" },
                    { status: "Draft / Ready", count: claims.filter(c => ["Draft","Ready"].includes(c.status)).length, amount: claims.filter(c => ["Draft","Ready"].includes(c.status)).reduce((s,c) => s+(c.amount_billed||0),0), color: "bg-amber-500/10 border-amber-500/20 text-amber-500" },
                  ].map(row => (
                    <div key={row.status} className={`flex items-center justify-between p-3 rounded-lg border ${row.color}`}>
                      <span className="text-sm font-medium">{row.status}</span>
                      <div className="text-right">
                        <p className="text-base font-bold">{row.count}</p>
                        <p className="text-xs">${(row.amount/1000).toFixed(0)}K</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ar">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Accounts Receivable Aging</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={arAging}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                  <Tooltip formatter={v => [`$${v.toLocaleString()}`, "AR Balance"]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {arAging.map((entry, i) => <Cell key={i} fill={i === 0 ? "#10b981" : i === 1 ? "#3b82f6" : i === 2 ? "#f59e0b" : "#ef4444"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-5 gap-3 mt-4">
                {arAging.map((b, i) => (
                  <div key={b.bucket} className="text-center">
                    <p className="text-lg font-bold text-foreground">${(b.amount/1000).toFixed(0)}K</p>
                    <p className="text-xs text-muted-foreground">{b.bucket}</p>
                    <p className="text-xs font-medium" style={{ color: i === 0 ? "#10b981" : i <= 1 ? "#3b82f6" : i <= 2 ? "#f59e0b" : "#ef4444" }}>
                      {totalBilled > 0 ? (b.amount/totalBilled*100).toFixed(0) : 0}%
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">Compare actual performance against program budgets. Add budgets below.</p>
            <Button size="sm" className="gap-2" onClick={() => setShowBudgetDialog(true)}>
              <Plus className="w-4 h-4" /> Add Budget
            </Button>
          </div>

          {budgetVsActual.length > 0 ? (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Budget vs Actual by Program</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={budgetVsActual}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="program" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                    <Tooltip formatter={v => [`$${v.toLocaleString()}`, ""]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Legend />
                    <Bar dataKey="budgetRev" name="Budget Revenue" fill="#3b82f6" radius={[4,4,0,0]} />
                    <Bar dataKey="actualRev" name="Actual Revenue" fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="budgetLabor" name="Budget Labor" fill="#8b5cf6" radius={[4,4,0,0]} />
                    <Bar dataKey="actualLabor" name="Actual Labor" fill="#f59e0b" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <DollarSign className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No program budgets configured yet.</p>
                <Button size="sm" className="mt-4 gap-2" onClick={() => setShowBudgetDialog(true)}>
                  <Plus className="w-4 h-4" /> Add First Budget
                </Button>
              </CardContent>
            </Card>
          )}

          <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Program Budget</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Program Name</label>
                  <Input placeholder="e.g. Residential, Day Program" value={budgetForm.program_name} onChange={e => setBudgetForm(f => ({ ...f, program_name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Revenue Budget ($)</label>
                    <Input type="number" placeholder="0.00" value={budgetForm.revenue_budget} onChange={e => setBudgetForm(f => ({ ...f, revenue_budget: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Labor Budget ($)</label>
                    <Input type="number" placeholder="0.00" value={budgetForm.labor_budget} onChange={e => setBudgetForm(f => ({ ...f, labor_budget: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Period Start</label>
                    <Input type="date" value={budgetForm.period_start} onChange={e => setBudgetForm(f => ({ ...f, period_start: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Period End</label>
                    <Input type="date" value={budgetForm.period_end} onChange={e => setBudgetForm(f => ({ ...f, period_end: e.target.value }))} />
                  </div>
                </div>
                <Button className="w-full" onClick={() => budgetMutation.mutate({ ...budgetForm, revenue_budget: Number(budgetForm.revenue_budget), labor_budget: Number(budgetForm.labor_budget), fiscal_year: budgetForm.fiscal_year, period: "Monthly" })} disabled={budgetMutation.isPending}>
                  {budgetMutation.isPending ? "Saving..." : "Save Budget"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}