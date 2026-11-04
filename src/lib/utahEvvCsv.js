/**
 * Utah EVV CSV export — Utah DHHS LTSS EVV Technical Specifications v1.7.
 *
 * Builds the portal CSV (Section 3.1 + Table 4 data elements), applying the
 * state's allowed character sets and date/time formats, and validates each
 * record against the required elements before it is exported.
 */

export const UTAH_EVV_VENDOR_NAME = "CareFlow Ops";
export const UTAH_EVV_PORTAL_URL = "https://evv.medicaid.utah.gov/evvsubmit/";

/* Column order per the Utah EVV CSV template. */
export const UTAH_EVV_COLUMNS = [
  { key: "member_id", header: "Member ID (req)" },
  { key: "first_name", header: "First name (req)" },
  { key: "middle_initial", header: "Middle initial" },
  { key: "last_name", header: "Last name (req)" },
  { key: "service_code", header: "Service Code (req)" },
  { key: "service_description", header: "Service Description" },
  { key: "provider_id", header: "Provider PRISM ID or Provider NPI (req)" },
  { key: "employee_name", header: "Name of employee performing service (req)" },
  { key: "begin_date", header: "beginDate (req)" },
  { key: "begin_time", header: "beginTime (req)" },
  { key: "begin_street", header: "Begin Street Address" },
  { key: "begin_apt", header: "Begin Apt/Suite/Floor" },
  { key: "begin_city", header: "Begin City" },
  { key: "begin_state", header: "Begin State" },
  { key: "begin_zip", header: "Begin Zip" },
  { key: "begin_lat", header: "Begin Geo Latitude" },
  { key: "begin_lng", header: "Begin Geo Longitude" },
  { key: "end_date", header: "endDate (req)" },
  { key: "end_time", header: "endTime (req)" },
  { key: "end_street", header: "End Street Address" },
  { key: "end_apt", header: "End Apt/Suite/Floor" },
  { key: "end_city", header: "End City" },
  { key: "end_state", header: "End State" },
  { key: "end_zip", header: "End Zip" },
  { key: "end_lat", header: "End Geo Latitude" },
  { key: "end_lng", header: "End Geo Longitude" },
  { key: "orig_receipt_id", header: "Orig_receipt_id" },
  { key: "batch_id", header: "Batch ID (req)" },
  { key: "record_id", header: "Record ID (req)" },
  { key: "vendor_name", header: "EVV Solution Vendor Name (req)" },
];

/* §3.2 — Plain Text forbids these symbols. */
const FORBIDDEN_TEXT = /[;<>{}\\=&#’]/g;

export function sanitizeText(value) {
  return String(value ?? "")
    .replace(FORBIDDEN_TEXT, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Plain Text field, truncated to the state's max length. */
function text(value, max = 255) {
  return sanitizeText(value).slice(0, max);
}

/** Numeric field: digits only (no decimals, commas or signs). */
function numeric(value, max = 12) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.slice(0, max);
}

/** §3.2 — Date format M/D/YYYY. */
export function formatUtahDate(value) {
  if (!value) return "";
  const m = String(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${Number(m[2])}/${Number(m[3])}/${m[1]}`;
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return "";
  return `${parsed.getMonth() + 1}/${parsed.getDate()}/${parsed.getFullYear()}`;
}

/** §3.2 — Time format H:M:S (24-hour). */
export function formatUtahTime(value) {
  if (!value) return "";
  const m = String(value).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return "";
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  const seconds = Number(m[3] || 0);
  if (hours > 23 || minutes > 59) return "";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Split a single-line address into street / city / state / zip where possible. */
function splitAddress(address) {
  const parts = String(address || "").split(",").map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { street: parts[0] };
  const tail = parts[parts.length - 1].match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (tail) {
    return {
      street: parts[0],
      city: parts.length === 3 ? parts[1] : parts.slice(1, -1).join(", "),
      state: tail[1].toUpperCase(),
      zip: tail[2],
    };
  }
  return { street: parts[0], city: parts.slice(1).join(", ") };
}

function beginLocation(log, client, house) {
  const fallback = splitAddress(log.location_in_address || client?.address || house?.address);
  return {
    street: log.location_in_address && log.location_in_city ? log.location_in_address : fallback.street || "",
    city: log.location_in_city || client?.address_city || fallback.city || "",
    state: (log.location_in_state || client?.address_state || fallback.state || "UT").toUpperCase(),
    zip: log.location_in_zip || client?.address_zip || fallback.zip || "",
    lat: log.location_in_lat,
    lng: log.location_in_lng,
  };
}

function endLocation(log, client, house) {
  const fallback = splitAddress(log.location_out_address || client?.address || house?.address);
  return {
    street: log.location_out_address && log.location_out_city ? log.location_out_address : fallback.street || "",
    city: log.location_out_city || client?.address_city || fallback.city || "",
    state: (log.location_out_state || client?.address_state || fallback.state || "UT").toUpperCase(),
    zip: log.location_out_zip || client?.address_zip || fallback.zip || "",
    lat: log.location_out_lat,
    lng: log.location_out_lng,
  };
}

function buildValues(log, { client, house, providerId, batchId, recordId }) {
  const begin = beginLocation(log, client, house);
  const end = endLocation(log, client, house);

  return {
    member_id: numeric(log.member_id || client?.medicaid_id, 10),
    first_name: text(client?.first_name, 255),
    middle_initial: text(client?.middle_initial, 1),
    last_name: text(client?.last_name, 255),
    service_code: text(log.service_code, 5).replace(/[\s_-]/g, ""),
    service_description: text(log.service_description || log.service_type, 255),
    provider_id: numeric(providerId, 12),
    employee_name: text(log.staff_name, 255),
    begin_date: formatUtahDate(log.date),
    begin_time: formatUtahTime(log.clock_in),
    begin_street: text(begin.street, 255),
    begin_apt: "",
    begin_city: text(begin.city, 60),
    begin_state: text(begin.state, 20),
    begin_zip: text(begin.zip, 10),
    begin_lat: begin.lat ?? "",
    begin_lng: begin.lng ?? "",
    end_date: formatUtahDate(log.date),
    end_time: formatUtahTime(log.clock_out),
    end_street: text(end.street, 255),
    end_apt: "",
    end_city: text(end.city, 60),
    end_state: text(end.state, 20),
    end_zip: text(end.zip, 10),
    end_lat: end.lat ?? "",
    end_lng: end.lng ?? "",
    orig_receipt_id: log.is_correction ? text(log.orig_receipt_id, 32) : "",
    batch_id: batchId,
    record_id: recordId,
    vendor_name: UTAH_EVV_VENDOR_NAME,
  };
}

/** Human-readable list of what this record is missing before it can be exported. */
function validateValues(values) {
  const missing = [];
  if (!values.member_id) missing.push("Member ID");
  if (!values.first_name) missing.push("First name");
  if (!values.last_name) missing.push("Last name");
  if (!values.service_code) missing.push("Service code");
  if (!values.provider_id) missing.push("Provider PRISM ID / NPI");
  if (!values.employee_name) missing.push("Employee name");
  if (!values.begin_date) missing.push("Begin date");
  if (!values.begin_time) missing.push("Begin time");
  if (!values.end_date) missing.push("End date");
  if (!values.end_time) missing.push("End time");
  const beginLocated = (values.begin_street && values.begin_city) || (values.begin_lat !== "" && values.begin_lng !== "");
  if (!beginLocated) missing.push("Begin location");
  const endLocated = (values.end_street && values.end_city) || (values.end_lat !== "" && values.end_lng !== "");
  if (!endLocated) missing.push("End location");
  return missing;
}

function normalizeProviderId(agency) {
  return numeric(agency?.medicaid_provider_id || agency?.npi, 12);
}

/**
 * Split logs into records that can be submitted and records that cannot.
 * Returns { ready: [{ log, values }], blocked: [{ log, missing }], providerId }.
 */
export function prepareUtahExport(logs, { clientsById = {}, housesById = {}, agency, batchId = "" } = {}) {
  const providerId = normalizeProviderId(agency);
  const ready = [];
  const blocked = [];

  (logs || []).forEach((log, index) => {
    const values = buildValues(log, {
      client: clientsById[log.client_id],
      house: housesById[log.house_id],
      providerId,
      batchId,
      recordId: String(index + 1),
    });
    const missing = validateValues(values);
    if (missing.length) blocked.push({ log, missing });
    else ready.push({ log, values });
  });

  return { ready, blocked, providerId };
}

function escapeCsv(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

/** Serialize prepared rows to the Utah portal CSV (header row included). */
export function rowsToUtahCsv(ready) {
  const header = UTAH_EVV_COLUMNS.map(c => escapeCsv(c.header)).join(",");
  const body = (ready || []).map(({ values }) =>
    UTAH_EVV_COLUMNS.map(c => escapeCsv(values[c.key])).join(",")
  );
  return [header, ...body].join("\n");
}

/** Numeric, provider-assigned Batch ID (1-10 digits) for one export. */
export function nextBatchId() {
  return String(Date.now()).slice(-9);
}