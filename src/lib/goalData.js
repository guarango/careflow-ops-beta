/**
 * Goal data entries tied to service notes — DHHS91172 SOW 1.25(5) / SOW 1.1.
 *
 * Every entry inherits who, when and which service from the note it was charted
 * inside, and must be internally valid: correct trials can never exceed total
 * trials, and a duration can never exceed the length of the note.
 */

import { base44 } from "@/api/base44Client";
import { noteMinutes } from "@/lib/serviceNote";

export const PROMPT_HIERARCHY = [
  "Full Physical Assist",
  "Hand-Over-Hand",
  "Physical Prompt",
  "Gestural Prompt",
  "Verbal Prompt",
  "Indirect Verbal Cue",
  "Independent",
];

export const ENTRY_STATUSES = ["Valid", "Flagged", "Excluded"];

export const ENTRY_STATUS_STYLES = {
  Valid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Flagged: "bg-amber-100 text-amber-800 border-amber-200",
  Excluded: "bg-slate-200 text-slate-600 border-slate-300",
};

/** Legacy entries carry no status; they count as Valid until reviewed. */
export const entryStatus = (entry) => entry?.status || "Valid";

/** Only Valid entries are evidence for a progress statement. */
export const isCountedEntry = (entry) => entryStatus(entry) === "Valid" && !entry?.missed_reason;

const int = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
};

/** Which measurement a goal uses, per primary_measurement_method. */
export function measurementKind(goal) {
  const method = String(goal?.primary_measurement_method || "");
  const legacy = goal?.measurement_type;
  if (legacy === "duration" || /duration/i.test(method)) return "duration";
  if (legacy === "frequency" || /frequency|count/i.test(method)) return "frequency";
  if (/likert|rating|scale/i.test(method)) return "rating";
  return "trials";
}

/** System-calculated score — never typed by the DSP. */
export function computeScore(entry, goal) {
  const kind = measurementKind(goal);
  if (kind === "duration") {
    const m = int(entry?.duration_minutes);
    return m === null ? null : { value: m, label: `${m} min`, percentage: null };
  }
  if (kind === "frequency") {
    const c = int(entry?.frequency_count);
    return c === null ? null : { value: c, label: `${c} occurrence${c === 1 ? "" : "s"}`, percentage: null };
  }
  if (kind === "rating") {
    const r = int(entry?.rating);
    return r === null ? null : { value: r, label: `${r} / 5`, percentage: null };
  }
  const total = int(entry?.trials_total);
  const correct = int(entry?.trials_correct);
  if (total === null || total <= 0 || correct === null) return null;
  const pct = Math.max(0, Math.min(100, Math.round((correct / total) * 100)));
  return { value: pct, label: `${correct}/${total} (${pct}%)`, percentage: pct };
}

/** True when the entry carries a measurement for this goal's method. */
export function hasMeasurement(entry, goal) {
  const kind = measurementKind(goal);
  if (kind === "duration") return int(entry?.duration_minutes) !== null;
  if (kind === "frequency") return int(entry?.frequency_count) !== null;
  if (kind === "rating") return int(entry?.rating) !== null;
  return (int(entry?.trials_total) ?? 0) > 0;
}

/**
 * Validation for one goal card inside a note.
 * errors block submission; warnings are shown but do not block.
 */
export function validateEntry(entry, { goal, minutes, serviceCodeId } = {}) {
  const errors = [];
  const warnings = [];
  if (!entry || entry.skipped) return { errors, warnings };
  const kind = measurementKind(goal);

  if (kind === "trials") {
    const total = int(entry.trials_total) ?? 0;
    const correct = int(entry.trials_correct) ?? 0;
    if (total > 0 && total < 1) errors.push("Total tries must be at least 1.");
    if (correct < 0) errors.push("Correct tries cannot be negative.");
    if (correct > total) errors.push(`Correct tries (${correct}) cannot be more than total tries (${total}).`);
    const minimum = int(goal?.minimum_trials_per_session);
    if (total > 0 && minimum && total < minimum) {
      warnings.push(`Below the ${minimum}-trial minimum — this session may not count as valid data.`);
    }
  }

  if (kind === "duration") {
    const d = int(entry.duration_minutes);
    if (d !== null && d < 0) errors.push("Duration cannot be negative.");
    if (d !== null && minutes != null && d > minutes) {
      errors.push(`Duration (${d} min) cannot exceed the note's length (${minutes} min).`);
    }
  }

  if (kind === "frequency") {
    const c = int(entry.frequency_count);
    if (c !== null && c < 0) errors.push("Count cannot be negative.");
  }

  if (kind === "rating") {
    const r = int(entry.rating);
    if (r !== null && (r < 1 || r > 5)) errors.push("Rating must be between 1 and 5.");
  }

  if (serviceCodeId && (goal?.service_code_ids || []).length && !goal.service_code_ids.includes(serviceCodeId)) {
    errors.push("This goal's Support Strategy does not include the note's service code.");
  }
  return { errors, warnings };
}

/** Goals whose strategy covers the note's service code (no code list = covers all). */
export function goalsForService(goals = [], serviceCodeId) {
  if (!serviceCodeId) return goals;
  return goals.filter((g) => !(g.service_code_ids || []).length || g.service_code_ids.includes(serviceCodeId));
}

/** Materialize one note goal card into a progress entry that inherits the note. */
export function buildEntryFromNote(goalEntry, note, goal) {
  const score = computeScore(goalEntry, goal);
  return {
    goal_id: goalEntry.goal_id,
    session_note_id: note.id,
    date: note.date || "",
    start_time: note.start_time || "",
    end_time: note.end_time || "",
    staff_id: note.staff_id || "",
    staff_name: note.staff_name || "",
    service_code_id: note.service_code_id || "",
    service_code: note.service_code || "",
    setting: note.setting || "",
    charting_mode: goal?.charting_mode || goalEntry.charting_mode || "",
    trials_total: int(goalEntry.trials_total),
    trials_correct: int(goalEntry.trials_correct),
    duration_minutes: int(goalEntry.duration_minutes),
    frequency_count: int(goalEntry.frequency_count),
    rating: int(goalEntry.rating),
    percentage: score?.percentage ?? null,
    computed_score: score?.value ?? null,
    score: score?.label || "",
    prompt_level: goalEntry.prompt_level || "",
    notes: goalEntry.narrative || "",
    recorded_by: note.staff_name || "",
    status: "Valid",
  };
}

const sortEntries = (entries = []) =>
  [...entries].sort((a, b) => `${a.date || ""}${a.start_time || ""}`.localeCompare(`${b.date || ""}${b.start_time || ""}`));

/**
 * Write a submitted note's goal data onto ClientGoal.progress_entries.
 * Entries already on the note are replaced; entries a manager flagged or
 * excluded are left untouched.
 */
export async function syncNoteProgressEntries(note, goals = []) {
  if (!note?.id) return { synced: 0 };
  const goalData = (note.goal_data || []).filter((g) => g.goal_id && !g.skipped);
  const goalIds = [...new Set(goalData.map((g) => g.goal_id))];
  let synced = 0;

  for (const goalId of goalIds) {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) continue;
    const current = goal.progress_entries || [];
    const kept = current.filter((e) => e.session_note_id !== note.id);
    const managed = current.filter((e) => e.session_note_id === note.id && entryStatus(e) !== "Valid");
    const entry = goalData.find((g) => g.goal_id === goalId);
    const { errors } = validateEntry(entry, {
      goal,
      minutes: noteMinutes(note),
      serviceCodeId: note.service_code_id,
    });
    const fresh = errors.length === 0 && hasMeasurement(entry, goal)
      ? [buildEntryFromNote(entry, note, goal)]
      : [];
    const next = sortEntries([...kept, ...managed, ...fresh]);
    if (JSON.stringify(next) !== JSON.stringify(current)) {
      await base44.entities.ClientGoal.update(goal.id, { progress_entries: next });
      synced += 1;
    }
  }
  return { synced };
}