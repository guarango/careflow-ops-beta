import { useAuth } from "@/lib/AuthContext";
import { useRolePreview } from "@/lib/RolePreviewContext";
import { can, canAccessPath } from "@/lib/permissions";
import { useImpersonation } from "@/lib/ImpersonationContext";

export function useRole() {
  const { user } = useAuth();
  const { previewRole } = useRolePreview();
  const { impersonation } = useImpersonation();

  // When impersonating, use the target user's role/bundles
  const effectiveUser = impersonation?.targetUser || user;
  const realRole = effectiveUser?.is_super_admin ? "super_admin" : (effectiveUser?.role || "dsp");
  const role = previewRole || realRole;

  const bundles = {
    hr: effectiveUser?.hr_bundle || false,
    billing: effectiveUser?.billing_bundle || false,
  };

  return {
    role,
    realRole,
    bundles,
    // Role flags
    isSuperAdmin:  role === "super_admin",
    isManager:     role === "manager",
    isAdmin:       role === "admin" || role === "super_admin",
    isDSP:         role === "dsp",
    // Legacy flags (deprecated — use can() instead)
    isHR:          false,
    isBilling:     false,
    isLeadDSP:     false,
    isSupervisor:  false,
    isCaseManager: false,
    isBCBA:        false,
    isNurse:       false,
    isProgramDirector: false,
    // Permission checks — single source
    can:           (permission) => can(role, permission, bundles),
    canAccessPath: (path) => canAccessPath(role, path, bundles),
  };
}