import React from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const FLAGS = [
  { key: "fall_or_injury", detailKey: "fall_detail", label: "Fall, Injury, or Incident", color: "border-red-300 bg-red-50", badgeColor: "bg-red-100 text-red-700", icon: "🩹", placeholder: "Describe what happened, location, body part affected..." },
  { key: "medication_refusal", detailKey: "medication_refusal_detail", label: "Medication Refusal", color: "border-orange-300 bg-orange-50", badgeColor: "bg-orange-100 text-orange-700", icon: "💊", placeholder: "Which medication, what was person's behavior..." },
  { key: "behavioral_escalation", detailKey: "behavioral_detail", label: "Behavioral Escalation", color: "border-amber-300 bg-amber-50", badgeColor: "bg-amber-100 text-amber-700", icon: "⚠️", placeholder: "Describe behavior, antecedent, response used..." },
  { key: "health_concern", detailKey: "health_detail", label: "Health Concern or Complaint", color: "border-blue-300 bg-blue-50", badgeColor: "bg-blue-100 text-blue-700", icon: "🩺", placeholder: "What did you observe or hear from the person..." },
  { key: "restrictive_procedure", detailKey: "restrictive_detail", label: "Restrictive Procedure Used", color: "border-red-400 bg-red-50", badgeColor: "bg-red-200 text-red-800", icon: "🚨", placeholder: "Describe procedure used, duration, supervisor notified..." },
];

export default function HealthSafetyFlags({ flags = {}, onChange }) {
  const set = (key, val) => onChange({ ...flags, [key]: val });
  const hasAny = FLAGS.some(f => flags[f.key]);

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert className="w-4 h-4 text-red-500" />
        <span className="text-sm font-bold text-foreground">Health & Safety Check</span>
        <span className="text-xs text-muted-foreground">— tap anything that happened today</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        {FLAGS.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => set(f.key, !flags[f.key])}
            className={cn(
              "flex items-center gap-2 text-left px-3 py-2.5 rounded-xl border-2 transition-all text-sm font-medium",
              flags[f.key] ? `${f.color} border-current` : "border-border bg-white hover:bg-muted/50 text-muted-foreground"
            )}
          >
            <span>{f.icon}</span>
            <span className={flags[f.key] ? "" : "text-muted-foreground"}>{f.label}</span>
            {flags[f.key] && <AlertTriangle className="w-3.5 h-3.5 ml-auto text-red-500 shrink-0" />}
          </button>
        ))}
      </div>

      {FLAGS.filter(f => flags[f.key]).map(f => (
        <div key={f.detailKey} className={`rounded-xl border-2 px-3 py-2.5 mb-2 ${f.color}`}>
          <p className="text-xs font-semibold mb-1.5">{f.icon} {f.label} — describe what happened:</p>
          <Input
            value={flags[f.detailKey] || ""}
            onChange={e => set(f.detailKey, e.target.value)}
            placeholder={f.placeholder}
            className="bg-white/80 border-0 text-sm"
          />
          {f.key === "restrictive_procedure" && (
            <p className="text-xs text-red-700 mt-1.5 font-medium">⚠ Supervisor has been notified — complete incident report after this session.</p>
          )}
        </div>
      ))}

      {!hasAny && (
        <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          ✓ No health or safety concerns to report — great session so far!
        </p>
      )}
    </div>
  );
}