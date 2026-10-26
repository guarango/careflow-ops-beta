/**
 * EVV (Electronic Visit Verification) shared utilities.
 *
 * Used by buildEvvRecords and submitEvvBatch backend functions to:
 *  - Assemble EVV records from ShiftSchedule + EVVLog + Client + Agency data
 *  - Validate against Cures Act required data elements
 *  - Generate CSV files for portal upload
 *  - Build SOAP envelopes for API submission
 *
 * Utah EVV Technical Specifications v1.7
 */

// Cures Act §12006 required EVV data elements
export const EVV_REQUIRED_ELEMENTS = [
  "service_type",
  "recipient_id",
  "service_date",
  "service_location",
  "provider_id",
  "service_start_time",
  "service_end_time",
  "record_creation_date",
];

/**
 * Convert a datetime string to UTC ISO 8601 format.
 * Handles "YYYY-MM-DD HH:mm" or ISO strings; assumes local time if no TZ.
 */
export function toUtcIso8601(datetimeStr) {
  if (!datetimeStr) return null;
  const d = new Date(datetimeStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Format an address from components.
 */
export function formatAddress(street, city, state, zip) {
  const parts = [street, city, state && zip ? `${state} ${zip}` : state || zip].filter(Boolean);
  return parts.join(", ");
}

/**
 * Build a single EVV record from a completed shift and related data.
 * Uses the field mappings defined in the integration registry.
 */
export function buildEvvRecord(shift, evvLog, client, agency) {
  const serviceCode = shift.service_code || evvLog?.service_code || "";
  const medicaidId = client?.insurance_id || "";
  const shiftDate = shift.date || evvLog?.date || "";
  const location = evvLog?.location_in_address || client?.address || "";
  const providerNpi = agency?.npi || "";
  const clockIn = shift.evv_clock_in || evvLog?.clock_in || "";
  const clockOut = shift.evv_clock_out || evvLog?.clock_out || "";
  const recordCreationDate = new Date().toISOString();

  return {
    shift_id: shift.id,
    evv_log_id: evvLog?.id || null,
    client_id: shift.client_id,
    client_name: shift.client_name,
    staff_id: shift.staff_id,
    staff_name: shift.staff_name,
    // EVV data elements
    service_type: serviceCode,
    recipient_id: medicaidId,
    service_date: shiftDate,
    service_location: location,
    provider_id: providerNpi,
    service_start_time: toUtcIso8601(clockIn),
    service_end_time: toUtcIso8601(clockOut),
    record_creation_date: recordCreationDate,
  };
}

/**
 * Validate an EVV record against required elements.
 * Returns { valid, missingFields[] }.
 */
export function validateEvvRecord(record) {
  const missingFields = EVV_REQUIRED_ELEMENTS.filter(el => {
    const val = record[el];
    return !val || (typeof val === "string" && val.trim() === "");
  });
  return { valid: missingFields.length === 0, missingFields };
}

/**
 * CSV column headers for Utah EVV portal upload.
 * Order matches the Utah EVV CSV template.
 */
export const EVV_CSV_HEADERS = [
  "ServiceProviderNPI",
  "ServiceProviderID",
  "RecipientMedicaidID",
  "RecipientFirstName",
  "RecipientLastName",
  "ServiceTypeCode",
  "ServiceDate",
  "ServiceStartTime",
  "ServiceEndTime",
  "ServiceLocation",
  "ProviderNPI",
  "CaregiverID",
  "CaregiverFirstName",
  "CaregiverLastName",
  "RecordCreationDate",
];

/**
 * Generate a CSV string from EVV records.
 * Includes header row + one row per record.
 */
export function generateEvvCsv(records, agency, credentials) {
  const escapeCsv = (val) => {
    const s = String(val ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = records.map(r => [
    agency?.npi || "",
    credentials?.provider_id || agency?.medicaid_provider_id || "",
    r.recipient_id || "",
    "", // RecipientFirstName — not included for privacy; state matches by Medicaid ID
    "",
    r.service_type || "",
    r.service_date || "",
    r.service_start_time || "",
    r.service_end_time || "",
    r.service_location || "",
    r.provider_id || "",
    r.staff_id || "",
    "", // CaregiverFirstName
    "",
    r.record_creation_date || "",
  ].map(escapeCsv).join(","));

  return [EVV_CSV_HEADERS.join(","), ...rows].join("\n");
}

/**
 * Build a SOAP envelope for Utah EVV API submission.
 * Uses WS-Security with X.509 certificate reference (thumbprint).
 *
 * NOTE: Actual XML signing requires the certificate PFX stored as a secret.
 * This builds the envelope structure; the signing step is added when
 * the certificate is configured.
 */
export function buildSoapEnvelope(records, agency, credentials) {
  const submissionId = `EVV-${agency?.id}-${Date.now()}`;
  const providerNpi = agency?.npi || "";
  const providerId = credentials?.provider_id || agency?.medicaid_provider_id || "";
  const certThumbprint = credentials?.certificate_thumbprint || "";

  const recordElements = records.map((r, i) => {
    return `        <evv:EVVRecord>
          <evv:RecordSequence>${i + 1}</evv:RecordSequence>
          <evv:ServiceProviderNPI>${providerNpi}</evv:ServiceProviderNPI>
          <evv:ServiceProviderID>${providerId}</evv:ServiceProviderID>
          <evv:RecipientMedicaidID>${r.recipient_id || ""}</evv:RecipientMedicaidID>
          <evv:ServiceTypeCode>${r.service_type || ""}</evv:ServiceTypeCode>
          <evv:ServiceDate>${r.service_date || ""}</evv:ServiceDate>
          <evv:ServiceStartTime>${r.service_start_time || ""}</evv:ServiceStartTime>
          <evv:ServiceEndTime>${r.service_end_time || ""}</evv:ServiceEndTime>
          <evv:ServiceLocation>${r.service_location || ""}</evv:ServiceLocation>
          <evv:ProviderNPI>${r.provider_id || ""}</evv:ProviderNPI>
          <evv:CaregiverID>${r.staff_id || ""}</evv:CaregiverID>
          <evv:RecordCreationDate>${r.record_creation_date || ""}</evv:RecordCreationDate>
        </evv:EVVRecord>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:evv="http://evv.medicaid.utah.gov/evv-api">
  <soapenv:Header>
    <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <wsse:BinarySecurityToken EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary" ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3">${certThumbprint}</wsse:BinarySecurityToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    <evv:EVVSubmissionRequest>
      <evv:SubmissionID>${submissionId}</evv:SubmissionID>
      <evv:SubmissionTimestamp>${new Date().toISOString()}</evv:SubmissionTimestamp>
      <evv:RecordCount>${records.length}</evv:RecordCount>
      <evv:EVVRecords>
${recordElements}
      </evv:EVVRecords>
    </evv:EVVSubmissionRequest>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Parse a SOAP acknowledgement response from the Utah EVV API.
 * Returns { accepted, batchId, rejectedRecords[] }.
 */
export function parseSoapAcknowledgement(responseText) {
  // Basic parsing of the SOAP acknowledgement response
  const batchIdMatch = responseText.match(/<evv:BatchID>(.*?)<\/evv:BatchID>/);
  const statusMatch = responseText.match(/<evv:SubmissionStatus>(.*?)<\/evv:SubmissionStatus>/);
  const recordResults = [];

  const recordRegex = /<evv:EVVRecordResult>([\s\S]*?)<\/evv:EVVRecordResult>/g;
  let match;
  while ((match = recordRegex.exec(responseText)) !== null) {
    const block = match[1];
    const seqMatch = block.match(/<evv:RecordSequence>(.*?)<\/evv:RecordSequence>/);
    const statusMatch2 = block.match(/<evv:Status>(.*?)<\/evv:Status>/);
    const reasonMatch = block.match(/<evv:RejectionReason>(.*?)<\/evv:RejectionReason>/);
    recordResults.push({
      sequence: seqMatch ? seqMatch[1] : "",
      status: statusMatch2 ? statusMatch2[1] : "",
      rejectionReason: reasonMatch ? reasonMatch[1] : "",
    });
  }

  return {
    accepted: statusMatch ? statusMatch[1] === "Accepted" : false,
    batchId: batchIdMatch ? batchIdMatch[1] : null,
    recordResults,
  };
}