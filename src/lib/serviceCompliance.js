import { Home, Sun, Briefcase, Stethoscope, HeartHandshake, Brain, FileText } from "lucide-react";

export const SUMMARY_CADENCES = ["Quarterly", "Monthly", "Monthly Financial Statement", "None"];
export const SUPPORT_STRATEGY_TYPES = ["Standard", "Behavior Support Plan", "Medical Care Plan"];

/** Fields that carry a state rule — changing any of them requires a reason and an audit entry. */
export const COMPLIANCE_FIELDS = [
  "summary_cadence",
  "support_strategy_required",
  "support_strategy_type",
  "goal_progress_required_in_summary",
  "daily_note_required",
  "annual_report_required",
  "is_evv_required",
  "state",
  "rule_source",
  "rule_confirmed",
  "source_reference",
  "compliance_rules",
];

export const FIELD_LABELS = {
  summary_cadence: "Summary cadence",
  support_strategy_required: "Support strategy required",
  support_strategy_type: "Support strategy type",
  goal_progress_required_in_summary: "Goal progress in summary",
  daily_note_required: "Daily note required",
  annual_report_required: "Annual report required",
  is_evv_required: "EVV required",
  state: "State",
  rule_source: "Rule source",
  rule_confirmed: "Rule confirmed",
  source_reference: "Source reference",
  compliance_rules: "State rules",
};

export const UTAH_DSPD_CODES = [
  "BC1", "BC2", "BC3", "COM", "DSG", "DSP", "DSI", "EPR", "ELS", "HHS",
  "HSQ", "MTP", "PAC", "PBA", "PM1", "PM2", "PN1", "PN2", "PPS", "RHS",
  "RP2", "RP3", "RP4", "RP5", "RPS", "SEC", "SED", "SEE", "SEI", "SJD",
  "SJP", "SJR", "SLH", "SLN", "CMP", "CMS", "TFB",
];

const MONTHLY = new Set(["CMP", "CMS", "SLN", "PN1", "PN2", "SEI", "SJD"]);
const MONTHLY_FINANCIAL = new Set(["PBA"]);
const NO_STRATEGY = new Set(["ELS", "MTP", "PBA", "PM1", "PM2", "RP2", "RP3", "RP4", "RP5", "RPS"]);
const BSP_CODES = new Set(["BC1", "BC2", "BC3"]);
const MEDICAL_PLAN_CODES = new Set(["PN1", "PN2"]);
const ANNUAL_REPORT_CODES = new Set(["COM", "DSG", "DSP", "DSI", "EPR", "HHS"]);
const EVV_ON = new Set(["COM", "HSQ", "PAC", "RP2", "RP3", "SLH", "SLN", "CMP", "CMS"]);
const EVV_OFF = new Set(["RP4", "RP5", "RPS", "RHS"]);
const UNCONFIRMED = new Set(["SJP", "SJR", "TFB", "SLN", "CMP", "CMS", "SLH"]);

/** Verified RHS rules (DHHS91172 SOW, Article 21). Each rule is confirmed on its own. */
export const RHS_SOURCE_REFERENCE =
  "DHHS91172 SOW §1.25 (quarterly summary) and §21.3(6) (evacuation drills)";

const RHS_RULES = [
  {
    key: "quarterly_summary",
    label: "Quarterly summary",
    cadence: "Quarterly",
    detail:
      "Due to the Person's Support Coordinator within 15 calendar days after quarter end. Must include progress toward each goal. RHS is not on the §1.25 exemption list.",
    rule_confirmed: true,
    source_reference: "DHHS91172 SOW §1.25 (quarterly summary)",
  },
  {
    key: "quarterly_evacuation_drills",
    label: "Quarterly evacuation drills",
    cadence: "Quarterly",
    detail: "One documented drill per quarter at each RHS site, with Persons and Staff.",
    rule_confirmed: true,
    source_reference: "DHHS91172 SOW §21.3(6) (evacuation drills)",
  },
  {
    key: "daily_summary_note",
    label: "Daily summary note",
    cadence: "Every billed day",
    detail: "Daily summary note for every billed day, including the Staff name and the service code RHS.",
    rule_confirmed: true,
    source_reference: "DHHS91172 SOW §21.3(9)",
  },
  {
    key: "form_930_enhanced_staffing",
    label: "Form 930 before enhanced staffing",
    cadence: "Before enhanced staffing",
    detail: "Form 930 completed before any enhanced staffing, defined as 4 or more hours a day of 1:1 Staff.",
    rule_confirmed: true,
    source_reference: "DHHS91172 SOW §21.3(4)",
  },
  {
    key: "belongings_inventory",
    label: "Belongings inventory",
    cadence: "On file",
    detail: "Belongings inventory in the Person's file, covering items valued at $50 or more, plus the completion date and Staff name. Discarded items need a reason and the Person's or guardian's signature.",
    rule_confirmed: true,
    source_reference: "DHHS91172 SOW §21.3(7)",
  },
  {
    key: "lease_or_agreement",
    label: "Lease or legally enforceable agreement",
    cadence: "On file",
    detail: "Lease or legally enforceable agreement on file for each Person.",
    rule_confirmed: true,
    source_reference: "DHHS91172 SOW §21.3(1)",
  },
  {
    key: "absence_day_tracking",
    label: "Absence-day tracking",
    cadence: "Per absence day",
    detail: "Log the date and reason for each absence day. When the built-in days run out, allow ELS billing and send the documentation to the Support Coordinator.",
    rule_confirmed: true,
    source_reference: "DHHS91172 SOW §21.3(3)",
  },
  {
    key: "housing_voucher_steps",
    label: "Housing voucher steps",
    cadence: "Ongoing",
    detail: "Complete the housing voucher steps.",
    rule_confirmed: true,
    source_reference: "DHHS91172 SOW §21.3(8)",
  },
  {
    key: "licensing_threshold",
    label: "Residential Support licensing",
    cadence: "Per site",
    detail: "A Residential Support license for 4 or more Persons at a location; certification for 3 or fewer.",
    rule_confirmed: true,
    source_reference: "DHHS91172 SOW §21.5",
  },
  {
    key: "housemate_change_discussion",
    label: "Housemate change discussion",
    cadence: "Per housemate change",
    detail: "Written informed discussion required on or after 2026-07-01.",
    rule_confirmed: true,
    source_reference: "DHHS91172 SOW §1.35",
  },
  {
    key: "annual_fiscal_year_report",
    label: "Annual fiscal-year report",
    cadence: "Annual",
    detail: "Annual fiscal-year report due August 30.",
    rule_confirmed: true,
    source_reference: "DHHS91172 SOW §21.6",
  },
];

/** Utah DSPD defaults for one code. `undefined` values are left untouched on seed. */
export function utahRulesFor(rawCode) {
  const code = (rawCode || "").trim().toUpperCase();
  const exempt = NO_STRATEGY.has(code);
  const annual = ANNUAL_REPORT_CODES.has(code);
  const rules = {
    summary_cadence: MONTHLY.has(code)
      ? "Monthly"
      : MONTHLY_FINANCIAL.has(code)
        ? "Monthly Financial Statement"
        : "Quarterly",
    support_strategy_required: !exempt,
    support_strategy_type: exempt
      ? null
      : BSP_CODES.has(code)
        ? "Behavior Support Plan"
        : MEDICAL_PLAN_CODES.has(code)
          ? "Medical Care Plan"
          : "Standard",
    goal_progress_required_in_summary: !NO_STRATEGY.has(code),
    daily_note_required: true,
    annual_report_required: annual,
    state: "UT",
    rule_source: EVV_ON.has(code) ? "DHHS91172 SOW 1.12" : "DHHS91172 SOW 1.25",
    rule_confirmed: !(UNCONFIRMED.has(code) || (annual && !ANNUAL_REPORT_CODES.has(code))),
  };
  if (EVV_ON.has(code)) rules.is_evv_required = true;
  if (EVV_OFF.has(code)) rules.is_evv_required = false;
  if (code === "RHS") {
    rules.source_reference = RHS_SOURCE_REFERENCE;
    rules.compliance_rules = RHS_RULES;
  }
  return rules;
}

export const CODE_CATEGORIES = [
  { key: "residential", label: "Residential & In-Home", icon: Home, codes: ["RHS", "SLH", "SLN", "CMP", "CMS", "HHS", "PPS", "COM", "HSQ", "PAC"] },
  { key: "day", label: "Day Supports", icon: Sun, codes: ["DSG", "DSP", "DSI", "ELS"] },
  { key: "employment", label: "Employment", icon: Briefcase, codes: ["SEC", "SED", "SEE", "SEI", "SJD", "SJP", "SJR", "EPR"] },
  { key: "nursing", label: "Nursing & Medication", icon: Stethoscope, codes: ["PN1", "PN2", "PM1", "PM2"] },
  { key: "respite", label: "Respite", icon: HeartHandshake, codes: ["RP2", "RP3", "RP4", "RP5", "RPS"] },
  { key: "behavioral", label: "Behavioral Support", icon: Brain, codes: ["BC1", "BC2", "BC3"] },
  { key: "other", label: "Administrative & Other", icon: FileText, codes: ["TFB", "MTP", "PBA"] },
];

const OTHER_CATEGORY = CODE_CATEGORIES[CODE_CATEGORIES.length - 1];

export function categoryFor(rawCode) {
  const code = (rawCode || "").trim().toUpperCase();
  const match = CODE_CATEGORIES.find((c) => c.codes.includes(code));
  return match || { ...OTHER_CATEGORY, key: "other", label: "Other" };
}

export function cadenceChipClass(cadence) {
  switch (cadence) {
    case "Quarterly":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "Monthly":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Monthly Financial Statement":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}