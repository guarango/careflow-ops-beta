import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp, Settings as SettingsIcon, ChevronDown, ChevronRight } from "lucide-react";
import { pctBg } from "./StatusCell";

const DEFAULT_WEIGHTS = { staff: 40, client: 35, charting: 25 };
const STORAGE_KEY = "careflow_compliance_weights";
const TREND_KEY = "careflow_compliance_trend";

export function getComplianceWeights() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_WEIGHTS;
  } catch { return DEFAULT_WEIGHTS; }
}

export function saveComplianceWeights(w) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(w));
}

export function getScoreTrend() {
  try {
    const stored = localStorage.getItem(TREND_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

export function recordScore(score) {
  const trend = getScoreTrend();
  const today = new Date().toISOString().split("T")[0];
  const existing = trend.find(t => t.date === today);
  if (existing) existing.score = score;
  else trend.push({ date: today, score });
  if (trend.length > 90) trend.shift();
  localStorage.setItem(TREND_KEY, JSON.stringify(trend));
}

export default function AgencyScoreDashboard({ staffScore, clientScore, chartingScore }) {
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [showSettings, setShowSettings] = useState(false);
  const [showDrillDown, setShowDrillDown] = useState(true);
  const [trend, setTrend] = useState([]);

  useEffect(() => {
    setWeights(getComplianceWeights());
    setTrend(getScoreTrend());
  }, []);

  const agencyScore = useMemo(() => {
    const total = weights.staff + weights.client + weights.charting;
    if (total === 0) return 0;
    return Math.round(
      (staffScore * weights.staff + clientScore * weights.client + chartingScore * weights.charting) / total
    );
  }, [staffScore, clientScore, chartingScore, weights]);

  useEffect(() => {
    if (agencyScore > 0) {
      recordScore(agencyScore);
      setTrend(getScoreTrend());
    }
  }, [agencyScore]);

  const handleSaveWeights = () => {
    saveComplianceWeights(weights);
    setShowSettings(false);
  };

  const drillDowns = [
    { label: "Staff Files", score: staffScore, weight: weights.staff, items: ["Background checks", "Onboarding docs", "Core trainings", "CPR/First Aid", "Training hours"] },
    { label: "Client Files", score: clientScore, weight: weights.client, items: ["PCSP current", "Support strategies", "Med orders/MAR", "Active authorizations", "Quarterly summaries"] },
    { label: "Charting", score: chartingScore, weight: weights.charting, items: ["Notes on time", "Notes approved", "Med passes", "Goals charted", "EVV exceptions"] },
  ].filter(d => d.score !== null && d.score !== undefined);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-muted-foreground mb-2">Agency Compliance Score</p>
            <div className={`text-6xl font-bold ${agencyScore >= 90 ? "text-green-600" : agencyScore >= 75 ? "text-yellow-600" : agencyScore >= 50 ? "text-orange-600" : "text-red-600"}`}>
              {agencyScore}
            </div>
            <p className="text-xs text-muted-foreground mt-2">out of 100</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Score Trend</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)} className="gap-1">
              <SettingsIcon className="w-3 h-3" /> Weights
            </Button>
          </CardHeader>
          <CardContent>
            {showSettings && (
              <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-muted/40 rounded-lg">
                {["staff", "client", "charting"].map(key => (
                  <div key={key}>
                    <Label className="text-xs capitalize">{key} Weight (%)</Label>
                    <Input type="number" value={weights[key]} onChange={e => setWeights(w => ({ ...w, [key]: parseInt(e.target.value) || 0 }))} />
                  </div>
                ))}
                <div className="col-span-3 flex justify-end">
                  <Button size="sm" onClick={handleSaveWeights}>Save Weights</Button>
                </div>
              </div>
            )}
            {trend.length > 1 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={trend}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <ReferenceLine y={75} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "Target", fontSize: 10 }} />
                  <Line type="monotone" dataKey="score" stroke="#0ea5e9" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
                Trend builds as you check compliance over time
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between cursor-pointer" onClick={() => setShowDrillDown(!showDrillDown)}>
          <CardTitle className="text-sm font-medium">What's Pulling It Down</CardTitle>
          {showDrillDown ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </CardHeader>
        {showDrillDown && (
          <CardContent className="space-y-3">
            {drillDowns.map(d => (
              <div key={d.label} className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium">{d.label}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${pctBg(d.score)}`} style={{ width: `${d.score}%` }} />
                    </div>
                    <span className="text-sm font-semibold w-10">{d.score}%</span>
                    <span className="text-xs text-muted-foreground w-16">weight {d.weight}%</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{d.items.join(" · ")}</div>
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}