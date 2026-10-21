import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useImpersonation } from "@/lib/ImpersonationContext";

/**
 * Logs each route change to the audit log while impersonating.
 * Must be rendered inside <Router> and <ImpersonationProvider>.
 */
export default function PageViewLogger() {
  const location = useLocation();
  const { impersonation, logPageView } = useImpersonation();
  const lastPath = useRef(null);

  useEffect(() => {
    if (!impersonation) return;
    const path = location.pathname;
    if (path === lastPath.current) return;
    lastPath.current = path;
    logPageView(path);
  }, [location.pathname, impersonation, logPageView]);

  return null;
}