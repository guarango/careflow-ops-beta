import React from "react";
import { useRole } from "@/hooks/useRole";
import AccessDenied from "./AccessDenied";

/**
 * Wraps a page and renders AccessDenied if the current role
 * cannot access the given path.
 */
export default function RouteGuard({ path, children }) {
  const { canAccessPath } = useRole();

  if (!canAccessPath(path)) {
    return <AccessDenied />;
  }

  return children;
}