/** Supported Living caregiver validations — DHHS91172 SOW Article 35 (SLN, CMP, CMS). All findings are warnings. */

export const SL_CODES = ["SLN", "CMP", "CMS"];
export const FAMILY_CARE_CODES = ["CMP", "CMS"];
export const CAREGIVER_RELATIONSHIPS = [
  "Parent",
  "Step-parent",
  "Legal Guardian",
  "Spouse",
  "Not a family member",
];

const SL_SET = new Set(SL_CODES);
const FAMILY_CODES = new Set(FAMILY_CARE_CODES);
const RESPITE_CODES = new Set(["RP2", "RP3", "RP4", "RP5", "RPS"]);
const TRAINING_START_DATE = "2026-07-01";
const DAILY_CAP_MINUTES = 8 * 60;
const WEEKLY_CAP_MINUTES = 40 * 60;
const RESPITE_DAY_CAP_MINUTES = 4 * 60;

export function expectedCodeForRelationship(relationship) {
  if (relationship === "Spouse") return "CMS";
  if (["Parent", "Step-parent", "Legal Guardian"].includes(relationship)) return "CMP";
  if (relationship === "Not a family member") return "SLN";
  return null;
}

function codeOf(note) {
  return String(note?.service_code || "").trim().toUpperCase();
}

function noteMinutes(note) {
  if (!note?.date || !note.start_time || !note.end_time) return 0;
  const [sh, sm] = String(note.start_time).split(":").map(Number);
  const [eh, em] = String(note.end_time).split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (note.end_date && note.end_date !== note.date) minutes += 24 * 60;
  else if (minutes < 0) minutes += 24 * 60;
  return Math.max(0, minutes);
}

function dateOnly(value) {
  return String(value || "").slice(0, 10);
}

/** Sunday-to-Saturday week containing the given date. */
export function weekRange(dateISO) {
  if (!dateISO) return null;
  const d = new Date(`${dateOnly(dateISO)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: dateOnly(start.toISOString()), end: dateOnly(end.toISOString()) };
}

function daysApart(a, b) {
  if (!a || !b) return null;
  const ms = new Date(`${dateOnly(a)}T00:00:00`) - new Date(`${dateOnly(b)}T00:00:00`);
  return Math.round(ms / 86400000);
}

/**
 * ctx: { client, siblingNotes, staffTraining }
 * siblingNotes are the Person's other notes; staffTraining are the staff member's TrainingRecord rows.
 */
export function supportedLivingWarnings({ note, client, siblingNotes = [], staffTraining = [] } = {}) {
  const code = codeOf(note);
  if (!SL_SET.has(code)) return [];

  const warnings = [];
  const others = siblingNotes.filter((n) => n && n.id !== note?.id && n.status !== "Cancelled");
  const familyCaregiver = FAMILY_CODES.has(code);
  const relationship = note?.caregiver_relationship;

  // §35.6 — SLN for non-family staff, CMP for parent/step-parent/guardian, CMS for a spouse.
  const expected = expectedCodeForRelationship(relationship);
  if (!relationship) {
    warnings.push({
      rule: "Caregiver relationship not recorded",
      citation: "DHHS91172 SOW §35.6",
      description:
        "Record how the staff member is related to the Person. SLN is for staff who are not family, CMP for a parent, step-parent or legal guardian, CMS for a spouse.",
    });
  } else if (expected && expected !== code) {
    warnings.push({
      rule: "Service code does not match the relationship",
      citation: "DHHS91172 SOW §35.6",
      description: `${relationship} must be billed as ${expected}, not ${code}.`,
    });
  }

  // §35.4(4) — CMP and CMS are capped at 8 hours a day and 40 hours a week (Sunday to Saturday).
  if (familyCaregiver) {
    const sameDay = others.filter((n) => codeOf(n) === code && n.date === note?.date);
    const dayMinutes = noteMinutes(note) + sameDay.reduce((sum, n) => sum + noteMinutes(n), 0);
    if (dayMinutes > DAILY_CAP_MINUTES) {
      warnings.push({
        rule: "Over the 8-hour day cap",
        citation: "DHHS91172 SOW §35.4(4)",
        description: `${code} is capped at 8 hours a day — this day documents ${(dayMinutes / 60).toFixed(1)} hours.`,
      });
    }
    const week = weekRange(note?.date);
    if (week) {
      const weekNotes = others.filter(
        (n) => codeOf(n) === code && n.date >= week.start && n.date <= week.end
      );
      const weekMinutes = noteMinutes(note) + weekNotes.reduce((sum, n) => sum + noteMinutes(n), 0);
      if (weekMinutes > WEEKLY_CAP_MINUTES) {
        warnings.push({
          rule: "Over the 40-hour week cap",
          citation: "DHHS91172 SOW §35.4(4)",
          description: `${code} is capped at 40 hours a week (Sunday to Saturday) — this week documents ${(weekMinutes / 60).toFixed(1)} hours.`,
        });
      }
    }
  }

  // §35.4(5) — documented need beyond what a family member would typically do.
  if (familyCaregiver && !String(note?.documented_need || "").trim()) {
    warnings.push({
      rule: "Documented need missing",
      citation: "DHHS91172 SOW §35.4(5)",
      description:
        "Document the need that exceeds what a parent, step-parent, guardian or spouse would typically do for a person without a disability of the same age.",
    });
  }

  // §35.4 — asleep time and DCFS clients are not billable.
  if (Number(note?.asleep_minutes) > 0) {
    warnings.push({
      rule: "Time asleep is not billable",
      citation: "DHHS91172 SOW §35.4",
      description: `${note.asleep_minutes} minutes are recorded as asleep — bill only the awake time.`,
    });
  }
  if (client?.dcfs_client) {
    warnings.push({
      rule: "DCFS client — not billable",
      citation: "DHHS91172 SOW §35.4",
      description: "This Person is a DCFS client. Supported Living services are not billable for DCFS clients.",
    });
  }

  // §35.4(3) — 4-hour cap when overnight respite falls in the same 24 hours.
  const respiteNearby = others.filter((n) => {
    if (!RESPITE_CODES.has(codeOf(n))) return false;
    const gap = daysApart(n.date, note?.date);
    return gap !== null && Math.abs(gap) <= 1;
  });
  if (respiteNearby.length > 0) {
    if (noteMinutes(note) > RESPITE_DAY_CAP_MINUTES) {
      warnings.push({
        rule: "Over the 4-hour respite-day cap",
        citation: "DHHS91172 SOW §35.4(3)",
        description: `Overnight respite is documented within the same 24 hours, so Supported Living is capped at 4 hours — this note documents ${(noteMinutes(note) / 60).toFixed(1)} hours.`,
      });
    }
    if (!String(note?.documented_need || "").trim()) {
      warnings.push({
        rule: "Need for support during respite not documented",
        citation: "DHHS91172 SOW §35.4(3)",
        description: "Document why the Person needed Supported Living support while overnight respite was provided.",
      });
    }
  }

  // §35.5 — CMP and CMS staff need the DSPD "New Caregiver Compensation" training at 80% or above (from 2026-07-01).
  if (familyCaregiver && dateOnly(note?.date) >= TRAINING_START_DATE) {
    const trained = staffTraining.some(
      (t) =>
        /new caregiver compensation/i.test(t?.training_title || "") &&
        (t.status === "Completed" || t.passed === true) &&
        Number(t.score) >= 80
    );
    if (!trained) {
      warnings.push({
        rule: "New Caregiver Compensation training missing",
        citation: "DHHS91172 SOW §35.5",
        description:
          "Staff providing CMP or CMS must complete the DSPD New Caregiver Compensation training with a score of 80% or higher.",
      });
    }
  }

  return warnings;
}