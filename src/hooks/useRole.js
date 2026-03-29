import { useAuth } from "@/lib/AuthContext";
import { useRolePreview } from "@/lib/RolePreviewContext";
import { can, canAccessPath } from "@/lib/permissions";

export function useRole() {
  const { user } = useAuth();
  const { previewRole } = useRolePreview();
  const realRole = user?.role || "dsp";
  const role = previewRole || realRole;

  return {
    role,
    realRole,
    isAdmin:          role === "admin",
    isHR:             role === "hr",
    isDSP:            role === "dsp",
    isLeadDSP:        role === "lead_dsp",
    isSupervisor:     role === "supervisor",
    isCaseManager:    role === "case_manager",
    isBCBA:           role === "bcba",
    isNurse:          role === "nurse",
    isBilling:        role === "billing",
    isProgramDirector: role === "program_director",
    can:              (permission) => can(role, permission),
    canAccessPath:    (path) => canAccessPath(role, path),
  };
}