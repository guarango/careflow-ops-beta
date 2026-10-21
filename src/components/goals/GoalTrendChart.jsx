import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp, Calendar, Target } from "lucide-react";
import { format, parseISO, subMonths, isSameMonth } from "date-fns";

/**
 * GoalTrendChart — shows a trend chart and monthly summary for a goal's progress entries.
 */
export default function GoalTrendChart({ goal }) {
  const entries = (goal.progress_entries || []).filter(e => !e.missed_reason);

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
        <TrendingUp className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
        No progress data yet to chart.
      </div>
    );
  }

  // Build chart data — extract numeric scores from entries
  const chartData = entries.map(e => {
    let val = null;
    if (e.percentage != null) {
      val = e.percentage;
    } else if (e.trials_total > 0 && e.trials_correct != null) {
      val = Math.round((e.trials_correct / e.trials_total) * 100);
    } else {
      const m = e.score?.match(/(\d+)%/);
      if (m) val = parseInt(m[1]);
      else {
        const m2 = e.score?.match(/(\d+)\/(\d+)/);
        if (m2) val = Math.round((parseInt(m2[1]) / parseInt(m2[2])) * 100);
        else {
          const m3 = e.score?.match(/^(\d+)$/);
          if (m3) val = parseInt(m3[1]);
        }
      }
    }
    return {
      date: e.date,
      label: e.date ? format(parseISO(e.date), "MMM d") : "",
      value: val,
      raw: e.score,
      recorded_by: e.recorded_by,
    };
  }).filter(d => d.value !== null);

  // Monthly summary
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEntries = entries.filter(e => {
    if (!e.date) return false;
    const d = parseISO(e.date);
    return isSameMonth(d, now);
  });

  const targetVal = goal.target_value || (goal.mastery_criteria ? parseInt(goal.mastery_criteria.match(/(\d+)%/)?.[1] || "0") : null);
  const isPRN = goal.charting_mode === "PRN";
  const prnMin = goal.prn_monthly_minimum;
  const prnCount = monthEntries.length;
  const prnMet = prnMin ? prnCount >= prnMin : true;

  // Avg for percentage type
  const pctValues = chartData.map(d => d.value).filter(v => v <= 100);
  const avgPct = pctValues.length > 0 ? Math.round(pctValues.reduce((a, b) => a + b, 0) / pctValues.length) : null;

  return (
    <div className="space-y-4">
      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/40 rounded-lg p-3 text-center">
          <Calendar className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
          <p className="text-lg font-bold">{monthEntries.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Times Charted (this month)</p>
        </div>
        <div className="bg-muted/40 rounded-lg p-3 text-center">
          <Target className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
          <p className="text-lg font-bold">
            {targetVal ? `${targetVal}` : "—"}
            {goal.measurement_type === "percentage" ? "%" : ""}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Target</p>
        </div>
        {isPRN ? (
          <div className={`rounded-lg p-3 text-center ${prnMet ? "bg-emerald-50" : "bg-amber-50"}`}>
            <p className="text-lg font-bold">{prnCount}/{prnMin || "—"}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">PRN Min/Month</p>
          </div>
        ) : (
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <TrendingUp className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold">{avgPct !== null ? `${avgPct}%` : "—"}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Avg Score</p>
          </div>
        )}
      </div>

      {/* Trend Chart */}
      {chartData.length > 0 && (
        <div className="bg-white border border-border rounded-lg p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Progress Trend</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, goal.measurement_type === "percentage" ? 100 : "auto"]} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value) => [value + (goal.measurement_type === "percentage" ? "%" : ""), "Score"]}
                labelFormatter={(label, payload) => {
                  const entry = payload?.[0]?.payload;
                  return entry ? `${entry.date}${entry.recorded_by ? ` — ${entry.recorded_by}` : ""}` : label;
                }}
              />
              <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              {targetVal && <ReferenceLine y={targetVal} stroke="#10b981" strokeDasharray="5 5" label={{ value: "Target", fontSize: 9, fill: "#10b981" }} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}