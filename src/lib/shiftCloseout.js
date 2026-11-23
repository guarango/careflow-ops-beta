/**
 * Shift close-out: a shift cannot be completed while documentation is missing.
 * Every item here is something a reviewer would look for on the visit record.
 */
export function shiftMissingDocs({ shift, notes = [], medLogs = [], medications = [] }) {
  if (!shift) return [];
  const missing = [];

  if (!shift.evv_clock_in) {
    missing.push({ key: "clock_in", label: "No clock-in recorded" });
  }

  const linkedNotes = notes.filter((n) => n.shift_id === shift.id);
  if (linkedNotes.length === 0) {
    missing.push({ key: "session_note", label: "No session note linked to this shift" });
  }

  const scheduledMeds = medications.filter(
    (m) => m.client_id === shift.client_id && m.status === "Active" && !m.is_prn
  );
  const outcomes = medLogs.filter(
    (l) => l.client_id === shift.client_id && l.date === shift.date
  );
  if (scheduledMeds.length > 0 && outcomes.length === 0) {
    missing.push({ key: "med_outcome", label: "No medication outcome recorded for this shift" });
  }

  return missing;
}