import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STRATEGY_STATUS_STYLES,
  findPcspGoal,
  isStrategyLate,
  strategyDaysLeft,
  strategyDueDate,
} from "@/lib/supportStrategies";

export default function SupportStrategyCard({ strategy, plan, codesById, canEdit, onEdit }) {
  const pcspGoal = findPcspGoal(plan, strategy.pcsp_goal_id);
  const due = strategyDueDate(plan);
  const days = strategyDaysLeft(plan);
  const late = isStrategyLate(strategy, due);
  const submitted = Boolean(strategy.submitted_to_sc_date);

  const tone = submitted
    ? late
      ? "text-red-600"
      : "text-emerald-700"
    : typeof days === "number"
    ? days < 0
      ? "text-red-600"
      : days <= 7
      ? "text-amber-600"
      : "text-muted-foreground"
    : "text-muted-foreground";

  const countdown = submitted
    ? `Submitted ${strategy.submitted_to_sc_date}${strategy.submission_method ? ` · ${strategy.submission_method}` : ""}${late ? " · LATE" : " · on time"}`
    : typeof days === "number"
    ? days < 0
      ? `${Math.abs(days)} days overdue`
      : days === 0
      ? "Due today"
      : `${days} days left`
    : "";

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">
          {pcspGoal?.goal_text_as_written || strategy.goal_title}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <Badge
            variant="outline"
            className={cn("text-[10px]", STRATEGY_STATUS_STYLES[strategy.strategy_status || "Draft"] || "")}
          >
            {strategy.strategy_status || "Draft"}
          </Badge>
          {canEdit && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(strategy)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {strategy.persons_own_words && (
        <p className="mt-1 text-xs italic text-violet-700">“{strategy.persons_own_words}”</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1">
        {(strategy.service_code_ids || []).map((id) => (
          <Badge key={id} variant="outline" className="border-sky-200 bg-sky-50 text-[10px] text-sky-700">
            {codesById?.[id]?.code || "—"}
          </Badge>
        ))}
        {strategy.goal_author && (
          <span className="text-[10px] text-muted-foreground">by {strategy.goal_author}</span>
        )}
      </div>

      {countdown && <p className={cn("mt-2 text-xs font-medium", tone)}>{countdown}</p>}
      {strategy.strategy_status === "Revised" && strategy.revision_reason && (
        <p className="mt-1 text-[11px] text-amber-800">Revised: {strategy.revision_reason}</p>
      )}
    </div>
  );
}