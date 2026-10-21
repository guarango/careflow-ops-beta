/**
 * CareFlow — Single Permission Source
 *
 * Four roles: DSP, Manager, Admin, Super Admin.
 * Super Admin is admin + is_super_admin=true (computed in useRole).
 *
 * Permission bundles (Admin only):
 *   hr_bundle      — staff HR files, onboarding, e-signature, trainings, staff compliance
 *   billing_bundle  — service code rates, authorizations, unit tracking, payroll/billing/EVV export
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

// ─── Navigation access per role ──────────────────────────────────────────
export const NAV_ACCESS = {
  "/":             ["dsp", "manager", "admin", "super_admin"],
  "/clients":      ["dsp", "manager", "admin", "super_admin"],
  "/goals":        ["dsp", "manager", "admin", "super_admin"],
  "/session-notes":["dsp", "manager", "admin", "super_admin"],
  "/bsp":           ["dsp", "manager", "admin", "super_admin"],
  "/isp":           ["manager", "admin", "super_admin"],
  "/emar":          ["dsp", "manager", "admin", "super_admin"],
  "/incidents":     ["dsp", "manager", "admin", "super_admin"],
  "/staff":         ["manager", "admin", "super_admin"],
  "/schedule":      ["dsp", "manager", "admin", "super_admin"],
  "/timecards":     ["dsp", "manager", "admin", "super_admin"],
  "/hr":            ["admin", "super_admin"],
  "/compliance":   ["manager", "admin", "super_admin"],
  "/finance":      ["admin", "super_admin"],
  "/reports":      ["manager", "admin", "super_admin"],
  "/users":        ["admin", "super_admin"],
  "/agency-admin": ["admin", "super_admin"],
  "/role-preview": ["admin", "super_admin"],
  "/audit-log":   ["admin", "super_admin"],
  "/super-admin":  ["super_admin"],
  "/notifications":["dsp", "manager", "admin", "super_admin"],
  "/houses":       ["manager", "admin", "super_admin"],
  "/hr/signatures": ["admin", "super_admin"],
  "/hr/trainings":  ["admin", "super_admin"],
  "/my-trainings":  ["dsp", "manager", "admin", "super_admin"],
  "/hr/training-verify": ["manager", "admin", "super_admin"],
  "/reports/training-hours": ["manager", "admin", "super_admin"],
  "/sign":          ["dsp", "manager", "admin", "super_admin"],
};

// Paths that require an Admin bundle (super_admin bypasses)
const PATH_BUNDLES = {
  "/hr":      "hr",
  "/hr/trainings": "hr",
  "/finance": "billing",
};

// ─── Feature-level permissions (codes) ───────────────────────────────────
// Each code maps to roles. requires_bundle means an Admin must also have
// the named bundle; super_admin always passes.
export const CAN = {
  approveTimecards:       ["manager", "admin", "super_admin"],
  viewAllTimecards:       ["manager", "admin", "super_admin"],
  approveSessionNotes:    ["manager", "admin", "super_admin"],
  editStaff:              ["admin", "super_admin"],
  changeIncidentStatus:   ["manager", "admin", "super_admin"],
  viewAllIncidents:       ["manager", "admin", "super_admin"],
  editClients:            ["manager", "admin", "super_admin"],
  accessBilling:          ["admin", "super_admin"],
  editServiceCodes:       ["admin", "super_admin"],
  manageUsers:            ["admin", "super_admin"],
  editGoals:              ["manager", "admin", "super_admin"],
  viewIncidentBadge:      ["manager", "admin", "super_admin"],
  manageTraining:         ["manager", "admin", "super_admin"],
  viewAllStaff:           ["manager", "admin", "super_admin"],
  accessSettings:         ["admin", "super_admin"],
  exportPayroll:          ["admin", "super_admin"],
  lockPayPeriod:          ["admin", "super_admin"],
  unlockTimecard:         ["admin", "super_admin"],
  loginAs:                ["super_admin"],
  scheduleBuild:          ["manager", "admin", "super_admin"],
  emarEdit:               ["manager", "admin", "super_admin"],
  verifyTraining:         ["manager", "admin", "super_admin"],
  hrAccess:               ["admin", "super_admin"],
  billingExport:          ["admin", "super_admin"],
  evvExport:              ["admin", "super_admin"],
  authorizationsManage:   ["admin", "super_admin"],
  ispEdit:                ["admin", "super_admin"],
  superAdminAccess:       ["super_admin"],
  manageSignatures:       ["admin", "super_admin"],
  sendSignatureRequests:  ["admin", "super_admin"],
  viewTeamSignatures:     ["manager", "admin", "super_admin"],
};

// Permissions that require a bundle (Admin only; super_admin bypasses)
const BUNDLE_REQUIRED = {
  editStaff:            "hr",
  accessBilling:        "billing",
  editServiceCodes:     "billing",
  exportPayroll:        "billing",
  billingExport:       "billing",
  evvExport:           "billing",
  authorizationsManage: "billing",
  hrAccess:            "hr",
  manageSignatures:   "hr",
  sendSignatureRequests: "hr",
};

// ─── Permission check (single source) ───────────────────────────────────
export function can(role, permission, bundles = {}) {
  const allowed = CAN[permission];
  if (!allowed) return false;
  if (!allowed.includes(role)) return false;
  const requiredBundle = BUNDLE_REQUIRED[permission];
  if (requiredBundle && role !== "super_admin") {
    return bundles[requiredBundle] === true;
  }
  return true;
}

export function canAccessPath(role, path, bundles = {}) {
  const cleanPath = path.split("?")[0];
  const allowed = NAV_ACCESS[cleanPath];
  if (!allowed) return role === "admin" || role === "super_admin";
  if (!allowed.includes(role)) return false;
  const requiredBundle = PATH_BUNDLES[cleanPath];
  if (requiredBundle && role !== "super_admin") {
    return bundles[requiredBundle] === true;
  }
  return true;
}

export function getRoleLabel(role) {
  return {
    dsp:         "DSP",
    manager:     "Manager",
    admin:       "Admin",
    super_admin: "Super Admin",
  }[role] || role;
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