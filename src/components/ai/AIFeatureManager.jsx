import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AIBadge from "./AIBadge";
import { Sparkles, Shield, Brain, FileText, Zap, TrendingUp, Calendar, DollarSign, AlertTriangle } from "lucide-react";

const AI_FEATURES = [
  {
    key: "session_note_assistant",
    name: "Session Note Assistant",
    description: "AI-drafts session notes from structured DSP inputs. Reduces documentation time by 60%.",
    icon: FileText,
    category: "Documentation",
    hipaa_note: "Processes visit data locally — no PHI sent externally without BAA.",
    plan_required: "professional",
  },
  {
    key: "incident_report_assistant",
    name: "Incident Report Assistant",
    description: "Guides staff through structured incident intake and generates compliant report drafts.",
    icon: AlertTriangle,
    category: "Documentation",
    hipaa_note: "Processes incident data locally — no PHI sent externally without BAA.",
    plan_required: "professional",
  },
  {
    key: "clinical_risk_alerts",
    name: "Clinical Risk Intelligence",
    description: "Monitors behavioral, medication, goal, and authorization data for early warning signals.",
    icon: Brain,
    category: "Clinical",
    hipaa_note: "All analysis performed on platform data — no external PHI transmission.",
    plan_required: "professional",
  },
  {
    key: "scheduling_assistant",
    name: "Intelligent Scheduling Assistant",
    description: "Suggests optimal staff-client matches, detects conflicts, and optimizes schedules.",
    icon: Calendar,
    category: "Operations",
    hipaa_note: "Scheduling data only — no clinical PHI processed.",
    plan_required: "professional",
  },
  {
    key: "turnover_prediction",
    name: "Staff Turnover Prediction",
    description: "Scores each staff member's 90-day turnover risk and suggests retention interventions.",
    icon: TrendingUp,
    category: "Workforce",
    hipaa_note: "Workforce analytics only — no clinical PHI.",
    plan_required: "enterprise",
  },
  {
    key: "billing_scrubber",
    name: "AI Billing Scrubber",
    description: "Analyzes claims before submission, flags denial risks, and learns from remittance patterns.",
    icon: DollarSign,
    category: "Billing",
    hipaa_note: "Claim data only — processes billing codes, not clinical narrative.",
    plan_required: "professional",
  },
  {
    key: "automation_builder",
    name: "No-Code Automation Builder",
    description: "Allows admins to build custom trigger-condition-action workflows without technical expertise.",
    icon: Zap,
    category: "Operations",
    hipaa_note: "Workflow engine only — individual action privacy depends on action type.",
    plan_required: "professional",
  },
  {
    key: "predictive_analytics",
    name: "Predictive Analytics & Revenue Forecasting",
    description: "Forecasts revenue, census, and client outcome risk using historical platform data.",
    icon: TrendingUp,
    category: "Leadership",
    hipaa_note: "Aggregate analytics only — no individual PHI in predictive outputs.",
    plan_required: "enterprise",
  },
];

const PLAN_COLORS = {
  starter: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  professional: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  enterprise: "bg-violet-500/15 text-violet-400 border-violet-500/30",
};

const CATEGORY_COLORS = {
  Documentation: "bg-emerald-500/10 text-emerald-400",
  Clinical: "bg-red-500/10 text-red-400",
  Operations: "bg-blue-500/10 text-blue-400",
  Workforce: "bg-amber-500/10 text-amber-400",
  Billing: "bg-green-500/10 text-green-400",
  Leadership: "bg-violet-500/10 text-violet-400",
};

export default function AIFeatureManager({ isSuperAdmin = false, agencyId = null }) {
  const queryClient = useQueryClient();

  const { data: configs = [] } = useQuery({
    queryKey: ["aiFeatureConfigs", agencyId],
    queryFn: () => agencyId
      ? base44.entities.AIFeatureConfig.filter({ agency_id: agencyId })
      : base44.entities.AIFeatureConfig.filter({ agency_id: null }),
  });

  const upsertConfig = useMutation({
    mutationFn: async ({ feature_key, is_enabled }) => {
      const existing = configs.find(c => c.feature_key === feature_key);
      if (existing) {
        return base44.entities.AIFeatureConfig.update(existing.id, { is_enabled });
      } else {
        const feat = AI_FEATURES.find(f => f.key === feature_key);
        return base44.entities.AIFeatureConfig.create({
          feature_key,
          feature_name: feat?.name || feature_key,
          is_enabled,
          agency_id: agencyId,
          override_level: agencyId ? "agency" : "platform",
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["aiFeatureConfigs", agencyId] }),
  });

  const isEnabled = (key) => {
    const cfg = configs.find(c => c.feature_key === key);
    return cfg ? cfg.is_enabled : true; // default enabled
  };

  const categories = [...new Set(AI_FEATURES.map(f => f.category))];

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-lg font-bold">{isSuperAdmin ? "Platform AI Feature Management" : "AI Feature Settings"}</h2>
        <AIBadge label="Phase 7" />
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        {isSuperAdmin
          ? "Enable or disable AI features platform-wide or per agency tier. All changes take effect immediately."
          : "Control which AI-powered features are active for your agency. You can opt out of any feature at any time."}
      </p>

      <div className="mb-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
        <Shield className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          <strong className="text-blue-400">HIPAA Compliance:</strong> All AI features are designed to comply with HIPAA. No PHI is transmitted to external AI services without a signed Business Associate Agreement. All AI processing is performed on anonymized or non-PHI data where possible.
        </p>
      </div>

      {categories.map(category => (
        <div key={category} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${CATEGORY_COLORS[category] || "bg-muted text-muted-foreground"}`}>{category}</span>
          </div>
          <div className="space-y-2">
            {AI_FEATURES.filter(f => f.category === category).map(feature => {
              const enabled = isEnabled(feature.key);
              const Icon = feature.icon;
              return (
                <div key={feature.key} className={`p-4 rounded-xl border transition-colors ${enabled ? "border-border bg-card/50" : "border-border bg-muted/30 opacity-60"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${enabled ? "bg-violet-500/20" : "bg-muted"}`}>
                        <Icon className={`w-4 h-4 ${enabled ? "text-violet-400" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="text-sm font-semibold">{feature.name}</p>
                          <Badge variant="outline" className={`text-xs ${PLAN_COLORS[feature.plan_required]}`}>{feature.plan_required}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                        <p className="text-xs text-blue-400/70 mt-1 flex items-center gap-1">
                          <Shield className="w-3 h-3" />{feature.hipaa_note}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(v) => upsertConfig.mutate({ feature_key: feature.key, is_enabled: v })}
                      className="flex-shrink-0 mt-0.5"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}