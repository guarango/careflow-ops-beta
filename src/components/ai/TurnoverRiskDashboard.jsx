import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AIBadge from "./AIBadge";
import { Sparkles, TrendingDown, AlertTriangle, User, ChevronDown, ChevronUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const RISK_CONFIG = {
  high: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", badge: "bg-red-500/20 text-red-400 border-red-500/30", bar: "#ef4444" },
  medium: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", badge: "bg-amber-500/15 text-amber-400 border-amber-500/20", bar: "#f59e0b" },
  low: { color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", badge: "bg-green-500/15 text-green-400 border-green-500/20", bar: "#10b981" },
};

function StaffRiskCard({ score }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = RISK_CONFIG[score.risk_level] || RISK_CONFIG.low;

  const factors = [
    { label: "Tenure", value: score.tenure_factor, desc: "Years of service" },
    { label: "Overtime", value: score.overtime_factor, desc: "Overtime frequency" },
    { label: "Doc Compliance", value: score.doc_compliance_factor, desc: "Documentation rate" },
    { label: "Performance", value: score.performance_factor, desc: "Review scores" },
    { label: "Training", value: score.training_factor, desc: "Training completion" },
    { label: "Schedule", value: score.schedule_factor, desc: "Schedule consistency" },
  ].filter(f => f.value != null);

  return (
    <div className={`rounded-xl border p-4 ${cfg.bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${cfg.badge}`}>
            {score.risk_score?.toFixed(0) || "–"}
          </div>
          <div>
            <p className="text-sm font-semibold">{score.staff_name}</p>
            <Badge variant="outline" className={`text-xs mt-0.5 ${cfg.badge}`}>{score.risk_level?.toUpperCase()} RISK</Badge>
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          {factors.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {factors.map(f => (
                <div key={f.label} className="text-center">
                  <div className="text-xs text-muted-foreground">{f.label}</div>
                  <div className={`text-sm font-bold ${f.value > 60 ? cfg.color : "text-green-400"}`}>{f.value?.toFixed(0)}</div>
                </div>
              ))}
            </div>
          )}
          {score.ai_explanation && (
            <div className="mt-2 p-2 rounded-lg bg-black/20">
              <AIBadge className="mb-1" />
              <p className="text-xs text-muted-foreground mt-1">{score.ai_explanation}</p>
            </div>
          )}
          {score.recommended_interventions?.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-foreground mb-1">Recommended Interventions:</p>
              <ul className="space-y-0.5">
                {score.recommended_interventions.map((r, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                    <span className="text-violet-400 mt-0.5">•</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TurnoverRiskDashboard() {
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: scores = [], isLoading } = useQuery({
    queryKey: ["turnoverRiskScores"],
    queryFn: () => base44.entities.TurnoverRiskScore.list("-risk_score", 50),
  });

  const { data: staffList = [] } = useQuery({
    queryKey: ["staffMembers"],
    queryFn: () => base44.entities.StaffMember.filter({ status: "Active" }, "-hire_date", 50),
  });

  const createScore = useMutation({
    mutationFn: (data) => base44.entities.TurnoverRiskScore.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["turnoverRiskScores"] }),
  });

  const generateRiskScores = async () => {
    setGenerating(true);
    try {
      for (const staff of staffList.slice(0, 10)) {
        const prompt = `Assess the 90-day turnover risk for a DSP (Direct Support Professional) in an I/DD agency.

Staff info:
- Name: ${staff.first_name} ${staff.last_name}
- Hire date: ${staff.hire_date || "Unknown"}
- Role: ${staff.role}
- Status: ${staff.status}
- Training hours: ${staff.training_hours || 0}

Rate each factor 0-100 (higher = higher risk). Return JSON:
{
  "risk_score": <0-100 composite>,
  "risk_level": "low"|"medium"|"high",
  "tenure_factor": <0-100>,
  "overtime_factor": <0-100>,
  "doc_compliance_factor": <0-100>,
  "performance_factor": <0-100>,
  "training_factor": <0-100>,
  "schedule_factor": <0-100>,
  "ai_explanation": "<2 sentences>",
  "recommended_interventions": ["...", "...", "..."]
}`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              risk_score: { type: "number" },
              risk_level: { type: "string" },
              tenure_factor: { type: "number" },
              overtime_factor: { type: "number" },
              doc_compliance_factor: { type: "number" },
              performance_factor: { type: "number" },
              training_factor: { type: "number" },
              schedule_factor: { type: "number" },
              ai_explanation: { type: "string" },
              recommended_interventions: { type: "array", items: { type: "string" } },
            },
          },
        });

        if (result?.risk_score != null) {
          await createScore.mutateAsync({
            staff_id: staff.id,
            staff_name: `${staff.first_name} ${staff.last_name}`,
            predicted_at: new Date().toISOString(),
            ...result,
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  const high = scores.filter(s => s.risk_level === "high");
  const medium = scores.filter(s => s.risk_level === "medium");
  const low = scores.filter(s => s.risk_level === "low");

  const chartData = [
    { name: "Low Risk", count: low.length, fill: "#10b981" },
    { name: "Medium Risk", count: medium.length, fill: "#f59e0b" },
    { name: "High Risk", count: high.length, fill: "#ef4444" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">Staff Turnover Risk</h2>
          <AIBadge label="Predictive AI" />
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700" onClick={generateRiskScores} disabled={generating}>
          {generating ? <><span className="animate-spin mr-2">⟳</span>Scoring Staff...</> : <><Sparkles className="w-4 h-4 mr-2" />Run Risk Analysis</>}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "High Risk", count: high.length, color: "text-red-400" },
          { label: "Medium Risk", count: medium.length, color: "text-amber-400" },
          { label: "Low Risk", count: low.length, color: "text-green-400" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="py-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {scores.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Risk Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="count" name="Staff" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {isLoading && <div className="text-center py-8 text-muted-foreground text-sm">Loading risk scores...</div>}

      {!isLoading && scores.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <TrendingDown className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No risk scores yet. Click "Run Risk Analysis" to generate predictions.</p>
        </div>
      )}

      {high.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2">High Risk — Immediate Attention Needed</p>
          <div className="space-y-2">{high.map(s => <StaffRiskCard key={s.id} score={s} />)}</div>
        </div>
      )}
      {medium.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">Medium Risk — Monitor Closely</p>
          <div className="space-y-2">{medium.map(s => <StaffRiskCard key={s.id} score={s} />)}</div>
        </div>
      )}
      {low.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-2">Low Risk — Stable</p>
          <div className="space-y-2">{low.map(s => <StaffRiskCard key={s.id} score={s} />)}</div>
        </div>
      )}
    </div>
  );
}