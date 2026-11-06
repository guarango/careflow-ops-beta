import { base44 } from "@/api/base44Client";

export const FIELD_TYPES = [
  { value: "short_text", label: "Short text" },
  { value: "long_text", label: "Long text" },
  { value: "yes_no", label: "Yes / No" },
  { value: "dropdown", label: "Dropdown" },
  { value: "date", label: "Date" },
  { value: "number", label: "Number" },
];

export const FORM_TYPES = [
  { value: "incident_report", label: "Incident Report", recordType: "IncidentReport" },
  { value: "house", label: "House", recordType: "House" },
];

export function fieldTypeLabel(type) {
  return (FIELD_TYPES.find((t) => t.value === type) || {}).label || type;
}

export function formRecordType(formType) {
  return (FORM_TYPES.find((f) => f.value === formType) || {}).recordType || "IncidentReport";
}

export function activeFields(definitions) {
  return (definitions || []).filter((d) => d.active !== false);
}

/** Answers on a record → { [fieldId]: value } for the form inputs. */
export function valuesFromRecord(record) {
  const out = {};
  Object.entries(record?.custom_fields || {}).forEach(([id, answer]) => {
    out[id] = answer?.value ?? "";
  });
  return out;
}

/** Splits entered values into public answers and admin-only answers. */
export function splitAnswers(definitions, values) {
  const custom_fields = {};
  const restricted = [];
  (definitions || []).forEach((def) => {
    const raw = values?.[def.id];
    if (raw === undefined || raw === null || String(raw).trim() === "") return;
    if (def.admin_only) {
      restricted.push({ field_id: def.id, label: def.label, value: String(raw) });
    } else {
      custom_fields[def.id] = { value: String(raw), label: def.label };
    }
  });
  return { custom_fields, restricted };
}

/**
 * Required only blocks NEW records (and edits to drafts).
 * Pass isNew:false to skip validation entirely.
 */
export function missingRequired(definitions, values, { isAdmin, isNew }) {
  if (!isNew) return [];
  return activeFields(definitions)
    .filter((d) => d.required && (isAdmin || !d.admin_only))
    .filter((d) => {
      const v = values?.[d.id];
      return v === undefined || v === null || String(v).trim() === "";
    });
}

/** Keeps answers to fields that have since been retired. */
export function withRetiredAnswers(existing, definitions, custom_fields) {
  const activeIds = new Set((definitions || []).map((d) => d.id));
  const kept = Object.entries(existing || {}).filter(([id]) => !activeIds.has(id));
  return { ...Object.fromEntries(kept), ...custom_fields };
}

export async function saveRestrictedValues(recordType, recordId, restricted) {
  await base44.entities.RestrictedFieldValue.deleteMany({
    record_type: recordType,
    record_id: recordId,
  });
  if (!restricted?.length) return;
  await base44.entities.RestrictedFieldValue.bulkCreate(
    restricted.map((r) => ({
      record_type: recordType,
      record_id: recordId,
      field_id: r.field_id,
      label: r.label,
      value: r.value,
    }))
  );
}

/** Admin only — non-admins must never call this (the read is denied). */
export async function loadRestrictedValues(recordType, recordId) {
  const res = await base44.entities.RestrictedFieldValue.filter(
    { record_type: recordType, record_id: recordId },
    { limit: 100 }
  );
  return res.items || [];
}

/** True once any record holds an answer — locks the field's type. */
export async function fieldHasAnswers(formType, fieldId) {
  const recordType = formRecordType(formType);
  const res = await base44.entities[recordType].filter({}, { limit: 500 });
  const inRecords = (res.items || []).some((r) => r.custom_fields && r.custom_fields[fieldId]);
  if (inRecords) return true;
  const count = await base44.entities.RestrictedFieldValue.count({ field_id: fieldId });
  return count > 0;
}

export function displayValue(value) {
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

/** CSV cell escaping. */
export function csvCell(value) {
  const s = value === undefined || value === null ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}