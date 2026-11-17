// Record-retention rules. The current DHHS91172 period is not confirmed, so the
// prior DHS90548 template is the default: six years from the last service for
// adults, and for minors the later of six years or the person turning 22.

export const DEFAULT_SETTINGS = {
  state: 'UT',
  retention_years_adult: 6,
  retention_minor_rule: 'Later of 6 years or age 22',
  retention_basis: 'Last date of service',
  rule_confirmed: false,
  source: 'Prior DHS contract template (DHS90548, 2011) — DHHS91172 period not yet confirmed',
};

export const MINOR_RULES = [
  'Later of 6 years or age 22',
  'Six years after last service',
  'Until age 22',
];

export const RETENTION_ENTITIES = [
  { key: 'SessionNote', label: 'Session notes', dateField: 'date' },
  { key: 'ClientGoal', label: 'Goals and goal data', dateField: 'start_date' },
  { key: 'MonthlySummary', label: 'Monthly summaries', dateField: 'period_end' },
  { key: 'QuarterlySummary', label: 'Quarterly summaries', dateField: 'period_end' },
  { key: 'ISPlan', label: 'PCSPs', dateField: 'plan_year_end' },
  { key: 'RightsModification', label: 'Rights modifications', dateField: 'next_review_date' },
  { key: 'IncidentReport', label: 'Incidents', dateField: 'date' },
  { key: 'BehaviorIncident', label: 'Behavior incidents', dateField: 'date' },
  { key: 'Medication', label: 'Medications', dateField: 'created_date' },
  { key: 'MedicationLog', label: 'Medication records', dateField: 'scheduled_date' },
];

export function localTodayISO(timeZone = 'America/Denver') {
  return new Date().toLocaleDateString('en-CA', { timeZone });
}

export function addYearsISO(iso, years) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  const direct = new Date(Date.UTC(y + years, m - 1, d));
  if (direct.getUTCMonth() !== m - 1) {
    return new Date(Date.UTC(y + years, m, 0)).toISOString().slice(0, 10);
  }
  return direct.toISOString().slice(0, 10);
}

export function isMinorAt(client, onDate) {
  if (!client?.date_of_birth || !onDate) return false;
  const age22 = addYearsISO(client.date_of_birth, 22);
  return onDate < age22;
}

/** The date the retention period ends for one record. */
export function computeRetentionUntil({ settings, client, lastServiceDate }) {
  const effective = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  const lastService = String(lastServiceDate || localTodayISO()).slice(0, 10);
  const years = Number(effective.retention_years_adult) || 6;
  const adultEnd = addYearsISO(lastService, years);

  const dob = client?.date_of_birth;
  if (!dob) return adultEnd;
  const age22 = addYearsISO(dob, 22);
  const rule = effective.retention_minor_rule;

  if (rule === 'Until age 22') return age22;
  if (rule === 'Six years after last service') return adultEnd;
  // Default and "Later of…": the longer of the two, so a minor's record is never
  // released before they turn 22.
  return age22 > adultEnd ? age22 : adultEnd;
}

export function describeRetention(settings) {
  const s = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  return `${s.retention_years_adult} years after the ${String(s.retention_basis || 'last date of service').toLowerCase()} for adults · minors: ${s.retention_minor_rule.toLowerCase()}`;
}

export function isPastRetention(retentionUntil, today = localTodayISO()) {
  return !!retentionUntil && String(retentionUntil).slice(0, 10) < today;
}