/**
 * Plan acknowledgment — a staff member records that they read the exact
 * version of a client's PCSP before charting for that client.
 */

export const planVersion = (plan) => Number(plan?.version || 1);

export const planVersionLabel = (plan) => {
  if (!plan) return "";
  const type = plan.plan_type || "PCSP";
  return `${type} · v${planVersion(plan)}`;
};

/** True when this staff member has not yet acknowledged this exact version. */
export function needsAcknowledgment(acks = [], plan, staffId) {
  if (!plan?.id || !staffId) return false;
  return !acks.some(
    (a) =>
      a.plan_id === plan.id &&
      Number(a.plan_version || 1) === planVersion(plan) &&
      a.staff_id === staffId
  );
}

/** Latest acknowledgment by one staff member for this plan version. */
export function acknowledgmentFor(acks = [], plan, staffId) {
  if (!plan?.id || !staffId) return null;
  return (
    acks
      .filter(
        (a) =>
          a.plan_id === plan.id &&
          Number(a.plan_version || 1) === planVersion(plan) &&
          a.staff_id === staffId
      )
      .sort((a, b) => String(b.acknowledged_at || "").localeCompare(String(a.acknowledged_at || "")))[0] || null
  );
}

export async function recordAcknowledgment(base44, { plan, clientId, clientName, staff }) {
  return base44.entities.PlanAcknowledgment.create({
    client_id: clientId || plan.client_id,
    client_name: clientName || plan.client_name || "",
    plan_id: plan.id,
    plan_version: planVersion(plan),
    plan_label: planVersionLabel(plan),
    staff_id: staff?.id || "",
    staff_name: staff ? `${staff.first_name} ${staff.last_name}` : "",
    staff_email: staff?.email || "",
    acknowledged_at: new Date().toISOString(),
  });
}