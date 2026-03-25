/**
 * Static registry of all available integrations.
 * Each entry defines metadata, config fields, and default field mappings.
 * New integrations are added here without requiring a platform redeploy.
 */

export const INTEGRATION_CATEGORIES = {
  mmis: { label: "State MMIS / Medicaid", color: "bg-blue-100 text-blue-700" },
  ehr: { label: "Electronic Health Records", color: "bg-purple-100 text-purple-700" },
  payroll: { label: "Payroll", color: "bg-green-100 text-green-700" },
  accounting: { label: "Accounting", color: "bg-emerald-100 text-emerald-700" },
  background_check: { label: "Background Check", color: "bg-orange-100 text-orange-700" },
  lms: { label: "Learning Management", color: "bg-pink-100 text-pink-700" },
  communication: { label: "Communication", color: "bg-cyan-100 text-cyan-700" },
  document: { label: "Document Storage", color: "bg-slate-100 text-slate-700" },
  fax: { label: "Electronic Fax", color: "bg-amber-100 text-amber-700" },
  other: { label: "Other", color: "bg-gray-100 text-gray-700" },
};

export const INTEGRATIONS = [
  // ── MMIS ─────────────────────────────────────────────────────────────────
  {
    key: "utah_umap", name: "Utah UMAP", vendor: "Utah MMIS", category: "mmis",
    description: "Real-time eligibility verification, claims submission, and PA status inquiry via the Utah Medicaid Access Portal.",
    icon: "🏔️", tier: "all", requiresBaa: true,
    fields: [
      { id: "api_endpoint", label: "API Endpoint", type: "text", default: "https://umap.utah.gov/api/v1" },
      { id: "provider_id", label: "Medicaid Provider ID", type: "text" },
      { id: "api_key", label: "API Key", type: "password" },
    ],
    directions: ["inbound", "outbound"],
    supports: ["eligibility_270_271", "claims_837", "pa_278"],
  },
  {
    key: "colorado_interchange", name: "Colorado interChange", vendor: "Colorado MMIS", category: "mmis",
    description: "Eligibility verification and claims submission via Colorado interChange.",
    icon: "🏔️", tier: "all", requiresBaa: true,
    fields: [
      { id: "submitter_id", label: "Submitter ID", type: "text" },
      { id: "api_key", label: "API Key", type: "password" },
    ],
    directions: ["inbound", "outbound"],
    supports: ["eligibility_270_271", "claims_837"],
  },
  {
    key: "texas_tmhp", name: "Texas TMHP", vendor: "TMHP", category: "mmis",
    description: "Eligibility verification, prior authorization, and claims submission via Texas Medicaid & Healthcare Partnership.",
    icon: "⭐", tier: "all", requiresBaa: true,
    fields: [
      { id: "provider_npi", label: "Provider NPI", type: "text" },
      { id: "submitter_id", label: "TMHP Submitter ID", type: "text" },
      { id: "api_key", label: "API Key", type: "password" },
    ],
    directions: ["inbound", "outbound"],
    supports: ["eligibility_270_271", "claims_837", "pa_278"],
  },
  {
    key: "ohio_medicaid", name: "Ohio Medicaid (MITS)", vendor: "Ohio MMIS", category: "mmis",
    description: "Eligibility verification via Ohio MITS portal and EVV data submission via Sandata.",
    icon: "🌻", tier: "all", requiresBaa: true,
    fields: [
      { id: "provider_id", label: "Ohio Provider ID", type: "text" },
      { id: "sandata_token", label: "Sandata EVV Token", type: "password" },
      { id: "mits_api_key", label: "MITS API Key", type: "password" },
    ],
    directions: ["inbound", "outbound"],
    supports: ["eligibility_270_271", "evv"],
  },
  {
    key: "ny_emednY", name: "New York eMedNY", vendor: "eMedNY", category: "mmis",
    description: "Eligibility verification, claims submission, and OPWDD service documentation exchange.",
    icon: "🗽", tier: "all", requiresBaa: true,
    fields: [
      { id: "provider_npi", label: "Provider NPI", type: "text" },
      { id: "submitter_id", label: "eMedNY Submitter ID", type: "text" },
      { id: "api_key", label: "API Key", type: "password" },
    ],
    directions: ["inbound", "outbound"],
    supports: ["eligibility_270_271", "claims_837"],
  },
  {
    key: "florida_medicaid", name: "Florida Medicaid", vendor: "ACS/Conduent", category: "mmis",
    description: "Eligibility verification and claims submission via ACS/Conduent Florida Medicaid.",
    icon: "🌴", tier: "all", requiresBaa: true,
    fields: [
      { id: "provider_id", label: "Florida Provider ID", type: "text" },
      { id: "conduent_api_key", label: "Conduent API Key", type: "password" },
    ],
    directions: ["inbound", "outbound"],
    supports: ["eligibility_270_271", "claims_837"],
  },
  {
    key: "california_medi_cal", name: "California Medi-Cal", vendor: "Availity", category: "mmis",
    description: "Eligibility verification and claims submission via CAREWare and Availity.",
    icon: "🌅", tier: "all", requiresBaa: true,
    fields: [
      { id: "availity_org_id", label: "Availity Org ID", type: "text" },
      { id: "availity_api_key", label: "Availity API Key", type: "password" },
    ],
    directions: ["inbound", "outbound"],
    supports: ["eligibility_270_271", "claims_837"],
  },

  // ── EHR ──────────────────────────────────────────────────────────────────
  {
    key: "epic_fhir", name: "Epic (FHIR R4)", vendor: "Epic Systems", category: "ehr",
    description: "Bidirectional patient demographics, medication lists, and care plan exchange via HL7 FHIR R4.",
    icon: "🏥", tier: "professional_enterprise", requiresBaa: true,
    fields: [
      { id: "fhir_base_url", label: "FHIR Base URL", type: "text", placeholder: "https://yourorg.epic.com/api/FHIR/R4" },
      { id: "client_id", label: "OAuth Client ID", type: "text" },
      { id: "client_secret", label: "OAuth Client Secret", type: "password" },
    ],
    directions: ["inbound", "outbound"],
    supports: ["fhir_patient", "fhir_medication", "fhir_careplan"],
  },
  {
    key: "cerner_fhir", name: "Cerner / Oracle Health", vendor: "Oracle Health", category: "ehr",
    description: "Bidirectional patient demographics and medication exchange via Cerner FHIR R4 API.",
    icon: "🏥", tier: "professional_enterprise", requiresBaa: true,
    fields: [
      { id: "fhir_base_url", label: "FHIR Base URL", type: "text" },
      { id: "client_id", label: "Client ID", type: "text" },
      { id: "client_secret", label: "Client Secret", type: "password" },
    ],
    directions: ["inbound", "outbound"],
    supports: ["fhir_patient", "fhir_medication"],
  },
  {
    key: "pointclickcare", name: "PointClickCare", vendor: "PointClickCare", category: "ehr",
    description: "Bidirectional resident demographics, medication administration, and incident exchange for residential facilities.",
    icon: "🏠", tier: "professional_enterprise", requiresBaa: true,
    fields: [
      { id: "pcc_org_uuid", label: "PCC Organization UUID", type: "text" },
      { id: "client_id", label: "Client ID", type: "text" },
      { id: "client_secret", label: "Client Secret", type: "password" },
    ],
    directions: ["inbound", "outbound"],
    supports: ["fhir_patient", "fhir_medication", "incidents"],
  },
  {
    key: "netsmart_myavatar", name: "Netsmart myAvatar", vendor: "Netsmart Technologies", category: "ehr",
    description: "Bidirectional client demographics, treatment plans, and service documentation exchange.",
    icon: "🧠", tier: "enterprise_only", requiresBaa: true,
    fields: [
      { id: "api_base_url", label: "myAvatar API Base URL", type: "text" },
      { id: "api_username", label: "API Username", type: "text" },
      { id: "api_password", label: "API Password", type: "password" },
    ],
    directions: ["inbound", "outbound"],
    supports: ["fhir_patient", "fhir_careplan", "service_docs"],
  },
  {
    key: "welligent", name: "Welligent", vendor: "Welligent", category: "ehr",
    description: "Bidirectional client records and service documentation exchange.",
    icon: "💊", tier: "enterprise_only", requiresBaa: true,
    fields: [
      { id: "api_base_url", label: "Welligent API URL", type: "text" },
      { id: "api_key", label: "API Key", type: "password" },
    ],
    directions: ["inbound", "outbound"],
    supports: ["fhir_patient", "service_docs"],
  },

  // ── PAYROLL ───────────────────────────────────────────────────────────────
  {
    key: "adp_workforce", name: "ADP Workforce Now", vendor: "ADP", category: "payroll",
    description: "Export approved timecards and import payroll confirmations. Supports pay rate changes and overtime data.",
    icon: "💰", tier: "professional_enterprise", requiresBaa: false,
    fields: [
      { id: "client_id", label: "ADP Client ID", type: "text" },
      { id: "client_secret", label: "Client Secret", type: "password" },
      { id: "company_code", label: "Company Code", type: "text" },
    ],
    directions: ["outbound", "inbound"],
    supports: ["timecards", "payroll_confirmation"],
  },
  {
    key: "paychex_flex", name: "Paychex Flex", vendor: "Paychex", category: "payroll",
    description: "Bidirectional timecard export and payroll confirmation import.",
    icon: "💰", tier: "professional_enterprise", requiresBaa: false,
    fields: [
      { id: "client_id", label: "Paychex Client ID", type: "text" },
      { id: "client_secret", label: "Client Secret", type: "password" },
      { id: "account_id", label: "Account ID", type: "text" },
    ],
    directions: ["outbound", "inbound"],
    supports: ["timecards", "payroll_confirmation"],
  },
  {
    key: "gusto", name: "Gusto", vendor: "Gusto", category: "payroll",
    description: "Timecard export, payroll confirmation import, and benefits administration data exchange.",
    icon: "🌿", tier: "all", requiresBaa: false,
    fields: [
      { id: "api_token", label: "Gusto API Token", type: "password" },
      { id: "company_id", label: "Company ID", type: "text" },
    ],
    directions: ["outbound", "inbound"],
    supports: ["timecards", "payroll_confirmation", "benefits"],
  },
  {
    key: "quickbooks_payroll", name: "QuickBooks Payroll", vendor: "Intuit", category: "payroll",
    description: "Export approved timecards and import payroll confirmations via QuickBooks Payroll.",
    icon: "📗", tier: "all", requiresBaa: false,
    fields: [
      { id: "client_id", label: "QB Client ID", type: "text" },
      { id: "client_secret", label: "Client Secret", type: "password" },
      { id: "realm_id", label: "Realm (Company) ID", type: "text" },
    ],
    directions: ["outbound", "inbound"],
    supports: ["timecards", "payroll_confirmation"],
  },

  // ── ACCOUNTING ────────────────────────────────────────────────────────────
  {
    key: "quickbooks_online", name: "QuickBooks Online", vendor: "Intuit", category: "accounting",
    description: "Export invoices, payments, and payroll journal entries. Import vendor bills and expenses.",
    icon: "📗", tier: "all", requiresBaa: false,
    fields: [
      { id: "client_id", label: "QB Client ID", type: "text" },
      { id: "client_secret", label: "Client Secret", type: "password" },
      { id: "realm_id", label: "Realm ID", type: "text" },
    ],
    directions: ["outbound", "inbound"],
    supports: ["invoices", "payments", "journal_entries"],
  },
  {
    key: "xero", name: "Xero", vendor: "Xero", category: "accounting",
    description: "Export invoices, payments, and payroll journal entries. Import vendor bills and expenses.",
    icon: "🔵", tier: "all", requiresBaa: false,
    fields: [
      { id: "client_id", label: "Xero Client ID", type: "text" },
      { id: "client_secret", label: "Client Secret", type: "password" },
      { id: "tenant_id", label: "Tenant ID", type: "text" },
    ],
    directions: ["outbound", "inbound"],
    supports: ["invoices", "payments", "journal_entries"],
  },
  {
    key: "sage_intacct", name: "Sage Intacct", vendor: "Sage", category: "accounting",
    description: "Full accounting sync with program-level cost center support for multi-program DD agencies.",
    icon: "💼", tier: "professional_enterprise", requiresBaa: false,
    fields: [
      { id: "company_id", label: "Sage Company ID", type: "text" },
      { id: "user_id", label: "API User ID", type: "text" },
      { id: "user_password", label: "API User Password", type: "password" },
      { id: "sender_id", label: "Sender ID", type: "text" },
      { id: "sender_password", label: "Sender Password", type: "password" },
    ],
    directions: ["outbound", "inbound"],
    supports: ["invoices", "payments", "journal_entries", "cost_centers"],
  },
  {
    key: "netsuite", name: "NetSuite", vendor: "Oracle", category: "accounting",
    description: "Full accounting sync with multi-entity consolidation for enterprise agency groups.",
    icon: "🔶", tier: "enterprise_only", requiresBaa: false,
    fields: [
      { id: "account_id", label: "NetSuite Account ID", type: "text" },
      { id: "consumer_key", label: "Consumer Key", type: "text" },
      { id: "consumer_secret", label: "Consumer Secret", type: "password" },
      { id: "token_id", label: "Token ID", type: "text" },
      { id: "token_secret", label: "Token Secret", type: "password" },
    ],
    directions: ["outbound", "inbound"],
    supports: ["invoices", "payments", "journal_entries", "multi_entity"],
  },

  // ── BACKGROUND CHECK ──────────────────────────────────────────────────────
  {
    key: "sterling", name: "Sterling", vendor: "Sterling", category: "background_check",
    description: "Initiate and receive background checks directly from staff HR profiles. Auto-updates HR module on completion.",
    icon: "🔍", tier: "all", requiresBaa: true,
    fields: [
      { id: "account_id", label: "Sterling Account ID", type: "text" },
      { id: "api_key", label: "API Key", type: "password" },
    ],
    directions: ["outbound", "inbound"],
    supports: ["background_check_orders", "results"],
  },
  {
    key: "checkr", name: "Checkr", vendor: "Checkr", category: "background_check",
    description: "Initiate and receive background checks. Configurable screening criteria with auto-flagging.",
    icon: "✅", tier: "all", requiresBaa: true,
    fields: [
      { id: "api_key", label: "Checkr API Key", type: "password" },
      { id: "package_slug", label: "Default Package", type: "text", placeholder: "tasker_standard" },
    ],
    directions: ["outbound", "inbound"],
    supports: ["background_check_orders", "results"],
  },
  {
    key: "intellicheck", name: "IntelliCheck", vendor: "IntelliCheck", category: "background_check",
    description: "Background checks with state-specific DD provider requirements and ID verification.",
    icon: "🔎", tier: "all", requiresBaa: true,
    fields: [
      { id: "api_key", label: "API Key", type: "password" },
      { id: "account_code", label: "Account Code", type: "text" },
    ],
    directions: ["outbound", "inbound"],
    supports: ["background_check_orders", "results", "id_verification"],
  },
  {
    key: "oig_exclusion", name: "OIG Exclusion List", vendor: "U.S. DHHS OIG", category: "background_check",
    description: "Monthly automated screening of all staff against the federal OIG exclusion list. Medicaid compliance requirement.",
    icon: "🏛️", tier: "all", requiresBaa: false,
    fields: [
      { id: "alert_email", label: "Alert Email", type: "text" },
    ],
    directions: ["inbound"],
    supports: ["exclusion_screening"],
  },
  {
    key: "sam_gov", name: "SAM.gov Exclusion", vendor: "GSA", category: "background_check",
    description: "Federal exclusion screening via System for Award Management (SAM.gov).",
    icon: "🏛️", tier: "all", requiresBaa: false,
    fields: [
      { id: "api_key", label: "SAM.gov API Key", type: "password" },
    ],
    directions: ["inbound"],
    supports: ["exclusion_screening"],
  },
  {
    key: "nursys", name: "NURSYS License Verify", vendor: "NCSBN", category: "background_check",
    description: "Real-time nursing license verification via the NURSYS database. Triggers alerts on license status changes.",
    icon: "🩺", tier: "all", requiresBaa: false,
    fields: [
      { id: "api_key", label: "NURSYS API Key", type: "password" },
    ],
    directions: ["inbound"],
    supports: ["license_verification"],
  },

  // ── LMS ───────────────────────────────────────────────────────────────────
  {
    key: "relias", name: "Relias", vendor: "Relias", category: "lms",
    description: "Bidirectional course completions, certification records, and training assignments with the leading DD/behavioral health LMS.",
    icon: "📚", tier: "all", requiresBaa: true,
    fields: [
      { id: "subdomain", label: "Relias Subdomain", type: "text", placeholder: "yourorg" },
      { id: "api_key", label: "API Key", type: "password" },
    ],
    directions: ["inbound", "outbound"],
    supports: ["course_completions", "certifications", "assignments"],
  },
  {
    key: "cornerstone", name: "Cornerstone OnDemand", vendor: "Cornerstone", category: "lms",
    description: "Bidirectional training completion and certification sync.",
    icon: "🎓", tier: "professional_enterprise", requiresBaa: true,
    fields: [
      { id: "subdomain", label: "Cornerstone Subdomain", type: "text" },
      { id: "api_key", label: "API Key", type: "password" },
      { id: "corp_name", label: "Corp Name", type: "text" },
    ],
    directions: ["inbound", "outbound"],
    supports: ["course_completions", "certifications"],
  },
  {
    key: "talentlms", name: "TalentLMS", vendor: "TalentLMS", category: "lms",
    description: "Bidirectional training completion and certification sync.",
    icon: "🎓", tier: "all", requiresBaa: true,
    fields: [
      { id: "subdomain", label: "TalentLMS Subdomain", type: "text" },
      { id: "api_key", label: "API Key", type: "password" },
    ],
    directions: ["inbound", "outbound"],
    supports: ["course_completions", "certifications"],
  },
  {
    key: "moodle", name: "Moodle LMS", vendor: "Moodle", category: "lms",
    description: "Bidirectional training completion and certification sync for agencies using open-source Moodle.",
    icon: "📖", tier: "all", requiresBaa: true,
    fields: [
      { id: "site_url", label: "Moodle Site URL", type: "text" },
      { id: "token", label: "Web Service Token", type: "password" },
    ],
    directions: ["inbound", "outbound"],
    supports: ["course_completions", "certifications"],
  },

  // ── COMMUNICATION ─────────────────────────────────────────────────────────
  {
    key: "google_calendar", name: "Google Calendar", vendor: "Google", category: "communication",
    description: "Bidirectional staff schedule sync. Shifts appear on staff Google Calendar. Staff opt-in from mobile profile.",
    icon: "📅", tier: "all", requiresBaa: false,
    fields: [
      { id: "oauth_client_id", label: "OAuth Client ID", type: "text" },
      { id: "oauth_client_secret", label: "OAuth Client Secret", type: "password" },
    ],
    directions: ["inbound", "outbound"],
    supports: ["schedule_sync", "time_off"],
  },
  {
    key: "outlook_calendar", name: "Microsoft Outlook Calendar", vendor: "Microsoft", category: "communication",
    description: "Bidirectional staff schedule sync via Microsoft 365. Staff opt-in from mobile profile.",
    icon: "📅", tier: "all", requiresBaa: false,
    fields: [
      { id: "tenant_id", label: "Azure Tenant ID", type: "text" },
      { id: "client_id", label: "App Client ID", type: "text" },
      { id: "client_secret", label: "Client Secret", type: "password" },
    ],
    directions: ["inbound", "outbound"],
    supports: ["schedule_sync", "time_off"],
  },
  {
    key: "zoom", name: "Zoom", vendor: "Zoom", category: "communication",
    description: "Schedule and launch Zoom meetings for supervision, team meetings, and telehealth visits from CareOps Pro.",
    icon: "📹", tier: "professional_enterprise", requiresBaa: true,
    fields: [
      { id: "account_id", label: "Zoom Account ID", type: "text" },
      { id: "client_id", label: "Client ID", type: "text" },
      { id: "client_secret", label: "Client Secret", type: "password" },
    ],
    directions: ["outbound"],
    supports: ["meetings"],
  },
  {
    key: "ms_teams", name: "Microsoft Teams", vendor: "Microsoft", category: "communication",
    description: "Schedule and launch Teams meetings for supervision, team meetings, and support visits.",
    icon: "💬", tier: "professional_enterprise", requiresBaa: true,
    fields: [
      { id: "tenant_id", label: "Azure Tenant ID", type: "text" },
      { id: "client_id", label: "App Client ID", type: "text" },
      { id: "client_secret", label: "Client Secret", type: "password" },
    ],
    directions: ["outbound"],
    supports: ["meetings"],
  },

  // ── DOCUMENT STORAGE ─────────────────────────────────────────────────────
  {
    key: "google_drive", name: "Google Drive", vendor: "Google", category: "document",
    description: "Automatically save completed audit packages, signed documents, and exported reports to Google Drive.",
    icon: "💾", tier: "all", requiresBaa: false,
    fields: [
      { id: "oauth_client_id", label: "OAuth Client ID", type: "text" },
      { id: "oauth_client_secret", label: "Client Secret", type: "password" },
      { id: "target_folder_id", label: "Target Folder ID", type: "text" },
    ],
    directions: ["outbound"],
    supports: ["document_archive"],
  },
  {
    key: "sharepoint_onedrive", name: "SharePoint / OneDrive", vendor: "Microsoft", category: "document",
    description: "Automatically save completed documents and reports to SharePoint or OneDrive.",
    icon: "💾", tier: "all", requiresBaa: false,
    fields: [
      { id: "tenant_id", label: "Azure Tenant ID", type: "text" },
      { id: "client_id", label: "App Client ID", type: "text" },
      { id: "client_secret", label: "Client Secret", type: "password" },
      { id: "site_url", label: "SharePoint Site URL", type: "text" },
    ],
    directions: ["outbound"],
    supports: ["document_archive"],
  },

  // ── FAX ───────────────────────────────────────────────────────────────────
  {
    key: "efax", name: "eFax / Sfax", vendor: "eFax Corporate", category: "fax",
    description: "Send and receive HIPAA-compliant electronic faxes directly from CareOps Pro. Inbound faxes route to a CareOps inbox.",
    icon: "📠", tier: "all", requiresBaa: true,
    fields: [
      { id: "api_key", label: "eFax API Key", type: "password" },
      { id: "fax_number", label: "Inbound Fax Number", type: "text", placeholder: "+18005551234" },
      { id: "account_id", label: "Account ID", type: "text" },
    ],
    directions: ["inbound", "outbound"],
    supports: ["fax_send", "fax_receive"],
  },
];

export function getIntegration(key) {
  return INTEGRATIONS.find(i => i.key === key);
}

export function getIntegrationsByCategory(category) {
  return INTEGRATIONS.filter(i => i.category === category);
}