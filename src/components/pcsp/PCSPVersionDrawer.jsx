import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import PrivateFileLink from "@/components/shared/PrivateFileLink";
import PCSPGoalList from "./PCSPGoalList";
import { PCSP_STATUS_STYLES } from "@/lib/pcsp";

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

export default function PCSPVersionDrawer({ open, onOpenChange, plans = [], codes = [] }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>PCSP version history</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-2">
          {plans.length === 0 && (
            <p className="text-sm text-muted-foreground">No PCSP versions on file.</p>
          )}
          {plans.map((plan) => {
            const isOpen = expanded === plan.id;
            const codesOnPlan = (plan.services_on_plan || [])
              .map((s) => s.service_code)
              .filter(Boolean)
              .join(", ");
            return (
              <div key={plan.id} className="rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : plan.id)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
                >
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="text-sm font-semibold">v{plan.version || 1}</span>
                  <Badge variant="outline" className={cn("text-[10px]", PCSP_STATUS_STYLES[plan.status] || "")}>
                    {plan.status}
                  </Badge>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {plan.activation_date || plan.plan_year_start || "—"}
                  </span>
                </button>

                {isOpen && (
                  <div className="space-y-4 border-t border-border px-3 py-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Plan year" value={plan.plan_year_start && plan.plan_year_end ? `${plan.plan_year_start} – ${plan.plan_year_end}` : ""} />
                      <Field label="Activation" value={plan.activation_date} />
                      <Field label="Received" value={plan.received_date} />
                      <Field label="Strategies due" value={plan.support_strategy_due_date} />
                      <Field label="Renewal due" value={plan.renewal_meeting_due || plan.plan_year_end} />
                      <Field
                        label="Support coordinator"
                        value={[plan.support_coordinator_name, plan.support_coordinator_agency].filter(Boolean).join(" · ")}
                      />
                      <Field label="Services" value={codesOnPlan} />
                    </div>
                    {plan.important_to && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Important to</p>
                        <p className="whitespace-pre-wrap text-sm">{plan.important_to}</p>
                      </div>
                    )}
                    {plan.important_for && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Important for</p>
                        <p className="whitespace-pre-wrap text-sm">{plan.important_for}</p>
                      </div>
                    )}
                    <PCSPGoalList goals={plan.pcsp_goals || []} codes={codes} />
                    {plan.source_document && (
                      <PrivateFileLink fileUri={plan.source_document} label="View PCSP document" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}