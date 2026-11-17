import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Plus, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import SupportStrategyCard from "./SupportStrategyCard";
import SupportStrategyDialog from "./SupportStrategyDialog";
import SupportStrategyExport from "./SupportStrategyExport";
import {
  coverageSummary,
  isSupportStrategy,
  strategyDaysLeft,
  strategyDueDate,
} from "@/lib/supportStrategies";

export default function PCSPStrategySection({ client, plan, codes, strategies = [], canEdit }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const codesById = useMemo(
    () => Object.fromEntries(codes.map((c) => [c.id, c])),
    [codes]
  );

  const pcspStrategies = strategies.filter(isSupportStrategy);
  const coverage = coverageSummary(plan, codesById, pcspStrategies);
  const due = strategyDueDate(plan);
  const days = strategyDaysLeft(plan);
  const pct = coverage.total ? Math.round((coverage.coveredCount / coverage.total) * 100) : 0;

  const dueTone =
    typeof days !== "number"
      ? "text-muted-foreground"
      : days < 0
      ? "text-red-600"
      : days <= 7
      ? "text-amber-600"
      : "text-muted-foreground";
  const dueText =
    typeof days !== "number"
      ? ""
      : days < 0
      ? `${Math.abs(days)} days overdue`
      : days === 0
      ? "Due today"
      : `${days} days left`;

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (strategy) => {
    setEditing(strategy);
    setDialogOpen(true);
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Support Strategies</p>
          <span className="text-xs text-muted-foreground">
            {coverage.coveredCount} of {coverage.total} services covered
          </span>
        </div>
        <div className="flex items-center gap-1">
          {canEdit && (plan.pcsp_goals || []).length > 0 && (
            <Button size="sm" variant="secondary" onClick={openNew}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Strategy
            </Button>
          )}
          {canEdit && (
            <SupportStrategyExport plan={plan} strategies={pcspStrategies} codesById={codesById} />
          )}
        </div>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", coverage.gaps.length === 0 && coverage.total > 0 ? "bg-emerald-500" : "bg-amber-500")}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {dueText && (
          <span className={cn("text-xs font-medium", dueTone)}>
            Due {due} · {dueText}
          </span>
        )}
        {coverage.gaps.map((gap) => (
          <span
            key={gap}
            className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700"
          >
            <AlertTriangle className="h-3 w-3" />
            {gap}
          </span>
        ))}
        {coverage.total > 0 && coverage.gaps.length === 0 && (
          <span className="text-[11px] font-medium text-emerald-700">All required services covered</span>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {pcspStrategies.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">
            No Support Strategies written yet. Write one for each goal the agency is responsible for
            within 30 days of activation.
          </p>
        ) : (
          pcspStrategies.map((strategy) => (
            <SupportStrategyCard
              key={strategy.id}
              strategy={strategy}
              plan={plan}
              codesById={codesById}
              canEdit={canEdit}
              onEdit={openEdit}
            />
          ))
        )}
      </div>

      <SupportStrategyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        client={client}
        plan={plan}
        codes={codes}
        strategy={editing}
      />
    </div>
  );
}