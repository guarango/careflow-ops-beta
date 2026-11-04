import { useRole } from "@/hooks/useRole";

/**
 * Declarative action guard.
 *
 *   <Can do="deleteClient"><Button .../></Can>
 *
 * Renders children only when the current role holds the permission code.
 * Used to gate actions (create / edit / delete), not pages — pages use RouteGuard.
 */
export default function Can({ do: permission, children, fallback = null }) {
  const { can } = useRole();
  return can(permission) ? children : fallback;
}