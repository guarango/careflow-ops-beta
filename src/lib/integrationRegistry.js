/**
 * State EVV Integration Registry
 *
 * Pre-configured Electronic Visit Verification (EVV) integrations for state
 * Medicaid programs. Utah EVV (UEVV) is the first implementation per the
 * 21st Century Cures Act §12006.
 *
 * Each state EVV integration defines:
 *  - Submission methods (SOAP API, CSV portal, REST API)
 *  - Authentication requirements
 *  - Required EVV data elements (Cures Act mandated)
 *  - Field mappings from CareFlow's data model to the state's EVV format
 *  - HCPCS service codes that require EVV
 *
 * To add a new state: copy the Utah entry, update the endpoints/auth/methods,
 * and adjust field_mappings for the state's data format.
 */

export const INTEGRATION_CATEGORIES = {
  evv: { label: "State EVV", color: "bg-blue-100 text-blue-700" },
  custom: { label: "Custom API", color: "bg-slate-100 text-slate-700" },
};

// ── Cures Act Required EVV Data Elements ──────────────────────────────────
export const EVV_REQUIRED_ELEMENTS = [
  { key: "service_type", label: "Type of service performed", source_field: "service_code", description: "HCPCS code identifying the service" },
  { key: "recipient_id", label: "Individual receiving the service", source_field: "client_medicaid_id", description: "Client Medicaid ID" },
  { key: "service_date", label: "Date of the service", source_field: "shift_date", description: "Calendar date of service delivery" },
  { key: "service_location", label: "Location of service delivery", source_field: "service_location", description: "Address where service was provided" },
  { key: "provider_id", label: "Individual providing the service", source_field: "staff_npi", description: "NPI of the staff member providing care" },
  { key: "service_start_time", label: "Time the service begins", source_field: "evv_clock_in", description: "EVV-verified clock-in time (UTC)" },
  { key: "service_end_time", label: "Time the service ends", source_field: "evv_clock_out", description: "EVV-verified clock-out time (UTC)" },
  { key: "record_creation_date", label: "Date of electronic record creation", source_field: "system_timestamp", description: "When the EVV record was created in the system" },
];

// ── Utah EVV (UEVV) ───────────────────────────────────────────────────────
const UTAH_EVV = {
  key: "utah_evv",
  name: "Utah EVV (UEVV)",
  vendor: "Utah DHHS - BLTSS",
  category: "evv",
  description: "Electronic Visit Verification submission to Utah Medicaid. Required for all Personal Care Services (PCS) and Home Health Services (HHS) claims under the 21st Century Cures Act.",
  icon: "🏔️",
  tier: "all",
  requiresBaa: true,
  directions: ["outbound"],
  supports: ["evv_submission", "evv_correction"],
  // State-specific metadata
  state: "UT",
  state_name: "Utah",
  spec_version: "1.7",
  contact_email: "dmhf_evv@utah.gov",
  documentation_url: "https://medicaid.utah.gov/evv/",
  technical_spec_url: "https://medicaid-documents.dhhs.utah.gov/Documents/pdfs/BLTSS%20EVV_Technical_Specifications_v1.7.pdf",
  test_mode_supported: true,
  // Submission methods
  submission_methods: [
    {
      method: "soap",
      label: "SOAP API (Real-time)",
      endpoint: "https://evv.medicaid.utah.gov/evv-api/services/EVVSubmission",
      auth_type: "certificate",
      description: "Real-time SOAP message exchange with WS-Security. Requires digital certificate (X.509) for XML signature. Synchronous acknowledgement response.",
    },
    {
      method: "csv",
      label: "CSV Portal Upload",
      endpoint: "https://evv.medicaid.utah.gov/evvsubmit/",
      auth_type: "utah_id_sso",
      description: "Upload CSV files via the Utah EVV Portal. Requires UtahID SSO login. Recommended for batches > 2,000 records. Use the CSV template for column formatting.",
    },
  ],
  default_submission_method: "soap",
  // Required EVV data elements with field mappings
  field_mappings: [
    { element: "service_type", source_field: "service_code", transform: "hcpcs_code", required: true },
    { element: "recipient_id", source_field: "client_medicaid_id", transform: "direct", required: true },
    { element: "service_date", source_field: "shift_date", transform: "date_only", required: true },
    { element: "service_location", source_field: "house_address", transform: "format_address", required: true },
    { element: "provider_id", source_field: "staff_npi", transform: "direct", required: true },
    { element: "service_start_time", source_field: "evv_clock_in", transform: "to_utc_iso8601", required: true },
    { element: "service_end_time", source_field: "evv_clock_out", transform: "to_utc_iso8601", required: true },
    { element: "record_creation_date", source_field: "system_timestamp", transform: "to_utc_iso8601", required: true },
  ],
  // Utah HCPCS codes requiring EVV (from Utah Medicaid EVV documentation)
  evv_required_codes: [
    "T1019", "T1020", "T1021", "T1005", "T2017",
    "S5125", "S5126", "S5130", "S5135", "S5150", "S5151",
    "S5108", "S5115", "S5120",
    "G0151", "G0153", "G0238", "G0270", "G0299", "G0300",
    "S9122", "S9123", "S9124", "S9128", "S9129", "S9131",
    "T1000", "T1002", "T1003", "T1022", "T1027", "T1502",
  ],
  // Config fields for the integration
  fields: [
    { id: "provider_npi", label: "Agency NPI", type: "text", placeholder: "1234567890", required: true },
    { id: "provider_id", label: "Utah Medicaid Provider ID", type: "text", required: true },
    { id: "submission_method", label: "Default Submission Method", type: "select", options: [
      { value: "soap", label: "SOAP API (Real-time)" },
      { value: "csv", label: "CSV Portal Upload" },
    ], default: "soap" },
    { id: "api_endpoint", label: "SOAP API Endpoint", type: "text", default: "https://evv.medicaid.utah.gov/evv-api/services/EVVSubmission" },
    { id: "csv_portal_url", label: "CSV Portal URL", type: "text", default: "https://evv.medicaid.utah.gov/evvsubmit/" },
    { id: "certificate_thumbprint", label: "Digital Certificate Thumbprint", type: "text", placeholder: "X.509 certificate thumbprint for SOAP WS-Security" },
    { id: "certificate_expiry", label: "Certificate Expiry Date", type: "date" },
    { id: "test_mode", label: "Test Mode (submit to test environment)", type: "boolean", default: false },
  ],
};

// ── Custom State EVV Template ─────────────────────────────────────────────
const CUSTOM_STATE_EVV = {
  key: "custom_state_evv",
  name: "Custom State EVV",
  vendor: "State Medicaid",
  category: "custom",
  description: "Configure a custom EVV integration for a state not yet pre-configured. Define the API endpoint, authentication method, and field mappings per the state's technical specifications.",
  icon: "🔌",
  tier: "all",
  requiresBaa: true,
  directions: ["outbound"],
  supports: ["evv_submission"],
  state: "CUSTOM",
  state_name: "Custom",
  spec_version: null,
  test_mode_supported: true,
  submission_methods: [
    {
      method: "api",
      label: "API (REST/SOAP)",
      endpoint: "",
      auth_type: "api_key",
      description: "Configure the API endpoint and authentication method per the state's technical specifications.",
    },
  ],
  default_submission_method: "api",
  field_mappings: EVV_REQUIRED_ELEMENTS.map(e => ({ element: e.key, source_field: e.source_field, transform: "direct", required: true })),
  evv_required_codes: [],
  fields: [
    { id: "state_code", label: "State Code (e.g. CO, AZ)", type: "text", placeholder: "CO", required: true },
    { id: "provider_npi", label: "Agency NPI", type: "text", required: true },
    { id: "provider_id", label: "State Medicaid Provider ID", type: "text", required: true },
    { id: "submission_method", label: "Submission Method", type: "select", options: [
      { value: "soap", label: "SOAP API" },
      { value: "rest", label: "REST API" },
      { value: "csv", label: "CSV Upload" },
    ], default: "rest" },
    { id: "api_endpoint", label: "API Endpoint URL", type: "text", placeholder: "https://..." },
    { id: "auth_type", label: "Authentication Method", type: "select", options: [
      { value: "certificate", label: "Digital Certificate (X.509)" },
      { value: "oauth", label: "OAuth 2.0" },
      { value: "api_key", label: "API Key" },
      { value: "basic", label: "Basic Auth (Username/Password)" },
    ], default: "api_key" },
    { id: "api_key", label: "API Key / Token", type: "password" },
    { id: "test_mode", label: "Test Mode", type: "boolean", default: false },
  ],
};

// ── Exports ───────────────────────────────────────────────────────────────
export const INTEGRATIONS = [UTAH_EVV, CUSTOM_STATE_EVV];

export function getIntegration(key) {
  return INTEGRATIONS.find(i => i.key === key);
}

export function getIntegrationsByCategory(category) {
  return INTEGRATIONS.filter(i => i.category === category);
}

export function getEVVStates() {
  return INTEGRATIONS.filter(i => i.category === "evv");
}