// Rights modification rules — 42 CFR 441.301(c)(4)(vi)(F) and DHHS91172 SOW 1.20–1.21.
// The eight documented elements are the only path from a draft to an active modification.

export const RIGHT_OPTIONS = [
  "Access to food",
  "Visitors",
  "Privacy",
  "Schedule",
  "Possessions",
  "Locks",
  "Other",
];

export const STATUS_OPTIONS = ["Draft", "Approved", "Active", "Under review", "Ended"];

export const STATUS_STYLES = {
  Draft: "bg-muted text-muted-foreground border-border",
  Approved: "bg-primary/10 text-primary border-primary/20",
  Active: "bg-amber-50 text-amber-800 border-amber-300",
  "Under review": "bg-chart-4/15 text-chart-4 border-chart-4/30",
  Ended: "bg-muted text-muted-foreground border-border",
};

// Each element: field, short label and the regulation's own wording.
export const ELEMENTS = [
  { field: "assessed_need", n: 1, label: "Specific assessed need" },
  { field: "positive_interventions", n: 2, label: "Positive interventions and supports tried first" },
  { field: "less_intrusive_methods", n: 3, label: "Less intrusive methods tried" },
  { field: "condition_description", n: 4, label: "Condition (proportionate to the need)" },
  { field: "data_collection_review", n: 5, label: "Data collection and review of effectiveness" },
  { field: "review_time_limits", n: 6, label: "Time limits for periodic review" },
  { field: "informed_consent", n: 7, label: "Person's informed consent" },
  { field: "no_harm_assurance", n: 8, label: "Assurance it causes no harm" },
];

export function todayISO() {
  return new Date().toLocaleDateString("en-CA");
}

export function addDaysISO(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}

export function nextReviewDate(fromISO, intervalDays) {
  const base = fromISO || todayISO();
  return addDaysISO(base, intervalDays || 0);
}

export function isApproved(mod) {
  return !!(mod?.approved_by && mod?.approval_date);
}

export function hasConsent(mod) {
  return !!(mod?.consent_by && mod?.consent_date);
}

/** Everything still missing before this can go Active. */
export function activationBlockers(mod) {
  const blockers = [];
  if (!mod) return ["No modification record"];
  const missingElements = ELEMENTS.filter((e) => !String(mod[e.field] || "").trim());
  if (missingElements.length) {
    blockers.push(`Element${missingElements.length > 1 ? "s" : ""} ${missingElements.map((e) => e.n).join(", ")} not documented`);
  }
  if (!mod.right_affected) blockers.push("Right affected not chosen");
  if (!mod.pcsp_id) blockers.push("Not linked to a PCSP");
  if (!mod.review_interval_days) blockers.push("Review interval not set");
  if (!isApproved(mod)) blockers.push("Approval missing (approved by, approval body, approval date)");
  if (!hasConsent(mod)) blockers.push("Consent missing (consent by, consent date)");
  return blockers;
}

export function reviewDaysLeft(mod) {
  if (!mod?.next_review_date) return null;
  const today = todayISO();
  return Math.round((Date.parse(`${mod.next_review_date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
}

export function isActiveStatus(mod) {
  return mod?.status === "Active" || mod?.status === "Under review";
}