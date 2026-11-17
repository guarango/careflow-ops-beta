import { base44 } from "@/api/base44Client";
import { logAudit } from "@/lib/auditLog";
import { computeSupportStrategyDue, daysUntil } from "@/lib/pcsp";

/** Support Strategy lifecycle (DHHS91172 SOW 1.24(5)). Each ClientGoal is one strategy. */
export const STRATEGY_STATUSES = ["Draft", "Ready", "Submitted to SC", "Revised"];

export const STRATEGY_STATUS_STYLES = {
  Draft: "bg-slate-100 text-slate-700 border-slate-200",
  Ready: "bg-blue-100 text-blue-700 border-blue-200",
  "Submitted to SC": "bg-emerald-100 text-emerald-700 border-emerald-200",
  Revised: "bg-amber-100 text-amber-800 border-amber-200",
};

export const SUBMISSION_METHODS = ["UPI", "Email", "Other"];

/** A strategy counts toward coverage once it is ready to send or has been sent. */
const COVERING_STATUSES = ["Ready", "Submitted to SC", "Revised"];

export const isSupportStrategy = (goal) => Boolean(goal?.pcsp_id || goal?.pcsp_goal_id);

/** Stable key for a goal on the PCSP, so a strategy can point at it. */
export const pcspGoalKey = (goal) => goal?.goal_id || `text:${goal?.goal_text_as_written || ""}`;

export function findPcspGoal(plan, key) {
  if (!key) return null;
  return (plan?.pcsp_goals || []).find((g) => pcspGoalKey(g) === key) || null;
}

export function strategyDueDate(plan) {
  if (!plan) return "";
  return plan.support_strategy_due_date || computeSupportStrategyDue(plan.activation_date);
}

export function strategyDaysLeft(plan) {
  const due = strategyDueDate(plan);
  return due ? daysUntil(due) : null;
}

/** On time only when submitted on or before the due date. */
export function isStrategyLate(strategy, dueDate) {
  if (!strategy?.submitted_to_sc_date || !dueDate) return false;
  return strategy.submitted_to_sc_date > dueDate;
}

/**
 * Every service on the active PCSP whose ServiceCode requires a strategy must be
 * covered by at least one ClientGoal linked to that code.
 */
export function coverageSummary(plan, codesById, strategies = []) {
  const required = (plan?.services_on_plan || []).filter((svc) => {
    const code = codesById?.[svc.service_code_id];
    return code ? code.support_strategy_required !== false : true;
  });

  const coveredCodes = new Set();
  strategies.forEach((strategy) => {
    if (!COVERING_STATUSES.includes(strategy.strategy_status || "Draft")) return;
    (strategy.service_code_ids || []).forEach((id) => coveredCodes.add(id));
  });

  const covered = required.filter((svc) => coveredCodes.has(svc.service_code_id));
  const gaps = required
    .filter((svc) => !coveredCodes.has(svc.service_code_id))
    .map(
      (svc) =>
        `${svc.service_code || codesById?.[svc.service_code_id]?.code || "Service"} has no Support Strategy`
    );

  return { required, covered, gaps, coveredCount: covered.length, total: required.length };
}

/** Records the coverage result so activation leaves a trace of what was missing. */
export async function auditCoverage({ plan, strategies, codesById }) {
  if (!plan?.id) return null;
  const { gaps, coveredCount, total } = coverageSummary(plan, codesById, strategies);
  await logAudit({
    action: "Support strategy coverage checked",
    target_type: "ISPlan",
    target_id: plan.id,
    target_name: `${plan.client_name} v${plan.version || 1}`,
    details: gaps.length
      ? `Gaps: ${gaps.join("; ")}`
      : `${coveredCount} of ${total} services covered`,
  });
  return gaps;
}

async function currentActorName() {
  try {
    const me = await base44.auth.me();
    return me?.full_name || me?.email || "";
  } catch {
    return "";
  }
}

/**
 * Saves a strategy. A submitted strategy must be revised with a reason, and a
 * submission needs its date and method so lateness can be judged against the PCSP due date.
 */
export async function saveSupportStrategy({ strategy, payload, plan }) {
  const due = strategyDueDate(plan);
  const status = payload.strategy_status || "Draft";

  if (
    strategy?.strategy_status === "Submitted to SC" &&
    status === "Revised" &&
    !payload.revision_reason?.trim()
  ) {
    throw new Error("Add a reason before revising a submitted strategy.");
  }
  if (["Submitted to SC", "Revised"].includes(status)) {
    if (!payload.submitted_to_sc_date) {
      throw new Error("Enter the date the strategy was submitted to the support coordinator.");
    }
    if (!payload.submission_method) {
      throw new Error("Select how the strategy was submitted (UPI, Email, or Other).");
    }
  }

  const actor = await currentActorName();
  const data = {
    ...payload,
    submitted_by: ["Submitted to SC", "Revised"].includes(status)
      ? payload.submitted_by || actor
      : payload.submitted_by || "",
  };

  const saved = strategy
    ? await base44.entities.ClientGoal.update(strategy.id, data)
    : await base44.entities.ClientGoal.create(data);

  const label = `${data.client_name || ""} · ${data.goal_title || "Support Strategy"}`;
  const late = isStrategyLate(data, due);

  if (!strategy) {
    await logAudit({
      action: "Support strategy created",
      target_type: "ClientGoal",
      target_id: saved.id,
      target_name: label,
      details: `Status ${status} · due ${due || "—"}`,
    });
  } else {
    const previous = strategy.strategy_status || "Draft";
    if (previous !== status) {
      const action =
        status === "Submitted to SC"
          ? late
            ? "Support strategy submitted (late)"
            : "Support strategy submitted"
          : `Support strategy status: ${previous} → ${status}`;
      await logAudit({
        action,
        target_type: "ClientGoal",
        target_id: strategy.id,
        target_name: label,
        field: "Strategy status",
        old_value: previous,
        new_value: status,
        details:
          status === "Submitted to SC"
            ? `Submitted ${data.submitted_to_sc_date} via ${data.submission_method} · due ${due}${late ? " · LATE" : ""}`
            : data.revision_reason
            ? `Reason: ${data.revision_reason}`
            : "",
      });
    } else if (previous === "Submitted to SC" || previous === "Revised") {
      await logAudit({
        action: "Support strategy edited after submission",
        target_type: "ClientGoal",
        target_id: strategy.id,
        target_name: label,
        details: data.revision_reason ? `Reason: ${data.revision_reason}` : `Status ${status}`,
      });
    }
  }

  return saved;
}