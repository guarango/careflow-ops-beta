/**
 * Role-based permissions for CareOps Pro
 *
 * Roles:
 *  admin        — full access to everything
 *  program_director — all clinical/ops/finance; no system config
 *  supervisor   — case manager view + eMAR, staff editing, compliance
 *  case_manager — clinical + ISP + QoL + family portal + reports
 *  bcba         — clients, goals, BSP, QoL, incidents, reports
 *  nurse        — clients, eMAR (full), incidents, reports
 *  billing      — billing, payroll/timecards, compliance, reports
 *  hr           — staff, training, payroll, compliance, reports
 *  lead_dsp     — dsp + clients, BSP (read), training
 *  dsp          — dashboard, goals/sessions, eMAR, incidents, schedule/evv
 */

export const ROLES = {
  ADMIN: "admin",
  PROGRAM_DIRECTOR: "program_director",
  SUPERVISOR: "supervisor",
  CASE_MANAGER: "case_manager",
  BCBA: "bcba",
  NURSE: "nurse",
  BILLING: "billing",
  HR: "hr",
  LEAD_DSP: "lead_dsp",
  DSP: "dsp",
};

// Merged nav paths — what each sidebar item links to
// Paths shown in sidebar per role
export const NAV_ACCESS = {
  "/":                    ["admin", "program_director", "supervisor", "case_manager", "bcba", "nurse", "billing", "hr", "lead_dsp", "dsp"],
  "/clients":             ["admin", "program_director", "supervisor", "case_manager", "bcba", "nurse", "lead_dsp"],
  "/goals":               ["admin", "program_director", "supervisor", "case_manager", "bcba", "lead_dsp", "dsp"],
  "/session-notes":       ["admin", "program_director", "supervisor", "case_manager", "bcba", "lead_dsp", "dsp"],
  "/bsp":                 ["admin", "program_director", "supervisor", "case_manager", "bcba", "lead_dsp"],
  "/isp":                 ["admin", "program_director", "supervisor", "case_manager"],
  "/qol":                 ["admin", "program_director", "supervisor", "case_manager", "bcba"],
  "/emar":                ["admin", "program_director", "supervisor", "nurse", "lead_dsp", "dsp"],
  "/incidents":           ["admin", "program_director", "supervisor", "case_manager", "bcba", "nurse", "lead_dsp", "dsp"],
  "/staff":               ["admin", "program_director", "supervisor", "case_manager", "hr"],
  "/schedule":            ["admin", "program_director", "supervisor", "case_manager", "hr", "lead_dsp", "dsp"],
  "/evv":                 ["admin", "program_director", "supervisor", "case_manager", "hr", "lead_dsp", "dsp"],
  "/training":            ["admin", "program_director", "supervisor", "case_manager", "hr", "lead_dsp"],
  "/family-portal-admin": ["admin", "program_director", "supervisor", "case_manager"],
  "/billing":             ["admin", "program_director", "billing"],
  "/service-codes":       ["admin", "program_director", "billing"],
  "/timecards":           ["admin", "program_director", "supervisor", "billing", "hr", "lead_dsp", "dsp"],
  "/payroll":             ["admin", "program_director", "billing", "hr"],
  "/compliance":          ["admin", "program_director", "supervisor", "billing", "hr"],
  "/reports":             ["admin", "program_director", "supervisor", "case_manager", "bcba", "nurse", "billing", "hr"],
  "/hr":                  ["admin", "program_director", "hr"],
  "/users":               ["admin"],
  "/agency-admin":        ["admin"],
  "/ai-hub":              ["admin"],
  "/role-preview":        ["admin"],
  "/super-admin":         ["admin"],
};

// Feature-level permissions
export const CAN = {
  approveTimecards:       ["admin", "program_director", "supervisor", "hr", "billing"],
  viewAllTimecards:       ["admin", "program_director", "supervisor", "hr", "billing"],
  approveSessionNotes:    ["admin", "program_director", "supervisor", "case_manager", "bcba"],
  editStaff:              ["admin", "program_director", "supervisor", "hr"],
  changeIncidentStatus:   ["admin", "program_director", "supervisor"],
  viewAllIncidents:       ["admin", "program_director", "supervisor", "case_manager", "nurse"],
  editClients:            ["admin", "program_director", "supervisor", "case_manager"],
  accessBilling:          ["admin", "program_director", "billing"],
  editServiceCodes:       ["admin", "billing"],
  manageUsers:            ["admin"],
  editGoals:              ["admin", "program_director", "supervisor", "case_manager", "bcba"],
  viewIncidentBadge:      ["admin", "program_director", "supervisor"],
  manageTraining:         ["admin", "program_director", "supervisor", "hr"],
  viewAllStaff:           ["admin", "program_director", "hr"],
  accessSettings:         ["admin"],
};

export function can(userRole, permission) {
  const allowed = CAN[permission];
  if (!allowed) return false;
  return allowed.includes(userRole);
}

export function canAccessPath(userRole, path) {
  // Strip query string for matching
  const cleanPath = path.split("?")[0];
  const allowed = NAV_ACCESS[cleanPath];
  if (!allowed) return userRole === "admin";
  return allowed.includes(userRole);
}

export function getRoleLabel(role) {
  return {
    admin:            "Admin",
    program_director: "Program Director",
    supervisor:       "Supervisor",
    case_manager:     "Case Manager",
    bcba:             "BCBA",
    nurse:            "Nurse",
    billing:          "Billing",
    hr:               "HR",
    lead_dsp:         "Lead DSP",
    dsp:              "DSP",
  }[role] || role;
}

export function getRoleBadgeColor(role) {
  return {
    admin:            "bg-primary/10 text-primary border-primary/20",
    program_director: "bg-violet-500/10 text-violet-500 border-violet-500/20",
    supervisor:       "bg-blue-500/10 text-blue-500 border-blue-500/20",
    case_manager:     "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    bcba:             "bg-purple-500/10 text-purple-500 border-purple-500/20",
    nurse:            "bg-teal-500/10 text-teal-500 border-teal-500/20",
    billing:          "bg-amber-500/10 text-amber-500 border-amber-500/20",
    hr:               "bg-chart-3/10 text-chart-3 border-chart-3/20",
    lead_dsp:         "bg-sky-500/10 text-sky-500 border-sky-500/20",
    dsp:              "bg-accent/10 text-accent border-accent/20",
  }[role] || "bg-muted text-muted-foreground border-muted";
}