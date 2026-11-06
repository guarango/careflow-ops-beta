/**
 * Built-in fields shown at the top of each form. They are locked: an Admin can
 * see them in the field builder but cannot edit, reorder or remove them.
 */
export const BUILT_IN_FIELDS = {
  incident_report: [
    "Client",
    "Date",
    "Time",
    "Location",
    "Location detail",
    "Category",
    "Severity",
    "Description",
    "Staff involved",
    "Witnesses",
    "Injuries?",
    "Injury description",
    "Medical treatment?",
    "Law enforcement?",
    "Restrictive intervention?",
    "Restrictive intervention description",
    "Photos",
    "Immediate actions taken",
    "Reported by",
  ],
  house: [
    "House name",
    "Street address",
    "City",
    "State",
    "Zip",
    "Program type",
    "Geofence radius",
    "Status",
    "Notes",
  ],
  session_note: [],
};