import { useAuth } from "@/lib/AuthContext";
import { can, canAccessPath } from "@/lib/permissions";

export function useRole() {
  const { user } = useAuth();
  const role = user?.role || "dsp";

  return {
    role,
    isAdmin: role === "admin",
    isHR: role === "hr",
    isDSP: role === "dsp",
    can: (permission) => can(role, permission),
    canAccessPath: (path) => canAccessPath(role, path),
  };
}