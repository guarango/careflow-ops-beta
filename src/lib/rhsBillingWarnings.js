/** RHS billing validations — DHHS91172 SOW §21.4 and §21.7. All findings are warnings, never blockers. */

const RHS_CODE = "RHS";
const WH_CODES = new Set(["WHX", "WRX"]);
const RESPITE_CODES = new Set(["RP2", "RP3", "RP4", "RP5", "RPS"]);

const LIVING_WITH_RELATIVE = new Set(["Immediate Relative", "Legal Guardian"]);

function codeOf(claim) {
  return (claim?.service_code || "").trim().toUpperCase();
}

function shiftHours(shift) {
  if (typeof shift.total_hours === "number") return shift.total_hours;
  if (!shift.start_time || !shift.end_time) return 0;
  const [sh, sm] = shift.start_time.split(":").map(Number);
  const [eh, em] = shift.end_time.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  const minutes = eh * 60 + em - (sh * 60 + sm);
  return minutes > 0 ? minutes / 60 : 0;
}

function approvalOnFile(client, serviceDate) {
  const approved = client?.dspd_director_approval_date;
  if (!approved) return false;
  if (!serviceDate) return true;
  return approved <= serviceDate;
}

/**
 * Warnings for one claim line.
 * ctx: { client, sameDayClaims, shifts } — sameDayClaims are the client's claims on that service date,
 * shifts are the client's shifts on that service date.
 */
export function warningsForClaim(claim, ctx = {}) {
  const { client, sameDayClaims = [], shifts = [] } = ctx;
  const code = codeOf(claim);
  const warnings = [];

  // §21.4 — a Person living with an Immediate Relative or legal guardian cannot be billed for that day.
  if (LIVING_WITH_RELATIVE.has(client?.lives_with)) {
    warnings.push({
      rule: "Lives with immediate relative or guardian",
      citation: "DHHS91172 SOW §21.4",
      description: `Person lives with an ${client.lives_with.toLowerCase()} — do not bill RHS services for this day.`,
    });
  }

  // §21.4 — TFB alongside RHS needs a recorded prior written DSPD director approval.
  const rhsSameDay = sameDayClaims.some((c) => codeOf(c) === RHS_CODE);
  if (code === "TFB" && rhsSameDay && !approvalOnFile(client, claim.service_date)) {
    warnings.push({
      rule: "TFB billed with RHS",
      citation: "DHHS91172 SOW §21.4",
      description:
        "TFB is billed alongside RHS without a recorded prior written DSPD director approval. Record the approval on the client before submitting.",
    });
  }

  // §21.7 — RHS cannot be used as respite.
  const respiteSameDay = sameDayClaims.some((c) => RESPITE_CODES.has(codeOf(c)));
  if (code === RHS_CODE && (claim.service_type === "Respite" || respiteSameDay)) {
    warnings.push({
      rule: "RHS used as respite",
      citation: "DHHS91172 SOW §21.7",
      description: respiteSameDay
        ? "Respite is billed on the same day as this RHS claim — RHS cannot be used as respite."
        : "This RHS claim is typed as Respite — RHS cannot be used as respite.",
    });
  }

  // §21.7 — WHX/WRX is reimbursed by DCFS or DJJYS, not DSPD.
  if (WH_CODES.has(code) && /DSPD/i.test(claim.payer || "")) {
    warnings.push({
      rule: "WHX/WRX billed to DSPD",
      citation: "DHHS91172 SOW §21.7",
      description: `${code} is reimbursed by DCFS or DJJYS, not DSPD. Change the payer before submitting.`,
    });
  }

  // §21.7 — WHX/WRX requires the Person in the RHS setting under Contractor supervision all 24 hours.
  if (WH_CODES.has(code)) {
    const inSetting = shifts.filter((s) => s.house_id && s.house_id === client?.house_id);
    const supervised = inSetting.reduce((sum, s) => sum + shiftHours(s), 0);
    const issues = [];
    if (inSetting.length === 0) issues.push("no shift in the RHS setting");
    if (supervised < 24) issues.push(`Contractor supervision documented for ${Math.round(supervised * 10) / 10} of 24 hours`);
    if (issues.length > 0) {
      warnings.push({
        rule: "WHX/WRX outside RHS coverage",
        citation: "DHHS91172 SOW §21.7",
        description: `${code} requires the Person in the RHS setting under Contractor supervision for the full 24 hours: ${issues.join("; ")}.`,
      });
    }
  }

  return warnings;
}

/** Warnings for every claim in a list, keyed by claim id. */
export function warningsByClaimId(claims, { clients = [], shifts = [] } = {}) {
  const clientsById = new Map(clients.map((c) => [c.id, c]));
  const claimsByDay = new Map();
  claims.forEach((claim) => {
    const key = `${claim.client_id}|${claim.service_date}`;
    if (!claimsByDay.has(key)) claimsByDay.set(key, []);
    claimsByDay.get(key).push(claim);
  });
  const shiftsByDay = new Map();
  shifts.forEach((shift) => {
    const key = `${shift.client_id}|${shift.date}`;
    if (!shiftsByDay.has(key)) shiftsByDay.set(key, []);
    shiftsByDay.get(key).push(shift);
  });

  const out = {};
  claims.forEach((claim) => {
    const key = `${claim.client_id}|${claim.service_date}`;
    out[claim.id] = warningsForClaim(claim, {
      client: clientsById.get(claim.client_id),
      sameDayClaims: (claimsByDay.get(key) || []).filter((c) => c.id !== claim.id),
      shifts: shiftsByDay.get(key) || [],
    });
  });
  return out;
}