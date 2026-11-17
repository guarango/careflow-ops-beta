// Browser-side copy of the retention constants and rule text, so screens never
// need to load backend code. The authoritative calculation stays in
// base44/shared/retention.ts.

export const DEFAULT_SETTINGS = {
  state: "UT",
  retention_years_adult: 6,
  retention_minor_rule: "Later of 6 years or age 22",
  retention_basis: "Last date of service",
  rule_confirmed: false,
  source: "Prior DHS contract template (DHS90548, 2011) — DHHS91172 period not yet confirmed",
};

export const MINOR_RULES = [
  "Later of 6 years or age 22",
  "Six years after last service",
  "Until age 22",
];

export function describeRetention(settings) {
  const s = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  return `${s.retention_years_adult} years after the ${String(s.retention_basis || "last date of service").toLowerCase()} for adults · minors: ${String(s.retention_minor_rule).toLowerCase()}`;
}

export function shortDate(value) {
  if (!value) return "—";
  return String(value).slice(0, 10);
}