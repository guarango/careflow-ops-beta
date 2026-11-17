/**
 * Service note required elements — DHHS91172 SOW 1.10(7).
 * A note is documentation of service delivery: person, date, start, end, code,
 * staff, and a substantive summary written to that code's description.
 */

export const MIN_SUMMARY_WORDS = 25;
export const DEFAULT_LATE_HOURS = 24;
export const DEFAULT_EVV_TOLERANCE_MINUTES = 15;

export const SETTING_OPTIONS = [
  "Residence",
  "Site-based day program",
  "Community",
  "Worksite",
  "Other",
];

/** These codes must name where the service happened. */
export const SETTING_REQUIRED_CODES = ["DSG", "DSP", "DSI"];
/** Group codes: one staff member legitimately serves several people at once. */
export const GROUP_CODES = ["DSG", "DSP", "SED"];

const codeKey = (code) => String(code?.code || "").toUpperCase();

export function countWords(text = "") {
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

/** The stored summary, whichever field it lives in. */
export function summaryText(note) {
  return String(note?.summary_note || note?.summary || "").trim();
}

export function requiresSetting(code) {
  return SETTING_REQUIRED_CODES.includes(codeKey(code));
}

export function isGroupCode(code) {
  return GROUP_CODES.includes(codeKey(code));
}

function toDate(value, fallbackDate) {
  if (!value) return null;
  const raw = String(value);
  const iso = raw.includes("T") ? raw : `${fallbackDate || ""}T${raw.slice(0, 5)}`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Local clock range of a note; an end time at or before the start rolls to the next day. */
export function noteRange(note) {
  if (!note?.date || !note?.start_time) return null;
  const start = toDate(note.start_time, note.date);
  if (!start) return null;
  if (!note.end_time) return { start, end: null };
  const end = toDate(note.end_time, note.end_date || note.date);
  if (!end) return { start, end: null };
  if (!note.end_date && end <= start) end.setDate(end.getDate() + 1);
  return { start, end };
}

export function noteMinutes(note) {
  const range = noteRange(note);
  if (!range?.end) return null;
  return Math.max(0, Math.round((range.end - range.start) / 60000));
}

/** Submitted more than the agency's window after the service ended. */
export function isLateNote(note, lateHours = DEFAULT_LATE_HOURS) {
  const range = noteRange(note);
  if (!range?.end) return false;
  const editable = !note.status || note.status === "Draft" || note.status === "Returned";
  const submittedAt = editable
    ? new Date()
    : note.submitted_at
      ? new Date(note.submitted_at)
      : null;
  if (!submittedAt || Number.isNaN(submittedAt.getTime())) return false;
  return submittedAt.getTime() - range.end.getTime() > lateHours * 3600000;
}

/** Missing required elements for submission, in the order SOW 1.10(7) lists them. */
export function missingElements(note, { code } = {}) {
  const out = [];
  if (!note?.client_id) out.push({ key: "person", label: "Person's name" });
  if (!note?.date) out.push({ key: "date", label: "Date of service" });
  if (!note?.start_time) out.push({ key: "start_time", label: "Start time" });
  if (!note?.end_time) out.push({ key: "end_time", label: "End time" });
  if (!note?.service_code_id && !note?.service_code) out.push({ key: "service", label: "Service code" });
  if (!(note?.staff_name || note?.staff_id)) out.push({ key: "staff", label: "Staff name" });
  if (requiresSetting(code) && !note?.setting) out.push({ key: "setting", label: "Setting" });
  if (countWords(summaryText(note)) < MIN_SUMMARY_WORDS) {
    out.push({ key: "summary", label: `Summary note (${MIN_SUMMARY_WORDS} words)` });
  }
  return out;
}

/** End must be after start; overnight is only valid when an end date is given. */
export function timeOrderError(note) {
  if (!note?.date || !note?.start_time || !note?.end_time) return null;
  const start = toDate(note.start_time, note.date);
  const end = toDate(note.end_time, note.end_date || note.date);
  if (!start || !end) return null;
  if (note.end_date) {
    return note.end_date < note.date || end <= start
      ? "The end date and time must be after the start."
      : null;
  }
  return note.end_time <= note.start_time
    ? "End time must be after start time. Tick overnight if the service ends the next day."
    : null;
}

/** Services on the active PCSP that authorize this date and require a daily note. */
export function planServiceCodes(plan, serviceCodes = [], dateISO) {
  const byId = new Map(serviceCodes.map((c) => [c.id, c]));
  const byCode = new Map(serviceCodes.map((c) => [String(c.code || "").toUpperCase(), c]));
  const out = [];
  const seen = new Set();
  for (const entry of plan?.services_on_plan || []) {
    const record =
      byId.get(entry.service_code_id) ||
      byCode.get(String(entry.service_code || "").toUpperCase());
    if (!record || seen.has(record.id)) continue;
    if (record.active === false) continue;
    if (record.daily_note_required === false) continue;
    if (dateISO) {
      if (entry.authorization_start && dateISO < entry.authorization_start) continue;
      if (entry.authorization_end && dateISO > entry.authorization_end) continue;
    }
    seen.add(record.id);
    out.push(record);
  }
  return out;
}

/** False when every service on the plan is documented another way (milestone, summary). */
export function planRequiresDailyNote(plan, serviceCodes = []) {
  if (!plan) return true;
  const services = plan.services_on_plan || [];
  if (!services.length) return true;
  const byId = new Map(serviceCodes.map((c) => [c.id, c]));
  const byCode = new Map(serviceCodes.map((c) => [String(c.code || "").toUpperCase(), c]));
  return services.some((entry) => {
    const record =
      byId.get(entry.service_code_id) ||
      byCode.get(String(entry.service_code || "").toUpperCase());
    return !record || record.daily_note_required !== false;
  });
}

export function activePcsp(plans = [], clientId) {
  if (!clientId) return null;
  return plans.find((p) => p.client_id === clientId && p.status === "Active") || null;
}

/** Overlapping notes for the same staff member on another person's note. */
export function overlapWarnings(note, otherNotes = [], code) {
  if (isGroupCode(code)) return [];
  const range = noteRange(note);
  if (!range?.end) return [];
  const out = [];
  for (const other of otherNotes) {
    if (!other || other.id === note.id || other.client_id === note.client_id) continue;
    if (other.status === "Cancelled") continue;
    if (note.staff_id && other.staff_id && other.staff_id !== note.staff_id) continue;
    if (!note.staff_id && !other.staff_id && other.staff_name !== note.staff_name) continue;
    const theirs = noteRange(other);
    if (!theirs?.end) continue;
    if (range.start < theirs.end && theirs.start < range.end) {
      out.push(
        `${other.client_name || "another person"} (${other.start_time || "?"}–${other.end_time || "?"})`
      );
    }
  }
  return out;
}

export function evvMinutes(log) {
  if (!log?.clock_in || !log?.clock_out) return null;
  const a = toDate(log.clock_in, log.date);
  const b = toDate(log.clock_out, log.date);
  if (!a || !b) return null;
  return Math.max(0, Math.round((b - a) / 60000));
}

/** Note time that disagrees with the EVV visit by more than the agency's tolerance. */
export function evvMismatch(note, log, tolerance = DEFAULT_EVV_TOLERANCE_MINUTES) {
  const visit = evvMinutes(log);
  const documented = noteMinutes(note);
  if (visit === null || documented === null) return null;
  const diff = Math.abs(visit - documented);
  return diff > tolerance ? { evv: visit, note: documented, diff } : null;
}

export function findEvvLog(note, evvLogs = []) {
  if (!note) return null;
  if (note.evv_log_id) {
    const direct = evvLogs.find((l) => l.id === note.evv_log_id);
    if (direct) return direct;
  }
  if (note.shift_id) return evvLogs.find((l) => l.shift_id === note.shift_id) || null;
  return null;
}