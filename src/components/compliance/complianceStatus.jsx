export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T23:59:59");
  const now = new Date();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export function expiryStatus(dateStr) {
  const days = daysUntil(dateStr);
  if (days === null) return "green";
  if (days < 0) return "red";
  if (days <= 7) return "red";
  if (days <= 30) return "orange";
  if (days <= 60) return "yellow";
  return "green";
}

export function docStatus(status, dateStr) {
  if (status === "Expired") return "red";
  if (status === "Pending") return "yellow";
  const es = expiryStatus(dateStr);
  if (status === "Active" || status === "Current" || status === "Signed" || status === "Verified" || status === "Completed" || status === "Approved") return es;
  return "gray";
}

export function rowPct(cells) {
  const values = Object.values(cells);
  const applicable = values.filter(c => c.status !== "gray");
  if (!applicable.length) return 100;
  const green = applicable.filter(c => c.status === "green").length;
  return Math.round((green / applicable.length) * 100);
}

export const REQUIRED_TRAINING_HOURS = 24;