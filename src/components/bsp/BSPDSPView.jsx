import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, Shield, Heart, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const SEVERITY_COLORS = {
  Mild: "bg-amber-100 text-amber-700 border-amber-300",
  Moderate: "bg-orange-100 text-orange-700 border-orange-300",
  Severe: "bg-red-100 text-red-700 border-red-300",
};

function DSPBehaviorCard({ behavior, index }) {
  const [open, setOpen] = useState(index === 0);

  const proactive = [];
  const a = behavior.antecedent_strategies || {};
  if (a.setting_modifications) proactive.push(["Setting changes", a.setting_modifications]);
  if (a.schedule_routine_supports) proactive.push(["Schedule & routine", a.schedule_routine_supports]);
  if (a.sensory_physiological) proactive.push(["Sensory & physical needs", a.sensory_physiological]);
  if (a.relationship_communication) proactive.push(["Relationship & communication", a.relationship_communication]);

  const triggers = a.triggers_to_avoid || [];

  return (
    <Card className={cn("overflow-hidden", open ? "border-primary/30" : "")}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{behavior.name || `Behavior ${index + 1}`}</span>
          {behavior.function && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">{behavior.function}</Badge>
          )}
        </div>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <CardContent className="p-4 space-y-4">
          {/* What it looks like */}
          {behavior.topography && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">What It Looks Like</p>
              <p className="text-sm">{behavior.topography}</p>
            </div>
          )}

          {(behavior.examples || []).filter(Boolean).length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 rounded-lg p-2.5">
                <p className="text-xs font-semibold text-emerald-700 mb-1">✓ This counts</p>
                {(behavior.examples || []).filter(Boolean).map((e, i) => (
                  <p key={i} className="text-xs text-emerald-800">• {e}</p>
                ))}
              </div>
              <div className="bg-red-50 rounded-lg p-2.5">
                <p className="text-xs font-semibold text-red-700 mb-1">✗ This does NOT count</p>
                {(behavior.non_examples || []).filter(Boolean).map((e, i) => (
                  <p key={i} className="text-xs text-red-800">• {e}</p>
                ))}
              </div>
            </div>
          )}

          {/* Proactive strategies */}
          {proactive.length > 0 && (
            <div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Proactive Strategies — Prevent It Before It Starts
              </p>
              <div className="space-y-2">
                {proactive.map(([label, desc]) => (
                  <div key={label} className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold text-emerald-800">{label}</p>
                    <p className="text-sm text-emerald-900">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Triggers to avoid */}
          {triggers.length > 0 && (
            <div>
              <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Triggers to Avoid
              </p>
              <div className="space-y-1.5">
                {triggers.map((t, i) => (
                  <div key={i} className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">
                    <p><strong className="text-red-800">Avoid:</strong> {t.trigger}</p>
                    <p className="text-red-700 mt-0.5"><strong>Instead:</strong> {t.required_staff_action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Replacement behavior */}
          {behavior.replacement_behavior?.definition && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
              <p className="text-xs font-bold text-sky-700 mb-1">What to Teach Instead</p>
              <p className="text-sm font-medium text-sky-900">{behavior.replacement_behavior.definition}</p>
              {behavior.replacement_behavior.prompt_procedure && (
                <p className="text-xs text-sky-700 mt-2"><strong>How to prompt:</strong> {behavior.replacement_behavior.prompt_procedure}</p>
              )}
              {behavior.replacement_behavior.reinforcement_procedure && (
                <p className="text-xs text-sky-700 mt-1"><strong>How to reinforce:</strong> {behavior.replacement_behavior.reinforcement_procedure}</p>
              )}
            </div>
          )}

          {/* Reactive strategies */}
          {(behavior.reactive_strategies || []).length > 0 && (
            <div>
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" /> Reactive Strategies — What to Do When It Happens
              </p>
              <div className="space-y-2">
                {(behavior.reactive_strategies || []).map((r, i) => (
                  <div key={i} className={cn("border-2 rounded-xl p-3", SEVERITY_COLORS[r.severity_tier] || "border-border")}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={cn("text-xs", SEVERITY_COLORS[r.severity_tier])} variant="outline">{r.severity_tier}</Badge>
                      {r.is_restrictive && (
                        <Badge className="text-xs bg-red-200 text-red-800" variant="outline">
                          <AlertTriangle className="w-3 h-3 mr-0.5" />Restrictive
                        </Badge>
                      )}
                    </div>
                    {(r.steps || []).filter(Boolean).length > 0 && (
                      <ol className="space-y-1 list-none">
                        {r.steps.filter(Boolean).map((s, si) => (
                          <li key={si} className="text-sm flex gap-2">
                            <span className="font-bold text-muted-foreground shrink-0">{si + 1}.</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {(r.helpful_phrases || []).filter(Boolean).length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-emerald-700">✓ Say:</p>
                        {(r.helpful_phrases || []).filter(Boolean).map((p, pi) => (
                          <p key={pi} className="text-xs text-emerald-800">"{p}"</p>
                        ))}
                      </div>
                    )}
                    {(r.phrases_to_avoid || []).filter(Boolean).length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-red-700">✗ Don't say:</p>
                        {(r.phrases_to_avoid || []).filter(Boolean).map((p, pi) => (
                          <p key={pi} className="text-xs text-red-800">"{p}"</p>
                        ))}
                      </div>
                    )}
                    {r.who_to_call && (
                      <p className="text-xs text-muted-foreground mt-2"><strong>Who to call:</strong> {r.who_to_call}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function BSPDSPView({ bsp }) {
  const behaviors = bsp.target_behaviors || [];

  return (
    <div>
      <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
        <Heart className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
        <div className="text-xs text-violet-800">
          <strong>Quick Reference for {bsp.client_name}.</strong> This is your guide for supporting behaviors.
          Tap each behavior to see what it looks like, how to prevent it, and what to do when it happens.
        </div>
      </div>

      {behaviors.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground">
          No target behaviors defined in this plan yet.
        </div>
      ) : (
        <div className="space-y-3">
          {behaviors.map((b, i) => (
            <DSPBehaviorCard key={b.id || i} behavior={b} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}