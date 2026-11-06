/** Masking helpers for sensitive identifiers and HR values. */

export const REVEAL_SECONDS = 30;

/**
 * Masks a value, keeping only the last 4 characters visible.
 * 9-digit identifiers (SSN / member IDs) render as •••-••-1234.
 */
export function maskValue(value) {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (!text) return "";
  if (/^\d{9}$/.test(text)) return `•••-••-${text.slice(-4)}`;
  if (text.length <= 4) return "•".repeat(text.length);
  const head = text.slice(0, -4).replace(/[^-]/g, "•");
  return `${head}${text.slice(-4)}`;
}

/** True when the viewer may reveal a client identifier (admin, or manager assigned to that client). */
export function canRevealClientIdentifier({ can, isAdmin, assignedClientIds = [], clientId }) {
  if (!can("revealClientIdentifiers")) return false;
  if (isAdmin) return true;
  return assignedClientIds.includes(clientId);
}

/** True when the viewer may reveal staff HR details (admin holding the HR bundle). */
export function canRevealStaffHr({ can }) {
  return can("viewSensitiveIdentifiers");
}