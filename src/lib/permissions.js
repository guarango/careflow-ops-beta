/**
 * CareFlow — Single Permission Source
 *
 * Four roles: DSP, Manager, Admin, Super Admin.
 * Super Admin is admin + is_super_admin=true (computed in useRole).
 *
 * Permission subjects: dsp, manager, admin, hr_bundle, billing_bundle.
 * A bundle only ever grants access to an Admin who holds it — bundles never
 * apply to DSPs or Managers. Super Admin always has full access.
 *
 * Every page and query calls can(permissionCode) or canAccessPath(path) —
 * never checks role names directly.
 */

export const ROLES = {
  DSP: "dsp",
  MANAGER: "manager",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
};

// Subjects that can appear in a permission array
export const SUBJECTS = ["dsp", "manager", "admin", "hr_bundle", "billing_bundle"];

// ─── Navigation access per role/subject (deny by default) ────────────────
// A page that is not listed here is denied to everyone except Super Admin.
// Action codes granted for a page also grant access to that page.
export const NAV_ACCESS = {
  "/":                      ["dsp", "manager", "admin"],
  "/clients":               ["dsp", "manager", "admin"],
  "/goals":                 ["dsp", "manager", "admin"],
  "/bsp":                   ["dsp", "manager", "admin"],
  "/isp":                   ["manager", "admin"],
  "/summaries/monthly":     ["dsp", "manager", "admin"],
  "/summaries/quarterly":   ["dsp", "manager", "admin"],
  "/session-notes":         ["dsp", "manager", "admin"],
  "/emar":                  ["dsp", "manager", "admin"],
  "/incidents":             ["dsp", "manager", "admin"],
  "/schedule":              ["dsp", "manager", "admin"],
  "/timecards":             ["dsp", "manager", "admin"],
  "/houses":                ["manager", "admin"],
  "/staff":                 ["manager", "admin", "hr_bundle"],
  "/compliance":            ["manager", "admin", "hr_bundle"],
  "/my-trainings":          ["dsp", "manager", "admin"],
  "/hr":                    ["hr_bundle"],
  "/hr/trainings":          ["hr_bundle"],
  "/hr/training-verify":    ["manager", "hr_bundle"],
  "/hr/signatures":         ["hr_bundle"],
  "/reports/training-hours": ["manager", "admin"],
  "/finance":               ["billing_bundle"],
  "/reports":               ["manager", "admin"],
  "/recognition":           ["dsp", "manager", "admin"],
  "/notifications":         ["dsp", "manager", "admin"],
  "/my-profile":            ["dsp", "manager", "admin"],
  "/my-onboarding":         ["dsp", "manager", "admin"],
  "/agency-admin":          ["admin"],
  "/users":                 ["admin"],
  "/audit-log":             ["admin"],
  "/onboarding":            ["admin"],
  "/api/docs":              ["admin"],
  "/sign":                  ["dsp", "manager", "admin"],
  "/oauth/consent":         ["dsp", "manager", "admin"],
  "/super-admin":           [],
};

// ─── Feature-level permissions (codes) ───────────────────────────────────
// Each code maps to subjects. A higher level includes the levels below it,
// so e.g. an Approve code also lists the roles that can Create.
export const CAN = {
  // Care
  editClients:            ["manager", "admin"],
  createClient:           ["admin"],
  deleteClient:           [],
  editGoals:              ["manager", "admin"],
  bspEdit:                ["manager", "admin"],
  ispEdit:                ["admin"],
  approveSummaries:       ["manager", "admin"],
  createSessionNotes:     ["dsp", "manager", "admin"],
  approveSessionNotes:    ["manager", "admin"],

  // Health & Safety
  emarRecord:             ["dsp", "manager", "admin"],
  emarEdit:               ["manager", "admin"],
  createIncident:         ["dsp", "manager", "admin"],
  changeIncidentStatus:   ["manager", "admin"],
  approveIncidents:       ["admin"],
  viewAllIncidents:       ["admin"],
  viewIncidentBadge:      ["manager", "admin"],
  staffFilesView:         ["hr_bundle"],
  viewStaffHRFiles:       ["hr_bundle"],
  viewSensitiveIdentifiers: ["hr_bundle"],
  viewSensitiveHRDetails: ["hr_bundle"],
  viewSensitiveRates:     ["billing_bundle"],
  viewClientCompliance:   ["manager", "admin"],
  viewAgencyCompliance:   ["admin"],
  viewAllNotifications:   ["admin"],
  hrAnalytics:            ["hr_bundle"],

  // Staff & Operations
  scheduleBuild:          ["manager", "admin"],
  clockInOut:             ["dsp", "manager", "admin"],
  approveTimecards:       ["manager", "admin"],
  viewAllTimecards:       ["admin", "billing_bundle"],
  lockPayPeriod:          ["billing_bundle"],
  unlockTimecard:         ["admin"],
  editHouses:             ["manager", "admin"],
  deleteHouse:            ["admin"],
  viewAllStaff:           ["admin"],
  editStaffDirectory:     ["admin", "hr_bundle"],
  editStaff:              ["hr_bundle"],
  createStaff:            ["admin"],
  deleteStaff:            [],
  createUser:             ["admin"],
  editUser:               ["admin"],
  deleteUser:             [],
  accessSettings:         ["admin"],
  viewPermissions:        ["admin"],
  editFormFields:         ["admin"],
  manageRecognition:      ["admin"],
  giveKudos:              ["manager", "admin"],
  loginAs:                [],

  // Training
  manageTraining:         ["hr_bundle"],
  verifyTraining:         ["manager", "hr_bundle"],
  manageSignatures:       ["hr_bundle"],
  sendSignatureRequests:  ["hr_bundle"],
  viewTeamSignatures:     ["manager", "hr_bundle"],

  // Finance
  editServiceCodes:       ["admin"],
  authorizationsManage:   ["admin", "billing_bundle"],
  editRates:              ["billing_bundle"],
  accessBilling:          ["billing_bundle"],
  viewServiceCodes:       ["admin", "billing_bundle"],
  viewAuditLog:           ["admin"],
  viewUnitTracking:       ["manager", "admin", "billing_bundle"],
  exportPayroll:          ["billing_bundle"],
  billingExport:          ["billing_bundle"],
  evvExport:              ["billing_bundle"],
  hrAccess:               ["hr_bundle"],
  superAdminAccess:       [],
};

// ─── Matrix sections / features (screen + page-access map) ───────────────
// Each feature: label, page path(s), and the action codes shown beneath its
// "View page" row. `hideView` marks a feature that lives on a page already
// represented by another feature (no duplicate View row).
export const FEATURE_SECTIONS = [
  {
    title: "Care",
    features: [
      { key: "dashboard", label: "Dashboard", paths: ["/"] },
      { key: "clients", label: "Clients", paths: ["/clients"], actions: [
        { code: "createClient", level: "Create", label: "Add new client" },
        { code: "editClients", level: "Edit", label: "Edit client records" },
        { code: "deleteClient", level: "Delete", label: "Delete client" },
      ] },
      { key: "goals", label: "Client goals", paths: ["/goals"], actions: [
        { code: "editGoals", level: "Edit", label: "Edit goals" },
      ] },
      { key: "bsp", label: "Behavior support plans", paths: ["/bsp"], actions: [
        { code: "bspEdit", level: "Edit", label: "Edit behavior support plans" },
      ] },
      { key: "isp", label: "ISP plans", paths: ["/isp"], actions: [
        { code: "ispEdit", level: "Edit", label: "Edit ISP plans" },
      ] },
      { key: "summaries", label: "Monthly & quarterly summaries", paths: ["/summaries/monthly", "/summaries/quarterly"], actions: [
        { code: "approveSummaries", level: "Approve", label: "Approve summaries" },
      ] },
      { key: "sessionNotes", label: "Session notes", paths: ["/session-notes"], actions: [
        { code: "createSessionNotes", level: "Create", label: "Create own notes" },
        { code: "approveSessionNotes", level: "Approve", label: "Approve or return notes" },
      ] },
    ],
  },
  {
    title: "Health & Safety",
    features: [
      { key: "emar", label: "eMAR", paths: ["/emar"], actions: [
        { code: "emarRecord", level: "Create", label: "Chart medication passes" },
        { code: "emarEdit", level: "Edit", label: "Edit medication records" },
      ] },
      { key: "incidents", label: "Incidents", paths: ["/incidents"], actions: [
        { code: "createIncident", level: "Create", label: "File incidents" },
        { code: "changeIncidentStatus", level: "Edit", label: "Edit incidents" },
        { code: "approveIncidents", level: "Approve", label: "Approve incidents" },
        { code: "viewIncidentBadge", level: "View", label: "Open-incident count badge" },
        { code: "viewAllIncidents", level: "View", label: "See all incidents" },
      ] },
      { key: "complianceClients", label: "Compliance (clients)", paths: ["/compliance"], actions: [
        { code: "viewClientCompliance", level: "View", label: "View client compliance files" },
        { code: "viewAgencyCompliance", level: "View", label: "Agency score & agency file" },
      ] },
      { key: "complianceStaff", label: "Compliance (staff files)", paths: ["/compliance"], hideView: true, actions: [
        { code: "staffFilesView", level: "View", label: "View staff compliance files" },
        { code: "viewSensitiveHRDetails", level: "View", label: "See HR details (background, I-9, pay)" },
      ] },
      { key: "sensitiveIdentifiers", label: "Sensitive identifiers", paths: [], hideView: true, actions: [
        { code: "viewSensitiveIdentifiers", level: "View", label: "Reveal sensitive identifiers" },
        { code: "viewSensitiveRates", level: "View", label: "See client rates" },
      ] },
      { key: "notificationCenter", label: "Notification center", paths: ["/notifications"], actions: [
        { code: "viewAllNotifications", level: "View", label: "See all agency notifications" },
      ] },
    ],
  },
  {
    title: "Staff & Operations",
    features: [
      { key: "schedule", label: "Schedule & EVV", paths: ["/schedule"], actions: [
        { code: "scheduleBuild", level: "Edit", label: "Build & edit schedule" },
      ] },
      { key: "timecards", label: "Timecards", paths: ["/timecards"], actions: [
        { code: "clockInOut", level: "Create", label: "Clock in / out" },
        { code: "approveTimecards", level: "Approve", label: "Approve timecards" },
        { code: "viewAllTimecards", level: "View", label: "See all timecards" },
        { code: "unlockTimecard", level: "Edit", label: "Unlock an approved timecard" },
        { code: "lockPayPeriod", level: "Edit", label: "Lock a pay period" },
      ] },
      { key: "houses", label: "Houses", paths: ["/houses"], actions: [
        { code: "editHouses", level: "Edit", label: "Edit houses" },
        { code: "deleteHouse", level: "Delete", label: "Delete houses" },
      ] },
      { key: "staffDirectory", label: "Staff directory", paths: ["/staff"], actions: [
        { code: "viewAllStaff", level: "View", label: "See all staff, not just my team" },
        { code: "editStaffDirectory", level: "Edit", label: "Edit phone & assignments" },
      ] },
      { key: "staffHRFiles", label: "Staff HR files", paths: ["/staff"], hideView: true, actions: [
        { code: "viewStaffHRFiles", level: "View", label: "View HR files (background, I-9, drug screen, TB)" },
        { code: "editStaff", level: "Edit", label: "Edit HR files (SSN, background, pay)" },
        { code: "deleteStaff", level: "Delete", label: "Delete staff member" },
      ] },
      { key: "hrManagement", label: "HR management", paths: ["/hr"], hideView: true, actions: [
        { code: "hrAccess", level: "View", label: "Open HR management" },
        { code: "hrAnalytics", level: "View", label: "HR analytics" },
      ] },
      { key: "users", label: "Users & invites", paths: ["/agency-admin"], hideView: true, actions: [
        { code: "createUser", level: "Create", label: "Invite users" },
        { code: "createStaff", level: "Create", label: "Add staff" },
        { code: "editUser", level: "Edit", label: "Manage users" },
        { code: "loginAs", level: "Edit", label: "Login as a user" },
        { code: "deleteUser", level: "Delete", label: "Delete user" },
      ] },
      { key: "recognition", label: "Recognition", paths: ["/recognition"], actions: [
        { code: "manageRecognition", level: "Edit", label: "Manage recognition" },
        { code: "giveKudos", level: "View", label: "Give kudos" },
      ] },
    ],
  },
  {
    title: "Training",
    features: [
      { key: "myTrainings", label: "My trainings", paths: ["/my-trainings"] },
      { key: "trainingBuilder", label: "Training builder", paths: ["/hr/trainings"], actions: [
        { code: "manageTraining", level: "Edit", label: "Build trainings" },
      ] },
      { key: "verifyTrainings", label: "Verify trainings", paths: ["/hr/training-verify"], actions: [
        { code: "verifyTraining", level: "Approve", label: "Verify trainings" },
      ] },
      { key: "signatureTemplates", label: "E-signature templates", paths: ["/hr/signatures"], actions: [
        { code: "manageSignatures", level: "Edit", label: "Manage signature templates" },
        { code: "sendSignatureRequests", level: "Create", label: "Send signature requests" },
        { code: "viewTeamSignatures", level: "View", label: "See team signatures" },
      ] },
    ],
  },
  {
    title: "Finance",
    features: [
      { key: "serviceCodes", label: "Service codes", paths: ["/agency-admin"], hideView: true, actions: [
        { code: "viewServiceCodes", level: "View", label: "View service codes" },
        { code: "editServiceCodes", level: "Edit", label: "Edit service codes" },
      ] },
      { key: "authorizationsUnits", label: "Authorizations & units", paths: ["/clients"], hideView: true, actions: [
        { code: "viewUnitTracking", level: "View", label: "View unit tracking" },
        { code: "authorizationsManage", level: "Edit", label: "Manage authorizations & units" },
      ] },
      { key: "rates", label: "Rates / Finance", paths: ["/finance"], hideView: true, actions: [
        { code: "accessBilling", level: "View", label: "Billing overview" },
        { code: "editRates", level: "Edit", label: "Edit rates" },
      ] },
      { key: "payrollExport", label: "Payroll & billing export", paths: ["/finance"], hideView: true, actions: [
        { code: "exportPayroll", level: "Create", label: "Export payroll" },
        { code: "billingExport", level: "Create", label: "Export billing" },
        { code: "evvExport", level: "Create", label: "Export EVV" },
      ] },
    ],
  },
  {
    title: "Agency",
    features: [
      { key: "reports", label: "Reports", paths: ["/reports"] },
      { key: "rolesPermissions", label: "Roles & Permissions", paths: ["/agency-admin"], hideView: true, actions: [
        { code: "viewPermissions", level: "View", label: "View role permissions" },
      ] },
      { key: "agencySettings", label: "Agency settings", paths: ["/agency-admin"], hideView: true, actions: [
        { code: "accessSettings", level: "Edit", label: "Edit agency settings" },
      ] },
      { key: "formFields", label: "Form fields", paths: ["/agency-admin"], hideView: true, actions: [
        { code: "editFormFields", level: "Edit", label: "Edit form fields" },
      ] },
      { key: "auditLog", label: "Audit log", paths: ["/audit-log"], actions: [
        { code: "viewAuditLog", level: "View", label: "Open the audit log" },
      ] },
      { key: "superAdminConsole", label: "Super admin", paths: ["/super-admin"], hideView: true, actions: [
        { code: "superAdminAccess", level: "View", label: "Platform super admin console" },
      ] },
    ],
  },
];

// page path -> action codes that imply access to that page
export const PAGE_ACTION_CODES = (() => {
  const map = {};
  FEATURE_SECTIONS.forEach((section) => {
    section.features.forEach((feature) => {
      (feature.actions || []).forEach((action) => {
        (feature.paths || []).forEach((path) => {
          map[path] = map[path] || [];
          if (!map[path].includes(action.code)) map[path].push(action.code);
        });
      });
    });
  });
  return map;
})();

// ─── Permission checks (single source) ───────────────────────────────────

/** Does a stored permission array grant this subject? Bundles only for admins. */
export function subjectAllowed(allowed, role, bundles = {}) {
  if (!allowed) return false;
  if (allowed.includes(role)) return true;
  if (role !== "admin") return false;
  if (bundles.hr && allowed.includes("hr_bundle")) return true;
  if (bundles.billing && allowed.includes("billing_bundle")) return true;
  return false;
}

export function checkCan(canMap, role, permission, bundles = {}) {
  if (role === "super_admin") return true;
  return subjectAllowed(canMap[permission], role, bundles);
}

export function checkPathAccess(navAccess, canMap, role, path, bundles = {}) {
  if (role === "super_admin") return true;
  const cleanPath = path.split("?")[0];
  if (subjectAllowed(navAccess[cleanPath], role, bundles)) return true;

  // A granted action on a page also opens that page
  const codes = PAGE_ACTION_CODES[cleanPath] || [];
  return codes.some((code) => subjectAllowed(canMap[code], role, bundles));
}

export function can(role, permission, bundles = {}) {
  return checkCan(CAN, role, permission, bundles);
}

export function canAccessPath(role, path, bundles = {}) {
  return checkPathAccess(NAV_ACCESS, CAN, role, path, bundles);
}

// ─── Preview Role presets ────────────────────────────────────────────────
// Previewing applies BOTH the role and its bundles, so a previewed Admin sees
// exactly what an Admin with (or without) that bundle sees.
export const PREVIEW_PRESETS = {
  dsp:           { label: "DSP",                role: "dsp",     hr: false, billing: false },
  manager:       { label: "Manager",            role: "manager", hr: false, billing: false },
  admin:         { label: "Admin (no bundles)", role: "admin",   hr: false, billing: false },
  admin_hr:      { label: "Admin + HR",         role: "admin",   hr: true,  billing: false },
  admin_billing: { label: "Admin + Billing",    role: "admin",   hr: false, billing: true },
};

export function getPreviewLabel(token) {
  return PREVIEW_PRESETS[token]?.label || getRoleLabel(token);
}

export function getRoleLabel(role) {
  return {
    dsp:         "DSP",
    manager:     "Manager",
    admin:       "Admin",
    super_admin: "Super Admin",
  }[role] || role;
}

export function getSubjectLabel(subject) {
  return {
    dsp:            "DSP",
    manager:        "Manager",
    admin:          "Admin",
    hr_bundle:      "+HR bundle",
    billing_bundle: "+Billing bundle",
  }[subject] || subject;
}

export function getRoleBadgeColor(role) {
  return {
    dsp:         "bg-blue-500/10 text-blue-600 border-blue-500/20",
    manager:     "bg-violet-500/10 text-violet-600 border-violet-500/20",
    admin:       "bg-primary/10 text-primary border-primary/20",
    super_admin: "bg-destructive/10 text-destructive border-destructive/20",
  }[role] || "bg-muted text-muted-foreground border-muted";
}

// ─── Role descriptions for User Management cards ─────────────────────────
export const ROLE_DESCRIPTIONS = {
  dsp: "Sees only assigned clients. Clocks in/out, writes session notes, charts goals, passes meds, files incidents, views own schedule, timecard, and trainings. No admin access.",
  manager: "Oversees assigned clients and houses. Approves notes and timecards, reviews incidents, builds schedules, verifies trainings for their team. No billing, rates, or agency settings.",
  admin: "Full agency access. HR and Billing areas need the matching bundle.",
  super_admin: "Platform owner; all agencies; Login As.",
};