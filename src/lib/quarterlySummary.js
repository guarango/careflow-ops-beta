/**
 * DHHS91172 SOW 1.25 — quarterly summary rules.
 *
 * A quarterly summary carries six elements in this order:
 *   1. the person's name
 *   2. each service provided to the person
 *   3. the date range covered
 *   4. a general summary of services, status and response, notable events
 *   5. progress toward each goal (never for ELS, MTP, PBA, Professional
 *      Medication Monitoring or Respite)
 *   6. the name of the staff member writing it
 *
 * Signing is refused while any element is empty or a goal row has no narrative.
 */

export const QUARTERLY_STATUSES = ["Draft", "Ready", "Signed", "Sent", "Late"];

export const STATUS_STYLES = {
  Draft: "bg-slate-100 text-slate-700 border-slate-200",
  Ready: "bg-amber-100 text-amber-800 border-amber-200",
  Signed: "bg-blue-100 text-blue-700 border-blue-200",
  Sent: "bg-green-100 text-green-700 border-green-200",
  Late: "bg-red-100 text-red-700 border-red-200",
};

export const TREND_STYLES = {
  Improving: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Stable: "bg-slate-100 text-slate-700 border-slate-200",
  Declining: "bg-rose-100 text-rose-700 border-rose-200",
  "Insufficient data": "bg-amber-100 text-amber-800 border-amber-200",
};

export const TRENDS = ["Improving", "Stable", "Declining", "Insufficient data"];
export const SENT_METHODS = ["UPI", "Email", "Other"];

/** The services that never carry goal progress (SOW 1.25(5)). */
export const EXEMPT_SERVICES = ["ELS", "MTP", "PBA", "PMM", "PMP", "Respite"];

export function isExemptServiceCode(code = "", name = "") {
  const c = String(code || "").toUpperCase();
  if (["ELS", "MTP", "PBA", "PMM", "PMP"].includes(c)) return true;
  return /respite|professional medication monitoring/i.test(String(name || ""));
}

export function localTodayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Stored status, corrected on read: an unsent summary past its due date is Late.
 * Older records carrying the retired "Overdue" / "Sent to SC" values are mapped.
 */
export function effectiveStatus(summary) {
  if (!summary) return "Draft";
  let status = summary.status || "Draft";
  if (status === "Sent to SC") status = "Sent";
  if (status === "Overdue" || status === "Pending Review") status = status === "Overdue" ? "Late" : "Ready";
  if (status !== "Sent" && summary.due_date && localTodayISO() > summary.due_date) {
    return "Late";
  }
  return status;
}

/** The six state elements with a done flag each, in order. */
export function quarterlyElements(summary) {
  if (!summary) return [];
  const services = summary.services_provided || [];
  const goals = summary.goal_progress || [];
  const goalsMissingNarrative = goals.filter(g => !String(g.narrative || "").trim());
  const goalsPresent = goals.length > 0;
  return [
    {
      number: 1,
      key: "person",
      label: "Person's name",
      complete: !!String(summary.client_name || "").trim(),
      detail: null,
    },
    {
      number: 2,
      key: "services",
      label: "Each service provided",
      complete: services.length > 0 && services.every(s => !!s.service_code),
      detail: services.length ? `${services.length} service(s) this quarter` : "No services recorded",
    },
    {
      number: 3,
      key: "range",
      label: "Date range covered",
      complete: !!(summary.period_start && summary.period_end),
      detail: summary.period_start && summary.period_end
        ? `${summary.period_start} to ${summary.period_end}`
        : "Period not set",
    },
    {
      number: 4,
      key: "summary",
      label: "Services, status and response, notable events",
      complete: !!(
        String(summary.services_summary || "").trim() &&
        String(summary.status_and_response || "").trim() &&
        String(summary.notable_events || "").trim()
      ),
      detail: null,
    },
    {
      number: 5,
      key: "goals",
      label: "Progress toward each goal",
      complete: goalsMissingNarrative.length === 0,
      detail: !goalsPresent
        ? "No goal progress required for these services"
        : goalsMissingNarrative.length
          ? `${goalsMissingNarrative.length} goal(s) need a narrative`
          : `${goals.length} goal(s) reported`,
    },
    {
      number: 6,
      key: "writer",
      label: "Name of the staff member writing it",
      complete: !!String(summary.writer_name || summary.signed_by_name || "").trim(),
      detail: null,
    },
  ];
}

/** Everything that must be fixed before the summary can be signed. */
export function signingBlockers(summary) {
  if (!summary) return ["Summary not loaded"];
  const blockers = quarterlyElements(summary)
    .filter(e => !e.complete)
    .map(e => e.label);
  const emptyNarratives = (summary.goal_progress || []).filter(g => !String(g.narrative || "").trim());
  if (emptyNarratives.length) {
    blockers.push(
      `Goal narrative required: ${emptyNarratives.map(g => g.goal_title || "Untitled goal").join(", ")}`
    );
  }
  if (!String(summary.client_name || "").trim()) blockers.push("Person's name is missing");
  if (summary.sign_blocked_reason) blockers.push(summary.sign_blocked_reason);
  return blockers;
}

export function canSign(summary) {
  return signingBlockers(summary).length === 0;
}