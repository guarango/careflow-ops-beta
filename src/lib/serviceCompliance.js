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
const EVV_ON = new Set(["COM", "HSQ", "PAC", "RP2", "RP3", "SLH"]);
const EVV_OFF = new Set(["RP4", "RP5", "RPS"]);
const UNCONFIRMED = new Set(["RHS", "SJP", "SJR", "TFB", "SLN", "CMP", "CMS"]);

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