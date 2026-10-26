import { useAuth } from "@/lib/AuthContext";
import { useRolePreview } from "@/lib/RolePreviewContext";
import { usePermissions } from "@/lib/PermissionsContext";
import { useImpersonation } from "@/lib/ImpersonationContext";

export function useRole() {
  const { user } = useAuth();
  const { previewRole } = useRolePreview();
  const { impersonation, isReadOnly } = useImpersonation();
  const permissions = usePermissions();

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
    isReadOnly,
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
    // Permission checks — single source (uses stored overrides merged with defaults)
    can:           (permission) => permissions.can(role, permission, bundles),
    canAccessPath: (path) => permissions.canAccessPath(role, path, bundles),
  };
}