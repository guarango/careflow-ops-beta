import { base44 } from "@/api/base44Client";

export const DEFAULT_COLUMNS = [
  { key: "persons_served", label: "Persons served (unduplicated)", metric: "persons_served" },
  { key: "units", label: "Units", metric: "units" },
  { key: "hours", label: "Hours", metric: "hours" },
  { key: "sessions", label: "Sessions", metric: "sessions" },
  { key: "sessions_site_based", label: "Sessions — site-based", metric: "sessions_site_based" },
  { key: "sessions_community", label: "Sessions — community", metric: "sessions_community" },
  { key: "staff_count", label: "Staff count", metric: "staff_count" },
  { key: "incidents_count", label: "Incidents", metric: "incidents_count" },
  { key: "goals_mastered", label: "Goals mastered", metric: "goals_mastered" },
];

export const DEFAULT_METRICS = DEFAULT_COLUMNS.map((c) => ({ key: c.key, label: c.label, metric: c.metric }));

// Utah's fiscal year runs July 1 – June 30.
export function currentFiscalYearEndYear(date = new Date()) {
  return date.getMonth() >= 6 ? date.getFullYear() + 1 : date.getFullYear();
}

export function fiscalYearBounds(yearEnd) {
  const y = Number(yearEnd);
  return {
    start: `${y - 1}-07-01`,
    end: `${y}-06-30`,
    due: `${y}-08-30`,
    label: `FY ${y} (Jul 1 ${y - 1} – Jun 30 ${y})`,
  };
}

export function fiscalYearOptions(count = 4) {
  const current = currentFiscalYearEndYear();
  return Array.from({ length: count }, (_, i) => current - i);
}

export function localTodayISO(date = new Date()) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function daysUntil(dateStr, today = new Date()) {
  if (!dateStr) return null;
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - base.getTime()) / 86400000);
}

export function valueFor(row, column) {
  if (!row || !column) return "";
  if (column.metric === "manual") return row.custom_values?.[column.key] ?? "";
  return row[column.metric] ?? row[column.key] ?? "";
}

function csvCell(value) {
  let text = value === null || value === undefined ? "" : String(value);
  // Spreadsheet formula injection guard.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(columns, rows) {
  if (!columns?.length) return "";
  const header = columns.map((c) => csvCell(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => csvCell(valueFor(row, c))).join(","));
  return [header, ...lines].join("\r\n");
}

export function downloadCsv(filename, csv) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function loadAnnualReport(fiscalYearEndYear) {
  const [codePage, templateItems, reportPage] = await Promise.all([
    base44.entities.ServiceCode.filter({ annual_report_required: true }, { sort: "code", limit: 100 }),
    base44.entities.AnnualReportTemplate.list("-created_date", 300),
    base44.entities.AnnualReport.filter({ fiscal_year_end_year: fiscalYearEndYear }, { sort: "-created_date", limit: 1 }),
  ]);
  const templates = {};
  (templateItems || []).forEach((t) => { templates[t.service_code_id] = t; });
  return {
    codes: codePage?.items || [],
    templates,
    report: reportPage?.items?.[0] || null,
  };
}