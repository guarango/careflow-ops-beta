/**
 * Role-based permissions for CareOps Pro
 *
 * Roles:
 *  admin — full access to everything
 *  hr    — Dashboard, Staff, Schedule, Timecards, Compliance ONLY
 *  dsp   — Dashboard, Clients (own), Schedule (own), Session Notes (own), eMAR (own), Timecards (own) ONLY
 */

export const ROLES = {
  ADMIN: "admin",
  HR: "hr",
  DSP: "dsp",
};

// Nav items visible per role — exactly as specified
export const NAV_ACCESS = {
  "/":              ["admin", "hr", "dsp"],
  "/staff":         ["admin", "hr"],
  "/clients":       ["admin", "dsp"],
  "/schedule":      ["admin", "hr", "dsp"],
  "/goals":         ["admin"],
  "/session-notes": ["admin", "dsp"],
  "/incidents":     ["admin"],
  "/emar":          ["admin", "dsp"],
  "/timecards":     ["admin", "hr", "dsp"],
  "/compliance":    ["admin", "hr"],
  "/service-codes": ["admin"],
  "/payroll":       ["admin"],
  "/billing":       ["admin"],
  "/users":         ["admin"],
  "/role-preview":  ["admin"],
  "/evv":           ["admin", "hr"],
  "/hr":            ["admin", "hr", "dsp"],
  "/agency-admin":  ["admin"],
};

// Feature-level permissions — exactly as specified
export const CAN = {
  // Timecards
  approveTimecards:     ["admin", "hr"],
  viewAllTimecards:     ["admin", "hr"],

  // Session Notes
  approveSessionNotes:  ["admin", "hr"],

  // Staff
  editStaff:            ["admin", "hr"],

  // Incidents
  changeIncidentStatus: ["admin"],
  viewAllIncidents:     ["admin"],

  // Clients
  editClients:          ["admin"],

  // Billing
  accessBilling:        ["admin"],

  // Service Codes
  editServiceCodes:     ["admin"],

  // Users
  manageUsers:          ["admin"],

  // Goals
  editGoals:            ["admin"],
};

/**
 * Check if a user role has a specific permission
 */
export function can(userRole, permission) {
  const allowed = CAN[permission];
  if (!allowed) return false;
  return allowed.includes(userRole);
}

/**
 * Check if a role can access a nav path
 */
export function canAccessPath(userRole, path) {
  const allowed = NAV_ACCESS[path];
  if (!allowed) return userRole === "admin";
  return allowed.includes(userRole);
}

export function getRoleLabel(role) {
  return { admin: "Admin", hr: "HR Manager", dsp: "DSP" }[role] || role;
}

export function getRoleBadgeColor(role) {
  return {
    admin: "bg-primary/10 text-primary border-primary/20",
    hr: "bg-chart-3/10 text-chart-3 border-chart-3/20",
    dsp: "bg-accent/10 text-accent border-accent/20",
  }[role] || "bg-muted text-muted-foreground";
}