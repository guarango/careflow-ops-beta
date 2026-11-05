import { useAuth } from "@/lib/AuthContext";
import { useRolePreview } from "@/lib/RolePreviewContext";
import { usePermissions } from "@/lib/PermissionsContext";
import { useImpersonation } from "@/lib/ImpersonationContext";

// Allow-list. A User record has app access ONLY when is_super_admin is true, or
// its role is exactly one of APP_ROLES and it is not deactivated. Anything else
// ("user", empty, unexpected values) has no access at all.
export const APP_ROLES = ["dsp", "manager", "admin"];

export function hasAppAccess(userRecord) {
  if (!userRecord) return false;
  if (userRecord.is_super_admin === true) return true;
  return APP_ROLES.includes(userRecord.role) && userRecord.is_deactivated !== true;
}

export function useRole() {
  const { user } = useAuth();
  const { previewRole } = useRolePreview();
  const { impersonation, isReadOnly } = useImpersonation();
  const permissions = usePermissions();

  // When impersonating, use the target user's role/bundles
  const effectiveUser = impersonation?.targetUser || user;
  // No default role: a User with no role (or a deactivated one) has no app access.
  const realRole = effectiveUser?.is_super_admin ? "super_admin" : (effectiveUser?.role || null);
  const role = previewRole || realRole;

  const bundles = {
    hr: effectiveUser?.hr_bundle || false,
    billing: effectiveUser?.billing_bundle || false,
  };

  return {
    role,
    realRole,
    effectiveUser,
    // Single source of truth for the whole-app access gate.
    hasAccess: hasAppAccess(effectiveUser),
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