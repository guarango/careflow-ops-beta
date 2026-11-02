/**
 * Session note versioning.
 *
 * A submitted note is locked: the DSP can no longer change it. Corrections are
 * made two ways only — a manager returns it for revision (the DSP then edits and
 * resubmits), or an admin/manager adds an addendum. Either way a new version is
 * recorded here so the original submitted text is never lost.
 */

export const LOCKED_NOTE_STATUSES = ["Submitted", "Approved", "Flagged for Review"];

export function isNoteLocked(status) {
  return LOCKED_NOTE_STATUSES.includes(status);
}

const TRACKED_FIELDS = [
  ["summary", "Session summary"],
  ["session_overall_notes", "Overall session notes"],
  ["goal_data", "Goal data"],
  ["health_safety_flags", "Health & safety flags"],
  ["date", "Session date"],
  ["start_time", "Start time"],
  ["end_time", "End time"],
  ["service_code_id", "Service code"],
  ["location", "Location"],
  ["staff_name", "Staff name"],
];

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const describeAction = (action) => {
  if (action === "submit") return "Submitted for review";
  if (action === "resubmit") return "Revised and resubmitted";
  return "Draft saved";
};

/**
 * Builds the { version, version_history } patch for saving an existing note.
 * Returns null when an autosave produced no meaningful change.
 */
export function buildNoteVersionEntry({ previous, next, savedBy, action = "draft" }) {
  const changed = TRACKED_FIELDS
    .filter(([key]) => !same(previous?.[key], next?.[key]))
    .map(([, label]) => label);

  if (action === "draft" && changed.length === 0) return null;

  const label = describeAction(action);
  const summary = changed.length ? `${label} — ${changed.join(", ")}` : label;
  const version = (previous?.version || 1) + 1;

  return {
    version,
    version_history: [
      ...(previous?.version_history || []),
      {
        version,
        saved_at: new Date().toISOString(),
        saved_by: savedBy || "Staff",
        summary_of_changes: summary,
      },
    ],
  };
}

/** Version 1 for a brand-new note. */
export function initialNoteVersion(savedBy, status) {
  return {
    version: 1,
    version_history: [
      {
        version: 1,
        saved_at: new Date().toISOString(),
        saved_by: savedBy || "Staff",
        summary_of_changes: status === "Submitted" ? "Note created and submitted" : "Note created",
      },
    ],
  };
}