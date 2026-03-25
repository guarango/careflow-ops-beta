import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AIBadge from "./AIBadge";
import { AlertTriangle, Brain, CheckCircle2, Eye, TrendingDown, Users, Pill, Target, DollarSign, Sparkles } from "lucide-react";

const SEVERITY_CONFIG = {
  critical: { color: "bg-red-500/15 border-red-500/30 text-red-400", badge: "bg-red-500/20 text-red-400 border-red-500/30", dot: "bg-red-500" },
  high: { color: "bg-orange-500/15 border-orange-500/30 text-orange-400", badge: "bg-orange-500/20 text-orange-400 border-orange-500/30", dot: "bg-orange-500" },
  medium: { color: "bg-amber-500/10 border-amber-500/20 text-amber-400", badge: "bg-amber-500/15 text-amber-400 border-amber-500/20", dot: "bg-amber-500" },
  low: { color: "bg-blue-500/10 border-blue-500/20 text-blue-400", badge: "bg-blue-500/15 text-blue-400 border-blue-500/20", dot: "bg-blue-500" },
};

const TYPE_ICONS = {
  behavioral: Brain,
  medication: Pill,
  goal_progress: Target,
  authorization: DollarSign,
  workforce: Users,
  documentation: AlertTriangle,
};

function RiskAlertCard({ alert, onAcknowledge, onResolve, onDismiss }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
  const Icon = TYPE_ICONS[alert.alert_type] || AlertTriangle;

  return (
    <div className={`rounded-xl border p-4 ${cfg.color}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5"><Icon className="w-4 h-4" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="text-sm font-semibold">{alert.title}</p>
              {alert.client_name && <p className="text-xs opacity-80 mt-0.5">Client: {alert.client_name}</p>}
              {alert.staff_name && <p className="text-xs opacity-80">Staff: {alert.staff_name}</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="outline" className={`text-xs ${cfg.badge}`}>{alert.severity.toUpperCase()}</Badge>
              {alert.confidence_score && (
                <span className="text-xs opacity-70">{alert.confidence_score}% confidence</span>
              )}
            </div>
          </div>
          <p className="text-xs mt-1.5 opacity-90">{alert.description}</p>
          {alert.ai_explanation && (
            <button className="text-xs underline opacity-70 mt-1" onClick={() => setExpanded(!expanded)}>
              {expanded ? "Hide AI Explanation" : "Show AI Explanation"}
            </button>
          )}
          {expanded && (
            <div className="mt-2 p-2.5 rounded-lg bg-black/20 text-xs opacity-90">
              <AIBadge label="AI Analysis" className="mb-1.5" />
              <p>{alert.ai_explanation}</p>
              {alert.recommended_action && (
                <p className="mt-1.5 font-semibold">Recommended: {alert.recommended_action}</p>
              )}
            </div>
          )}
          {alert.status === "open" && (
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAcknowledge(alert.id)}>
                <Eye className="w-3 h-3 mr-1" />Acknowledge
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs text-green-400 border-green-500/30 hover:bg-green-500/10" onClick={() => onResolve(alert.id)}>
                <CheckCircle2 className="w-3 h-3 mr-1" />Resolve
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => onDismiss(alert.id)}>Dismiss</Button>
            </div>
          )}
          {alert.status !== "open" && (
            <Badge variant="outline" className="mt-2 text-xs">{alert.status}</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClinicalRiskDashboard() {
  const [tab, setTab] = useState("all");
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["riskAlerts"],
    queryFn: () => base44.entities.RiskAlert.list("-created_date", 100),
  });

  const updateAlert = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RiskAlert.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["riskAlerts"] }),
  });

  const handleAcknowledge = (id) => updateAlert.mutate({ id, data: { status: "acknowledged", acknowledged_at: new Date().toISOString() } });
  const handleResolve = (id) => updateAlert.mutate({ id, data: { status: "resolved", resolved_at: new Date().toISOString() } });
  const handleDismiss = (id) => updateAlert.mutate({ id, data: { status: "dismissed" } });

  const openAlerts = alerts.filter(a => a.status === "open");
  const byType = (type) => openAlerts.filter(a => a.alert_type === type);
  const critical = openAlerts.filter(a => a.severity === "critical" || a.severity === "high").length;

  const typeFilters = [
    { key: "all", label: "All Open", count: openAlerts.length },
    { key: "behavioral", label: "Behavioral", count: byType("behavioral").length, icon: Brain },
    { key: "medication", label: "Medication", count: byType("medication").length, icon: Pill },
    { key: "goal_progress", label: "Goals", count: byType("goal_progress").length, icon: Target },
    { key: "authorization", label: "Auth", count: byType("authorization").length, icon: DollarSign },
    { key: "workforce", label: "Workforce", count: byType("workforce").length, icon: Users },
    { key: "documentation", label: "Docs", count: byType("documentation").length, icon: AlertTriangle },
  ];

  const filteredAlerts = tab === "all" ? openAlerts : openAlerts.filter(a => a.alert_type === tab);
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] || 2) - (order[b.severity] || 2);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">Clinical Risk Intelligence</h2>
          <AIBadge label="AI-Powered" />
        </div>
        {critical > 0 && (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-1.5 inline-block" />
            {critical} High-Priority Alert{critical > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Open Alerts", value: openAlerts.length, color: "text-foreground" },
          { label: "Critical / High", value: critical, color: "text-red-400" },
          { label: "Acknowledged", value: alerts.filter(a => a.status === "acknowledged").length, color: "text-amber-400" },
          { label: "Resolved (30d)", value: alerts.filter(a => a.status === "resolved").length, color: "text-green-400" },
        ].map(s => (
          <Card key={s.label} className="text-center py-2">
            <CardContent className="py-3 px-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {typeFilters.map(f => (
          <button key={f.key} onClick={() => setTab(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors ${tab === f.key ? "bg-violet-500 border-violet-500 text-white" : "border-border text-muted-foreground hover:border-violet-500/50"}`}>
            {f.label}
            {f.count > 0 && <span className={`px-1.5 py-0.5 rounded-full text-xs ${tab === f.key ? "bg-white/20" : "bg-muted"}`}>{f.count}</span>}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-center py-8 text-muted-foreground text-sm">Loading alerts...</div>}

      {!isLoading && sortedAlerts.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No open alerts</p>
          <p className="text-xs text-muted-foreground mt-1">All clear in this category. The AI monitors continuously.</p>
        </div>
      )}

      <div className="space-y-3">
        {sortedAlerts.map(alert => (
          <RiskAlertCard key={alert.id} alert={alert}
            onAcknowledge={handleAcknowledge}
            onResolve={handleResolve}
            onDismiss={handleDismiss} />
        ))}
      </div>
    </div>
  );
}