/**
 * Notification Rule Catalog — Default rules seeded for every agency.
 * One record per event. All defaults are defined here so "Reset to recommended defaults"
 * can restore them.
 *
 * Categories:
 * 1. client_safety    — Client & Safety
 * 2. medication        — Medication
 * 3. charting          — Charting
 * 4. shifts_evv        — Shifts, EVV & Timecards
 * 5. staff_compliance  — Staff Compliance
 * 6. hr_team           — HR & Team
 *
 * Recipient role keys: dsp_on_shift, assigned_dsps, client_manager, house_manager, admin, hr_bundle, billing_bundle, self
 * Severity: critical, action, fyi
 */

export const CATEGORIES = [
  { key: "client_safety",    label: "Client & Safety",              icon: "ShieldCheck" },
  { key: "medication",        label: "Medication",                    icon: "Pill" },
  { key: "charting",          label: "Charting",                      icon: "FileText" },
  { key: "shifts_evv",        label: "Shifts, EVV & Timecards",       icon: "Clock" },
  { key: "staff_compliance",  label: "Staff Compliance",              icon: "BadgeCheck" },
  { key: "hr_team",           label: "HR & Team",                     icon: "Users" },
];

export const RECIPIENT_LABELS = {
  dsp_on_shift:    "DSP on shift",
  assigned_dsps:   "Assigned DSPs",
  client_manager: "Client's Manager",
  house_manager:  "House Manager",
  admin:           "Admin",
  hr_bundle:      "HR bundle",
  billing_bundle: "Billing",
  self:           "The staff member",
};

export const SEVERITY_CONFIG = {
  critical: { label: "Critical",        color: "bg-red-100 text-red-700 border-red-200",    dot: "bg-red-500" },
  action:   { label: "Action Required", color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  fyi:      { label: "FYI",             color: "bg-gray-100 text-gray-600 border-gray-200",   dot: "bg-gray-400" },
};

export const DEFAULT_RULES = [
  // ─── 4.1 Client & Safety ───
  { event_key: "critical_incident", label: "Critical incident", description: "Incident submitted with severity High/Critical (ER visit, abuse/neglect, police, elopement, death, serious injury)", category: "client_safety", severity: "critical", is_locked: true, channels: { push: true, email: true, sms: true }, recipients: ["client_manager", "admin"], timing: {}, escalation: { after_minutes: 15, to_roles: ["admin"], channels: { push: true, email: true, sms: true } } },
  { event_key: "new_incident_report", label: "New incident report", description: "Any incident submitted", category: "client_safety", severity: "action", is_locked: false, channels: { push: true, email: true, sms: false }, recipients: ["client_manager"], timing: {}, escalation: { after_minutes: 1440, to_roles: ["admin"], channels: { push: true, email: true, sms: false } } },
  { event_key: "incident_followup_overdue", label: "Incident follow-up overdue", description: "Review/resolution not closed by agency deadline", category: "client_safety", severity: "action", is_locked: false, channels: { push: false, email: true, sms: false }, recipients: ["client_manager", "admin"], timing: { after_hours: 72 }, escalation: null },
  { event_key: "guardian_sc_notification_due", label: "Guardian/SC notification due", description: "Incident requiring external notification with no notification logged", category: "client_safety", severity: "action", is_locked: false, channels: { push: true, email: true, sms: false }, recipients: ["client_manager"], timing: { after_hours: 12 }, escalation: { after_minutes: 1200, to_roles: ["admin"], channels: { push: true, email: true, sms: false } } },
  { event_key: "repeat_incident_pattern", label: "Repeat incident pattern", description: "Same client, same incident type ≥ 3 times in 30 days", category: "client_safety", severity: "action", is_locked: false, channels: { push: false, email: true, sms: false }, recipients: ["client_manager", "admin"], timing: { count: 3, days: 30 }, escalation: null },
  { event_key: "restrictive_intervention_used", label: "Restrictive intervention used", description: "Behavior incident logged with a BSP restrictive/emergency intervention", category: "client_safety", severity: "action", is_locked: false, channels: { push: true, email: true, sms: false }, recipients: ["client_manager"], timing: {}, escalation: null },
  { event_key: "authorization_ending", label: "Authorization ending", description: "Days before authorization end date", category: "client_safety", severity: "action", is_locked: false, channels: { push: false, email: true, sms: false }, recipients: ["client_manager", "billing_bundle"], timing: { days_before: 30 }, escalation: null },
  { event_key: "units_running_low", label: "Units running low", description: "Percentage of authorized units used", category: "client_safety", severity: "action", is_locked: false, channels: { push: false, email: true, sms: false }, recipients: ["client_manager", "billing_bundle"], timing: { thresholds: [80, 95] }, escalation: null },
  { event_key: "service_without_authorization", label: "Service without active authorization", description: "Shift clocked in for a service code with no active authorization", category: "client_safety", severity: "action", is_locked: false, channels: { push: true, email: true, sms: false }, recipients: ["client_manager", "billing_bundle"], timing: {}, escalation: null },
  { event_key: "client_document_expiring", label: "Client document expiring", description: "Client file item (ISP/PCSP, consents, releases, physical) expiring", category: "client_safety", severity: "action", is_locked: false, channels: { push: false, email: true, sms: false }, recipients: ["client_manager"], timing: { days_before: [30, 7] }, escalation: { after_minutes: 0, to_roles: ["admin"], channels: { push: false, email: true, sms: false } } },
  { event_key: "isp_pcsp_review_approaching", label: "ISP/PCSP review approaching", description: "Days before annual review", category: "client_safety", severity: "action", is_locked: false, channels: { push: false, email: true, sms: false }, recipients: ["client_manager"], timing: { days_before: [60, 30] }, escalation: null },
  { event_key: "client_birthday", label: "Client birthday", description: "Day before birthday", category: "client_safety", severity: "fyi", is_locked: false, channels: { push: false, email: false, sms: false }, recipients: ["assigned_dsps", "client_manager"], timing: {}, escalation: null },

  // ─── 4.2 Medication ───
  { event_key: "med_pass_due", label: "Med pass due", description: "At scheduled med time", category: "medication", severity: "fyi", is_locked: false, channels: { push: true, email: false, sms: false }, recipients: ["dsp_on_shift"], timing: {}, escalation: null },
  { event_key: "med_pass_not_documented", label: "Med pass not documented", description: "Minutes after scheduled time, not charted", category: "medication", severity: "action", is_locked: false, channels: { push: true, email: false, sms: false }, recipients: ["dsp_on_shift"], timing: { after_minutes: 30 }, escalation: { after_minutes: 60, to_roles: ["client_manager"], channels: { push: true, email: false, sms: true } } },
  { event_key: "missed_med_unresolved_24h", label: "Missed med unresolved 24h", description: "Med still undocumented 24h after scheduled time", category: "medication", severity: "critical", is_locked: true, channels: { push: true, email: true, sms: false }, recipients: ["client_manager", "admin"], timing: { after_hours: 24 }, escalation: null },
  { event_key: "new_medication_refusal", label: "New medication refusal", description: "Refusal logged where client has no refusal of that med in prior 14 days", category: "medication", severity: "action", is_locked: false, channels: { push: true, email: false, sms: false }, recipients: ["client_manager"], timing: { prior_days: 14 }, escalation: null },
  { event_key: "repeated_refusals", label: "Repeated refusals", description: "≥ 3 refusals of any med in 7 days", category: "medication", severity: "action", is_locked: false, channels: { push: true, email: true, sms: false }, recipients: ["client_manager"], timing: { count: 3, days: 7 }, escalation: null },
  { event_key: "medication_error_logged", label: "Medication error logged", description: "Wrong dose/time/med/route or omission recorded", category: "medication", severity: "critical", is_locked: true, channels: { push: true, email: true, sms: true }, recipients: ["client_manager", "admin"], timing: {}, escalation: { after_minutes: 30, to_roles: ["admin"], channels: { push: true, email: true, sms: true } } },
  { event_key: "controlled_substance_count_discrepancy", label: "Controlled substance count discrepancy", description: "Count entered doesn't match running total", category: "medication", severity: "critical", is_locked: true, channels: { push: true, email: true, sms: true }, recipients: ["client_manager", "admin"], timing: {}, escalation: { after_minutes: 15, to_roles: ["admin"], channels: { push: true, email: true, sms: true } } },
  { event_key: "count_overdue", label: "Count overdue", description: "Shift-change controlled count not completed after shift change", category: "medication", severity: "action", is_locked: false, channels: { push: true, email: false, sms: false }, recipients: ["dsp_on_shift"], timing: { after_minutes: 30 }, escalation: { after_minutes: 60, to_roles: ["client_manager"], channels: { push: true, email: false, sms: false } } },
  { event_key: "prn_given", label: "PRN given", description: "PRN administered", category: "medication", severity: "fyi", is_locked: false, channels: { push: false, email: false, sms: false }, recipients: ["client_manager"], timing: {}, escalation: null },
  { event_key: "prn_effectiveness_followup_due", label: "PRN effectiveness follow-up due", description: "Minutes after PRN, no effectiveness note", category: "medication", severity: "action", is_locked: false, channels: { push: true, email: false, sms: false }, recipients: ["self"], timing: { after_minutes: 60 }, escalation: null },
  { event_key: "med_order_changed", label: "Med order changed", description: "Medication added, changed, or discontinued", category: "medication", severity: "action", is_locked: false, channels: { push: true, email: false, sms: false }, recipients: ["assigned_dsps"], timing: {}, escalation: null },
  { event_key: "low_supply", label: "Low supply", description: "Remaining count ≤ days of supply", category: "medication", severity: "action", is_locked: false, channels: { push: false, email: true, sms: false }, recipients: ["client_manager"], timing: { days_supply: 7 }, escalation: null },

  // ─── 4.3 Charting ───
  { event_key: "note_reminder_before_clockout", label: "Note reminder before clock-out", description: "Minutes before scheduled shift end and no session note started", category: "charting", severity: "action", is_locked: false, channels: { push: true, email: false, sms: false }, recipients: ["dsp_on_shift"], timing: { before_minutes: 15 }, escalation: null },
  { event_key: "shift_with_no_note", label: "Shift with no note", description: "Clocked-in shift ended with no session note", category: "charting", severity: "action", is_locked: false, channels: { push: true, email: true, sms: false }, recipients: ["self"], timing: {}, escalation: { after_minutes: 1440, to_roles: ["client_manager"], channels: { push: true, email: true, sms: false } } },
  { event_key: "note_not_submitted_signed", label: "Note not submitted/signed", description: "Draft note not submitted after shift end", category: "charting", severity: "action", is_locked: false, channels: { push: true, email: true, sms: false }, recipients: ["self"], timing: { after_hours: 24 }, escalation: { after_minutes: 2880, to_roles: ["client_manager"], channels: { push: true, email: true, sms: false } } },
  { event_key: "scheduled_goal_not_charted", label: "Scheduled goal not charted", description: "Scheduled goal not charted by shift end", category: "charting", severity: "action", is_locked: false, channels: { push: true, email: false, sms: false }, recipients: ["self"], timing: {}, escalation: { after_minutes: 0, to_roles: ["client_manager"], channels: { push: false, email: true, sms: false } } },
  { event_key: "note_returned_for_correction", label: "Note returned for correction", description: "Manager returns a note", category: "charting", severity: "action", is_locked: false, channels: { push: true, email: true, sms: false }, recipients: ["self"], timing: {}, escalation: { after_minutes: 2880, to_roles: ["client_manager"], channels: { push: true, email: true, sms: false } } },
  { event_key: "monthly_summary_ready_to_sign", label: "Monthly summary ready to sign", description: "Auto-draft generated on the 1st", category: "charting", severity: "action", is_locked: false, channels: { push: false, email: true, sms: false }, recipients: ["client_manager"], timing: {}, escalation: { after_minutes: 0, to_roles: ["admin"], channels: { push: false, email: true, sms: false } } },
  { event_key: "quarterly_summary_due", label: "Quarterly summary due", description: "Days before quarter-end summary due date", category: "charting", severity: "action", is_locked: false, channels: { push: false, email: true, sms: false }, recipients: ["client_manager"], timing: { days_before: 14 }, escalation: null },
  { event_key: "charting_streak_at_risk", label: "Charting streak at risk", description: "Active streak ≥ 3, hasn't charted today, hours before shift end", category: "charting", severity: "fyi", is_locked: false, channels: { push: true, email: false, sms: false }, recipients: ["self"], timing: { streak_min: 3, before_hours: 2 }, escalation: null },
  { event_key: "streak_milestone", label: "Streak milestone", description: "Streak hits 7 / 30 / 90 days", category: "charting", severity: "fyi", is_locked: false, channels: { push: false, email: false, sms: false }, recipients: ["self"], timing: { milestones: [7, 30, 90] }, escalation: null },

  // ─── 4.4 Shifts, EVV & Timecards ───
  { event_key: "shift_starting_soon", label: "Shift starting soon", description: "Minutes before scheduled start", category: "shifts_evv", severity: "fyi", is_locked: false, channels: { push: true, email: false, sms: true }, recipients: ["self"], timing: { before_minutes: 60 }, escalation: null },
  { event_key: "not_clocked_in", label: "Not clocked in", description: "Minutes after scheduled start, not clocked in", category: "shifts_evv", severity: "action", is_locked: false, channels: { push: true, email: false, sms: true }, recipients: ["self"], timing: { after_minutes: 10 }, escalation: { after_minutes: 20, to_roles: ["house_manager"], channels: { push: true, email: false, sms: true } } },
  { event_key: "clockout_reminder", label: "Clock-out reminder", description: "Minutes after scheduled end, still clocked in", category: "shifts_evv", severity: "action", is_locked: false, channels: { push: true, email: false, sms: false }, recipients: ["self"], timing: { after_minutes: 10 }, escalation: null },
  { event_key: "forgot_to_clock_out", label: "Forgot to clock out", description: "Still clocked in minutes after scheduled end", category: "shifts_evv", severity: "action", is_locked: false, channels: { push: true, email: false, sms: true }, recipients: ["self", "client_manager"], timing: { after_minutes: 60 }, escalation: null },
  { event_key: "schedule_published_changed", label: "Schedule published or changed", description: "Shift added, changed, or cancelled", category: "shifts_evv", severity: "action", is_locked: false, channels: { push: true, email: true, sms: false }, recipients: ["dsp_on_shift"], timing: {}, escalation: null },
  { event_key: "open_shift_available", label: "Open shift available", description: "Shift posted as open", category: "shifts_evv", severity: "fyi", is_locked: false, channels: { push: true, email: false, sms: false }, recipients: ["assigned_dsps"], timing: {}, escalation: null },
  { event_key: "evv_exception", label: "EVV exception", description: "Clock in/out outside geofence, manual time entry, or missing clock event", category: "shifts_evv", severity: "action", is_locked: false, channels: { push: true, email: false, sms: false }, recipients: ["self", "client_manager"], timing: {}, escalation: { after_minutes: 1440, to_roles: ["client_manager"], channels: { push: false, email: true, sms: false } } },
  { event_key: "verify_your_timecard", label: "Verify your timecard", description: "Day before pay period ends", category: "shifts_evv", severity: "action", is_locked: false, channels: { push: true, email: true, sms: false }, recipients: ["dsp_on_shift"], timing: { days_before: 1 }, escalation: null },
  { event_key: "timecard_edited_by_manager", label: "Timecard edited by manager", description: "Manager changes a DSP's time", category: "shifts_evv", severity: "fyi", is_locked: false, channels: { push: true, email: false, sms: false }, recipients: ["self"], timing: {}, escalation: null },
  { event_key: "timecards_pending_approval", label: "Timecards pending approval", description: "Pay period closed; batched count of unapproved timecards", category: "shifts_evv", severity: "action", is_locked: false, channels: { push: false, email: true, sms: false }, recipients: ["client_manager"], timing: {}, escalation: { after_minutes: 0, to_roles: ["admin"], channels: { push: false, email: true, sms: false } } },
  { event_key: "timecard_approved_rejected", label: "Timecard approved/rejected", description: "Status change", category: "shifts_evv", severity: "fyi", is_locked: false, channels: { push: true, email: false, sms: false }, recipients: ["self"], timing: {}, escalation: null },
  { event_key: "overtime_approaching", label: "Overtime approaching", description: "Staff reaches threshold of 40h in the workweek", category: "shifts_evv", severity: "action", is_locked: false, channels: { push: false, email: true, sms: false }, recipients: ["client_manager", "admin"], timing: { hours_worked: 36, hours_max: 40 }, escalation: null },
  { event_key: "payroll_export_ready_failed", label: "Payroll export ready / failed", description: "Export completes or fails validation", category: "shifts_evv", severity: "action", is_locked: false, channels: { push: false, email: true, sms: false }, recipients: ["admin"], timing: {}, escalation: null },

  // ─── 4.5 Staff Compliance ───
  { event_key: "credential_expiring", label: "Credential expiring", description: "Any staff credential at 60 / 30 / 7 days", category: "staff_compliance", severity: "action", is_locked: false, channels: { push: true, email: true, sms: false }, recipients: ["self", "hr_bundle"], timing: { days_before: [60, 30, 7] }, escalation: { after_minutes: 0, to_roles: ["client_manager"], channels: { push: true, email: true, sms: false } } },
  { event_key: "credential_expired", label: "Credential expired", description: "On expiration date", category: "staff_compliance", severity: "critical", is_locked: true, channels: { push: true, email: true, sms: true }, recipients: ["self", "hr_bundle", "client_manager"], timing: {}, escalation: null },
  { event_key: "expired_staff_scheduled", label: "Expired staff scheduled", description: "Staff with expired required credential scheduled or clocks in", category: "staff_compliance", severity: "critical", is_locked: true, channels: { push: true, email: true, sms: false }, recipients: ["client_manager", "hr_bundle"], timing: { days_ahead: 7 }, escalation: null },
  { event_key: "training_assigned", label: "Training assigned", description: "New training assigned", category: "staff_compliance", severity: "action", is_locked: false, channels: { push: true, email: true, sms: false }, recipients: ["self"], timing: {}, escalation: null },
  { event_key: "training_due_overdue", label: "Training due soon / overdue", description: "Days before due, and on due date", category: "staff_compliance", severity: "action", is_locked: false, channels: { push: true, email: true, sms: false }, recipients: ["self"], timing: { days_before: 7 }, escalation: { after_minutes: 10080, to_roles: ["client_manager", "hr_bundle"], channels: { push: true, email: true, sms: false } } },
  { event_key: "training_awaiting_verification", label: "Training awaiting verification", description: "Staff completes training needing HR/Manager verification", category: "staff_compliance", severity: "action", is_locked: false, channels: { push: false, email: true, sms: false }, recipients: ["hr_bundle", "client_manager"], timing: {}, escalation: { after_minutes: 7200, to_roles: ["admin"], channels: { push: false, email: true, sms: false } } },
  { event_key: "document_awaiting_verification", label: "Document awaiting verification", description: "Staff uploads a compliance document", category: "staff_compliance", severity: "action", is_locked: false, channels: { push: false, email: true, sms: false }, recipients: ["hr_bundle", "client_manager"], timing: {}, escalation: null },
  { event_key: "esignature_requested", label: "E-signature requested", description: "Document sent for signature", category: "staff_compliance", severity: "action", is_locked: false, channels: { push: true, email: true, sms: false }, recipients: ["self"], timing: { reminder_days: 3 }, escalation: { after_minutes: 10080, to_roles: ["admin"], channels: { push: true, email: true, sms: false } } },
  { event_key: "esignature_completed", label: "E-signature completed", description: "All signers done", category: "staff_compliance", severity: "fyi", is_locked: false, channels: { push: false, email: false, sms: false }, recipients: ["admin"], timing: {}, escalation: null },
  { event_key: "onboarding_incomplete", label: "Onboarding incomplete", description: "New hire's required items incomplete before start/first shift", category: "staff_compliance", severity: "action", is_locked: false, channels: { push: false, email: true, sms: false }, recipients: ["hr_bundle", "client_manager"], timing: { days_before: 3 }, escalation: null },

  // ─── 4.6 HR & Team ───
  { event_key: "leave_request_submitted", label: "Leave request submitted", description: "Staff submits time-off request", category: "hr_team", severity: "action", is_locked: false, channels: { push: true, email: true, sms: false }, recipients: ["client_manager", "hr_bundle"], timing: {}, escalation: { after_minutes: 4320, to_roles: ["admin"], channels: { push: true, email: true, sms: false } } },
  { event_key: "leave_request_decided", label: "Leave request decided", description: "Approved or denied", category: "hr_team", severity: "fyi", is_locked: false, channels: { push: true, email: true, sms: false }, recipients: ["self"], timing: {}, escalation: null },
  { event_key: "leave_conflicts_with_schedule", label: "Leave conflicts with schedule", description: "Approved leave overlaps an assigned shift", category: "hr_team", severity: "action", is_locked: false, channels: { push: true, email: true, sms: false }, recipients: ["client_manager"], timing: {}, escalation: null },
  { event_key: "performance_review_due", label: "Performance review due", description: "Days before due", category: "hr_team", severity: "action", is_locked: false, channels: { push: false, email: true, sms: false }, recipients: ["client_manager"], timing: { days_before: 14 }, escalation: { after_minutes: 0, to_roles: ["hr_bundle"], channels: { push: false, email: true, sms: false } } },
  { event_key: "probation_period_ending", label: "Probation period ending", description: "Days before 90-day mark", category: "hr_team", severity: "action", is_locked: false, channels: { push: false, email: true, sms: false }, recipients: ["client_manager", "hr_bundle"], timing: { days_before: 7 }, escalation: null },
  { event_key: "staff_birthday_anniversary", label: "Staff birthday / work anniversary", description: "Day of", category: "hr_team", severity: "fyi", is_locked: false, channels: { push: false, email: false, sms: false }, recipients: ["client_manager"], timing: {}, escalation: null },
  { event_key: "kudos_received", label: "Kudos received", description: "Someone sends kudos", category: "hr_team", severity: "fyi", is_locked: false, channels: { push: true, email: false, sms: false }, recipients: ["self"], timing: {}, escalation: null },
  { event_key: "agency_announcement", label: "Agency announcement", description: "Admin posts announcement; Important flag sends push + email", category: "hr_team", severity: "fyi", is_locked: false, channels: { push: false, email: false, sms: false }, recipients: ["admin"], timing: {}, escalation: null },
];

/**
 * Returns the default category for a rule key.
 */
export function getCategoryRules(categoryKey) {
  return DEFAULT_RULES.filter(r => r.category === categoryKey);
}

/**
 * Returns the category summary for the category card grid.
 */
export function getCategorySummary(categoryKey) {
  const rules = getCategoryRules(categoryKey);
  return {
    total: rules.length,
    active: rules.filter(r => r.enabled !== false).length,
    critical: rules.filter(r => r.severity === "critical").length,
  };
}