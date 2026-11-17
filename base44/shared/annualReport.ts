// Shared rules for the DHHS91172 fiscal-year annual report (due Aug 30).
// Used by generateAnnualReport and checkAnnualReportReminders — never copied.

export const DEFAULT_COLUMNS = [
  { key: 'persons_served', label: 'Persons served (unduplicated)', metric: 'persons_served' },
  { key: 'units', label: 'Units', metric: 'units' },
  { key: 'hours', label: 'Hours', metric: 'hours' },
  { key: 'sessions', label: 'Sessions', metric: 'sessions' },
  { key: 'sessions_site_based', label: 'Sessions — site-based', metric: 'sessions_site_based' },
  { key: 'sessions_community', label: 'Sessions — community', metric: 'sessions_community' },
  { key: 'staff_count', label: 'Staff count', metric: 'staff_count' },
  { key: 'incidents_count', label: 'Incidents', metric: 'incidents_count' },
  { key: 'goals_mastered', label: 'Goals mastered', metric: 'goals_mastered' },
];

export function fiscalYearBounds(yearEnd) {
  const y = Number(yearEnd);
  return {
    start: `${y - 1}-07-01`,
    end: `${y}-06-30`,
    due: `${y}-08-30`,
    label: `FY ${y} (Jul 1 ${y - 1} – Jun 30 ${y})`,
  };
}

// The fiscal year whose Aug 30 deadline is currently pending or was most recently due.
export function dueFiscalYearEndYear(date) {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0 = January
  if (m === 6 || (m === 7 && date.getDate() <= 30)) return y; // Jul 1 – Aug 30: the year that just ended
  return m >= 6 ? y + 1 : y;
}

export function minutesForNote(note) {
  const parse = (t) => {
    if (!t) return null;
    const [h, m] = String(t).split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };
  const start = parse(note.start_time);
  const end = parse(note.end_time);
  if (start === null || end === null) return 0;
  let diff = end - start;
  if (diff < 0 && note.end_date && note.end_date !== note.date) diff += 24 * 60;
  return diff > 0 ? diff : 0;
}

// Keep admin renames and added columns; append any default metric the template is missing.
export function mergeColumns(existing, defaults) {
  const kept = Array.isArray(existing) ? existing.filter((c) => c && c.key && c.metric) : [];
  const known = new Set(kept.map((c) => c.key));
  const appended = defaults.filter((d) => !known.has(d.key)).map((d) => ({ ...d }));
  return [...kept, ...appended];
}