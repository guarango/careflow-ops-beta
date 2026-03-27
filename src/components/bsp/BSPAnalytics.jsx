import React, { useState, useMemo } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Activity } from "lucide-react";
import { format, subDays, parseISO, startOfWeek, startOfMonth, eachDayOfInterval, eachWeekOfInterval } from "date-fns";
import { cn } from "@/lib/utils";

const ANTECEDENT_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
const SEVERITY_COLORS = { Mild: "#f59e0b", Moderate: "#f97316", Severe: "#ef4444" };

export default function BSPAnalytics({ bsp, incidents }) {
  const [behaviorFilter, setBehaviorFilter] = useState("all");
  const [timeRange, setTimeRange] = useState("30");

  const behaviors = bsp?.target_behaviors || [];

  const filtered = useMemo(() => {
    const days = parseInt(timeRange);
    const cutoff = subDays(new Date(), days);
    return incidents.filter(inc => {
      const matchBehavior = behaviorFilter === "all" || inc.target_behavior_id === behaviorFilter;
      const matchDate = inc.date && new Date(inc.date) >= cutoff;
      return matchBehavior && matchDate;
    });
  }, [incidents, behaviorFilter, timeRange]);

  // Trend calculation vs prior period
  const trendIndicator = useMemo(() => {
    const days = parseInt(timeRange);
    const now = new Date();
    const currentPeriodStart = subDays(now, days);
    const priorPeriodStart = subDays(now, days * 2);
    const current = incidents.filter(i => i.date && new Date(i.date) >= currentPeriodStart).length;
    const prior = incidents.filter(i => i.date && new Date(i.date) >= priorPeriodStart && new Date(i.date) < currentPeriodStart).length;
    if (prior === 0 && current === 0) return { label: "Insufficient Data", color: "text-muted-foreground", icon: Minus };
    if (prior === 0) return { label: "Insufficient Data", color: "text-muted-foreground", icon: Minus };
    const pct = ((current - prior) / prior) * 100;
    if (pct > 20) return { label: `Worsening (+${Math.round(pct)}%)`, color: "text-red-600", icon: TrendingUp };
    if (pct < -10) return { label: `Improving (${Math.round(pct)}%)`, color: "text-emerald-600", icon: TrendingDown };
    return { label: "Stable", color: "text-amber-600", icon: Minus };
  }, [incidents, timeRange]);

  const autoFlags = useMemo(() => {
    const flags = [];
    const days30 = subDays(new Date(), 30);
    const recent30 = incidents.filter(i => i.date && new Date(i.date) >= days30).length;
    const prev30start = subDays(new Date(), 60);
    const prior30 = incidents.filter(i => i.date && new Date(i.date) >= prev30start && new Date(i.date) < days30).length;
    if (prior30 > 0 && ((recent30 - prior30) / prior30) > 0.2) {
      flags.push({ type: "warning", message: `Incidents increased ${Math.round(((recent30 - prior30) / prior30) * 100)}% over the prior 30-day period` });
    }
    const last7 = subDays(new Date(), 7);
    const restrictiveLast7 = incidents.filter(i => i.date && new Date(i.date) >= last7 && i.restrictive_procedure_used).length;
    if (restrictiveLast7 > 3) {
      flags.push({ type: "critical", message: `Restrictive procedure used ${restrictiveLast7} times in the past 7 days — supervisor review required` });
    }
    if (bsp?.next_review_date) {
      const reviewDate = new Date(bsp.next_review_date);
      const daysUntil = Math.round((reviewDate - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 30 && daysUntil > 0) {
        flags.push({ type: "info", message: `BSP review due in ${daysUntil} days (${format(reviewDate, "MMM d, yyyy")})` });
      } else if (daysUntil <= 0) {
        flags.push({ type: "critical", message: "BSP review is overdue!" });
      }
    }
    return flags;
  }, [incidents, bsp]);

  // Frequency by day
  const frequencyData = useMemo(() => {
    const days = parseInt(timeRange);
    const interval = eachDayOfInterval({ start: subDays(new Date(), days - 1), end: new Date() });
    return interval.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const count = filtered.filter(i => i.date === dateStr).length;
      return { date: format(day, "MMM d"), count };
    });
  }, [filtered, timeRange]);

  // Antecedent analysis
  const antecedentData = useMemo(() => {
    const counts = {};
    filtered.forEach(i => { counts[i.antecedent] = (counts[i.antecedent] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // Time of day heatmap (0-23)
  const timeHeatmap = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`, count: 0 }));
    filtered.forEach(i => {
      if (i.start_time) {
        const h = parseInt(i.start_time.split(":")[0]);
        hours[h].count++;
      }
    });
    return hours;
  }, [filtered]);
  const maxHour = Math.max(...timeHeatmap.map(h => h.count), 1);

  // Severity distribution
  const severityData = [
    { name: "Mild", value: filtered.filter(i => i.severity_tier === "Mild").length },
    { name: "Moderate", value: filtered.filter(i => i.severity_tier === "Moderate").length },
    { name: "Severe", value: filtered.filter(i => i.severity_tier === "Severe").length },
  ].filter(d => d.value > 0);

  // Staff analysis
  const staffData = useMemo(() => {
    const counts = {};
    filtered.forEach(i => { if (i.staff_present) counts[i.staff_present] = (counts[i.staff_present] || 0) + 1; });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [filtered]);

  const TrendIcon = trendIndicator.icon;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={behaviorFilter} onValueChange={setBehaviorFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Behaviors</SelectItem>
            {behaviors.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
        <div className={cn("flex items-center gap-1.5 text-sm font-medium", trendIndicator.color)}>
          <TrendIcon className="w-4 h-4" />
          <span>{trendIndicator.label}</span>
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} incidents</span>
      </div>

      {/* Auto-flags */}
      {autoFlags.length > 0 && (
        <div className="space-y-2">
          {autoFlags.map((flag, i) => (
            <div key={i} className={cn("flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm", flag.type === "critical" ? "bg-red-50 border border-red-300 text-red-700" : flag.type === "warning" ? "bg-amber-50 border border-amber-300 text-amber-700" : "bg-blue-50 border border-blue-200 text-blue-700")}>
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{flag.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Frequency over time */}
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-sm font-semibold mb-3">Incident Frequency</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={frequencyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.floor(frequencyData.length / 5)} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Antecedent analysis */}
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-sm font-semibold mb-3">Most Common Antecedents</p>
          {antecedentData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-10">No data yet</p>
          ) : (
            <div className="space-y-2">
              {antecedentData.slice(0, 6).map((d, i) => {
                const pct = Math.round((d.value / filtered.length) * 100);
                return (
                  <div key={d.name}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="font-medium">{d.name}</span>
                      <span className="text-muted-foreground">{d.value} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: ANTECEDENT_COLORS[i % ANTECEDENT_COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Time of day heatmap */}
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-sm font-semibold mb-3">Time-of-Day Clustering</p>
          <div className="flex gap-px flex-wrap">
            {timeHeatmap.map(h => {
              const intensity = maxHour > 0 ? h.count / maxHour : 0;
              return (
                <div key={h.hour} title={`${h.label}: ${h.count} incidents`} className="flex flex-col items-center gap-0.5" style={{ width: "calc(100% / 24 - 1px)" }}>
                  <div className="w-full rounded-sm" style={{
                    height: 40,
                    backgroundColor: intensity === 0 ? "hsl(var(--muted))" : `hsla(0, 72%, 51%, ${0.15 + intensity * 0.85})`,
                  }} />
                  {[0, 6, 12, 18, 23].includes(h.hour) && <span className="text-[9px] text-muted-foreground">{h.label}</span>}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Darker = more incidents during that hour</p>
        </div>

        {/* Severity distribution */}
        <div className="bg-white border border-border rounded-xl p-4">
          <p className="text-sm font-semibold mb-3">Severity Distribution</p>
          {severityData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-10">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={11}>
                  {severityData.map((entry, i) => <Cell key={i} fill={SEVERITY_COLORS[entry.name]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Staff presence — framed as coaching opportunity */}
      {staffData.length > 0 && (
        <div className="bg-white border border-border rounded-xl p-4">
          <div className="flex items-start gap-2 mb-3">
            <Activity className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Staff Presence Analysis</p>
              <p className="text-xs text-muted-foreground">Surfaced as a coaching and scheduling insight — not as blame. High incident counts during a staff member's shift may indicate a training or support need, or may simply reflect more documented hours.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {staffData.map(s => (
              <div key={s.name} className="bg-muted/40 rounded-lg px-3 py-2 text-center">
                <p className="font-semibold text-sm">{s.count}</p>
                <p className="text-xs text-muted-foreground truncate">{s.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}