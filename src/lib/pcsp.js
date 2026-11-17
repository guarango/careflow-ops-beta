import { addDays, addMonths, differenceInCalendarDays, format, parseISO, subDays } from "date-fns";
import { base44 } from "@/api/base44Client";
import { logAudit } from "@/lib/auditLog";
import { todayISO } from "@/lib/dateUtils";

/** PCSP lifecycle: a new activation supersedes the prior one; nothing is overwritten once active. */
export const PCSP_STATUS_STYLES = {
  Draft: "bg-slate-100 text-slate-700 border-slate-200",
  Active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Superseded: "bg-amber-100 text-amber-800 border-amber-200",
  Closed: "bg-slate-100 text-slate-500 border-slate-200",
};

export const FIELD_LABELS = {
  plan_year_start: "Plan year start",
  plan_year_end: "Plan year end",
  activation_date: "Activation date",
  received_date: "Received date",
  status: "Status",
  support_coordinator_name: "Support coordinator",
  support_coordinator_agency: "Support coordinator agency",
  support_coordinator_email: "Support coordinator email",
  support_coordinator_phone: "Support coordinator phone",
  important_to: "Important to",
  important_for: "Important for",
  rights_modifications_present: "Rights modifications",
  source_document: "PCSP document",
  services_on_plan: "Services on plan",
  pcsp_goals: "PCSP goals",
};

/** Plan year end defaults to start + 12 months - 1 day. */
export function computePlanYearEnd(startISO) {
  if (!startISO) return "";
  return format(subDays(addMonths(parseISO(startISO), 12), 1), "yyyy-MM-dd");
}

/** Support Strategies are due 30 calendar days after activation (SOW 1.24(5)). */
export function computeSupportStrategyDue(activationISO) {
  if (!activationISO) return "";
  return format(addDays(parseISO(activationISO), 30), "yyyy-MM-dd");
}

/** Whole days from today to a YYYY-MM-DD date (negative = overdue). */
export function daysUntil(dateISO) {
  if (!dateISO) return null;
  try {
    return differenceInCalendarDays(parseISO(dateISO), parseISO(todayISO()));
  } catch {
    return null;
  }
}

/** Activation before the received date is back-dating and needs a manager's reason. */
export function isBackdated(activationISO, receivedISO) {
  return !!activationISO && !!receivedISO && activationISO < receivedISO;
}

export function nextVersionNumber(plans = []) {
  return Math.max(0, ...plans.map((p) => Number(p.version) || 1)) + 1;
}

const toText = (v) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

/** Built-in fields are never written back; they belong to the record, not the payload. */
function cleanPayload(payload) {
  const { id, created_by_id, created_by, created_date, updated_date, ...rest } = payload;
  return rest;
}

function changedFields(plan, payload) {
  return Object.keys(FIELD_LABELS).filter(
    (key) => key in payload && toText(payload[key]) !== toText(plan[key])
  );
}

async function planVersions(clientId) {
  if (!clientId) return [];
  return await base44.entities.ISPlan.filter({ client_id: clientId });
}

/**
 * Saves a PCSP. A draft is edited in place; an Active PCSP is never overwritten —
 * saving it creates the next version as a new record so what was in effect on each
 * date of service stays intact.
 */
export async function savePcsp({ plan, payload, reason }) {
  payload = cleanPayload(payload);
  const versions = await planVersions(payload.client_id || plan?.client_id);

  if (!plan) {
    const created = await base44.entities.ISPlan.create({
      ...payload,
      status: "Draft",
      version: nextVersionNumber(versions),
      version_history: [],
    });
    await logAudit({
      action: "PCSP created",
      target_type: "ISPlan",
      target_id: created.id,
      target_name: `${created.client_name} v${created.version}`,
      details: reason ? `Reason: ${reason}` : "PCSP received from support coordinator",
    });
    return created;
  }

  const changed = changedFields(plan, payload);

  if (plan.status === "Active") {
    const { id, created_by_id, created_date, updated_date, ...rest } = plan;
    const version = nextVersionNumber(versions);
    const created = await base44.entities.ISPlan.create({
      ...rest,
      ...payload,
      status: "Draft",
      version,
      superseded_at: null,
      superseded_by_id: null,
      version_history: [
        ...(plan.version_history || []),
        {
          version: plan.version || 1,
          saved_at: new Date().toISOString(),
          saved_by: "PCSP revision",
          summary_of_changes: `Revised into v${version}`,
          is_amendment: false,
        },
      ],
    });
    await logAudit({
      action: "PCSP version created",
      target_type: "ISPlan",
      target_id: created.id,
      target_name: `${created.client_name} v${version}`,
      details: `New version from active v${plan.version || 1}${reason ? ` · Reason: ${reason}` : ""}`,
    });
    for (const field of changed) {
      await logAudit({
        action: "PCSP field changed",
        target_type: "ISPlan",
        target_id: created.id,
        target_name: `${created.client_name} v${version}`,
        field: FIELD_LABELS[field],
        old_value: plan[field],
        new_value: payload[field],
        details: reason ? `Reason: ${reason}` : "",
      });
    }
    return created;
  }

  const updated = await base44.entities.ISPlan.update(plan.id, payload);
  for (const field of changed) {
    await logAudit({
      action: "PCSP field changed",
      target_type: "ISPlan",
      target_id: plan.id,
      target_name: `${plan.client_name} v${plan.version || 1}`,
      field: FIELD_LABELS[field],
      old_value: plan[field],
      new_value: payload[field],
      details: reason ? `Reason: ${reason}` : "",
    });
  }
  return updated;
}

/** Activates a PCSP and supersedes any other active PCSP for the same person. */
export async function activatePcsp(plan) {
  if (!plan?.activation_date) {
    throw new Error("Enter the activation date before activating this PCSP.");
  }
  const now = new Date().toISOString();
  const active = await base44.entities.ISPlan.filter({
    client_id: plan.client_id,
    status: "Active",
  });
  for (const other of active) {
    if (other.id === plan.id) continue;
    await base44.entities.ISPlan.update(other.id, {
      status: "Superseded",
      superseded_at: now,
      superseded_by_id: plan.id,
    });
    await logAudit({
      action: "PCSP superseded",
      target_type: "ISPlan",
      target_id: other.id,
      target_name: `${other.client_name} v${other.version || 1}`,
      details: `Replaced by v${plan.version || 1}`,
    });
  }

  const updated = await base44.entities.ISPlan.update(plan.id, {
    status: "Active",
    support_strategy_due_date: computeSupportStrategyDue(plan.activation_date),
    renewal_meeting_due: plan.plan_year_end || computePlanYearEnd(plan.plan_year_start),
  });
  await logAudit({
    action: "PCSP activated",
    target_type: "ISPlan",
    target_id: plan.id,
    target_name: `${plan.client_name} v${plan.version || 1}`,
    field: "Activation date",
    new_value: plan.activation_date,
    details: `Support Strategies due ${computeSupportStrategyDue(plan.activation_date)}`,
  });
  return updated;
}