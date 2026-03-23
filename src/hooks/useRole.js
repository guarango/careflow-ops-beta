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
    isAdmin: role === "admin",
    isHR: role === "hr",
    isDSP: role === "dsp",
    can: (permission) => can(role, permission),
    canAccessPath: (path) => canAccessPath(role, path),
  };
}