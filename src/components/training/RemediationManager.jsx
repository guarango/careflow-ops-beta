import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function RemediationManager({ remediations, staff, onUpdate }) {
  if (remediations.length === 0) return (
    <p className="text-sm text-muted-foreground text-center py-12 border-dashed border-2 border-border rounded-xl">No active remediation plans.</p>
  );

  const overdue = remediations.filter(r => r.status === "Overdue");
  const hrFlagged = remediations.filter(r => r.hr_flag);
  const active = remediations.filter(r => r.status === "Active");

  return (
    <div className="space-y-5">
      {hrFlagged.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl px-4 py-3">
          <p className="text-sm font-bold text-red-800 flex items-center gap-1.5 mb-2"><ShieldAlert className="w-4 h-4" />{hrFlagged.length} HR-Flagged Remediation{hrFlagged.length !== 1 ? "s" : ""} — Formal Performance Review Required</p>
          {hrFlagged.map((r, i) => (
            <p key={i} className="text-xs text-red-700">• {r.staff_name} — {r.training_title} (cycle {r.cycle_number}) — Supervisor: {r.supervisor_name || "Unassigned"}</p>
          ))}
        </div>
      )}

      {overdue.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-2">
          <p className="text-sm font-semibold text-amber-800 flex items-center gap-1.5 mb-1"><AlertTriangle className="w-4 h-4" />{overdue.length} Overdue Remediation{overdue.length !== 1 ? "s" : ""}</p>
          {overdue.map((r, i) => <p key={i} className="text-xs text-amber-700">• {r.staff_name} — {r.training_title} — Due: {r.due_date}</p>)}
        </div>
      )}

      <div className="space-y-3">
        {[...active, ...overdue].map(plan => (
          <div key={plan.id} className={cn("border-2 rounded-xl p-4", plan.hr_flag ? "border-red-300 bg-red-50" : plan.status === "Overdue" ? "border-amber-300 bg-amber-50" : "border-border bg-white")}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="font-semibold text-sm">{plan.staff_name}</p>
                <p className="text-xs text-muted-foreground">{plan.training_title}</p>
                {plan.gap_description && <p className="text-xs mt-1">{plan.gap_description}</p>}
                {plan.why_it_matters && <p className="text-xs italic text-muted-foreground mt-0.5">{plan.why_it_matters}</p>}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant="outline" className={cn("text-xs", plan.status === "Overdue" ? "border-amber-400 text-amber-700" : "border-border")}>Cycle {plan.cycle_number}</Badge>
                {plan.hr_flag && <Badge className="text-xs bg-red-100 text-red-800 border-red-300"><ShieldAlert className="w-3 h-3 mr-0.5" />HR Flag</Badge>}
                {plan.scheduling_restriction && <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-300">Scheduling Hold</Badge>}
              </div>
            </div>

            {(plan.steps || []).length > 0 && (
              <div className="space-y-1.5 mb-3">
                {plan.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={step.completed} onChange={e => {
                      const steps = [...plan.steps]; steps[i] = { ...steps[i], completed: e.target.checked };
                      onUpdate(plan.id, { ...plan, steps });
                    }} />
                    <span className={step.completed ? "line-through text-muted-foreground" : ""}>{step.step}</span>
                    {step.due_date && <span className="text-muted-foreground ml-auto">{step.due_date}</span>}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Supervisor: {plan.supervisor_name || "Unassigned"} {plan.due_date && `· Due: ${plan.due_date}`}</p>
              <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={() => onUpdate(plan.id, { ...plan, status: "Completed" })}>
                <CheckCircle2 className="w-3 h-3" />Complete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}