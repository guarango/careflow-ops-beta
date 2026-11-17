import React from "react";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { TREND_STYLES, TRENDS } from "@/lib/quarterlySummary";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

/** One goal's progress for the quarter, with the quarter's data line. */
export default function GoalProgressCard({ row, editable, onChange, codesById }) {
  const narrativeMissing = !String(row.narrative || "").trim();
  const series = (row.series || []).filter(p => p.value !== null && p.value !== undefined);

  const update = (patch) => onChange({ ...row, ...patch });

  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-sm">{row.goal_title || "Untitled goal"}</p>
          {row.pcsp_goal_text && (
            <p className="text-xs text-muted-foreground mt-0.5">PCSP goal: {row.pcsp_goal_text}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {row.data_points_count || 0} data point(s) · Baseline {row.baseline || "not recorded"} · Current{" "}
            {row.current_level || "insufficient data"}
            {row.prompt_level_trend ? ` · Prompting ${row.prompt_level_trend}` : ""}
          </p>
        </div>
        <Badge variant="outline" className={cn("shrink-0", TREND_STYLES[row.trend] || "")}>
          {row.trend || "Insufficient data"}
        </Badge>
      </div>

      {series.length > 1 ? (
        <div className="h-[76px] -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                labelFormatter={(l) => l}
                formatter={(v) => [v, "Score"]}
              />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          {series.length === 1 ? "One data point this quarter — a trend needs at least two." : "No data points this quarter."}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-[180px_1fr] sm:items-start">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Trend</label>
          <Select
            value={row.trend || "Insufficient data"}
            onValueChange={(v) => editable && update({ trend: v })}
            disabled={!editable}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRENDS.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-xs pt-1">
            <Checkbox
              checked={!!row.mastery_met}
              disabled={!editable}
              onCheckedChange={(v) => editable && update({ mastery_met: !!v })}
            />
            Mastery met
          </label>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Progress narrative {narrativeMissing && <span className="text-rose-600">(required to sign)</span>}
          </label>
          <Textarea
            rows={3}
            value={row.narrative || ""}
            disabled={!editable}
            placeholder={
              row.trend === "Insufficient data"
                ? "Explain why there was not enough data this quarter."
                : "Describe progress toward this goal, citing the data above."
            }
            onChange={(e) => update({ narrative: e.target.value })}
            className={cn(narrativeMissing && "border-rose-300")}
          />
        </div>
      </div>

      {row.trend === "Insufficient data" && narrativeMissing && (
        <p className="text-xs text-amber-700 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Insufficient data is allowed, but the narrative must explain why.
        </p>
      )}

      {codesById && (row.service_code_ids || []).length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Service(s): {row.service_code_ids.map(id => codesById[id]).filter(Boolean).join(", ")}
        </p>
      )}
    </div>
  );
}