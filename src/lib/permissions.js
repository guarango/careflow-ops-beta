/**
 * Role-based permissions for CareOps Pro
 *
 * Roles:
 *  admin — full access to everything
 *  hr    — staff & compliance management, no billing/service codes
 *  dsp   — direct support: submit notes/incidents, view own schedule, eMAR
 */

export const ROLES = {
  ADMIN: "admin",
  HR: "hr",
  DSP: "dsp",
};

// Nav items visible per role
export const NAV_ACCESS = {
  "/": ["admin", "hr", "dsp"],
  "/staff": ["admin", "hr"],
  "/clients": ["admin", "hr", "dsp"],
  "/schedule": ["admin", "hr", "dsp"],
  "/goals": ["admin", "hr", "dsp"],
  "/session-notes": ["admin", "hr", "dsp"],
  "/incidents": ["admin", "hr", "dsp"],
  "/emar": ["admin", "hr", "dsp"],
  "/timecards": ["admin", "hr", "dsp"],
  "/compliance": ["admin", "hr"],
  "/service-codes": ["admin"],
  "/billing": ["admin"],
  "/users": ["admin"],
};

// Feature-level permissions
export const CAN = {
  // Incident Reports
  changeIncidentStatus: ["admin", "hr"],
  viewAllIncidents: ["admin", "hr"],

  // Timecards
  approveTimecards: ["admin", "hr"],
  viewAllTimecards: ["admin", "hr"],

  // Session Notes
  approveSessionNotes: ["admin", "hr"],

  // Staff
  editStaff: ["admin", "hr"],

  // Clients
  editClients: ["admin", "hr"],

  // Billing
  accessBilling: ["admin"],

  // Service Codes
  editServiceCodes: ["admin"],

  // Users
  manageUsers: ["admin"],

  // Goals
  editGoals: ["admin", "hr"],
};

/**
 * Check if a user role has a specific permission
 * @param {string} userRole - the current user's role
 * @param {string} permission - key from CAN
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
  return { admin: "Admin", hr: "HR", dsp: "DSP" }[role] || role;
}

export function getRoleBadgeColor(role) {
  return {
    admin: "bg-primary/10 text-primary border-primary/20",
    hr: "bg-chart-3/10 text-chart-3 border-chart-3/20",
    dsp: "bg-accent/10 text-accent border-accent/20",
  }[role] || "bg-muted text-muted-foreground";
}