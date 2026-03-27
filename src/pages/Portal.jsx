import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import PortalLogin from "@/components/portal/PortalLogin";
import PortalShell from "@/components/portal/PortalShell";
import PortalDashboard from "@/components/portal/PortalDashboard";
import PortalSchedule from "@/components/portal/PortalSchedule";
import PortalGoals from "@/components/portal/PortalGoals";
import PortalDocuments from "@/components/portal/PortalDocuments";
import PortalMessages from "@/components/portal/PortalMessages";
import PortalClientView from "@/components/portal/PortalClientView";
import PortalWeeklyReport from "@/components/portal/PortalWeeklyReport";
import PortalISPInput from "@/components/portal/PortalISPInput";
import PortalGrievancePage from "@/components/portal/PortalGrievance";
import PortalConsentView from "@/components/portal/PortalConsentView";
import PortalMemoryStream from "@/components/portal/PortalMemoryStream";
import PortalMilestones from "@/components/portal/PortalMilestones";

// Portal context – simulates a logged-in portal session (separate from staff auth)
export const PortalContext = React.createContext(null);

const DEMO_PORTAL_USER = {
  id: "portal-demo-001",
  full_name: "Sandra Rivera",
  email: "sandra.rivera@example.com",
  portal_role: "Guardian",
  relationship: "Mother",
  client_id: "demo-client",
  client_name: "Marcus Rivera",
  access_level: "Full",
  messaging_enabled: true,
};

export default function Portal() {
  const [portalUser, setPortalUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing portal session
    const stored = sessionStorage.getItem("portal_session");
    if (stored) {
      try { setPortalUser(JSON.parse(stored)); } catch {}
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (user) => {
    sessionStorage.setItem("portal_session", JSON.stringify(user));
    setPortalUser(user);
    navigate("/portal/dashboard");
  };

  const handleLogout = () => {
    sessionStorage.removeItem("portal_session");
    setPortalUser(null);
    navigate("/portal");
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PortalContext.Provider value={{ portalUser, handleLogout, handleLogin, DEMO_PORTAL_USER }}>
      <Routes>
        <Route
          path="/"
          element={portalUser ? <Navigate to="/portal/dashboard" replace /> : <PortalLogin />}
        />
        <Route
          path="/dashboard"
          element={portalUser ? <PortalShell><PortalDashboard /></PortalShell> : <Navigate to="/portal" replace />}
        />
        <Route
          path="/schedule"
          element={portalUser ? <PortalShell><PortalSchedule /></PortalShell> : <Navigate to="/portal" replace />}
        />
        <Route
          path="/goals"
          element={portalUser ? <PortalShell><PortalGoals /></PortalShell> : <Navigate to="/portal" replace />}
        />
        <Route
          path="/documents"
          element={portalUser ? <PortalShell><PortalDocuments /></PortalShell> : <Navigate to="/portal" replace />}
        />
        <Route
          path="/messages"
          element={portalUser ? <PortalShell><PortalMessages /></PortalShell> : <Navigate to="/portal" replace />}
        />
        <Route
          path="/my-care"
          element={portalUser ? <PortalShell><PortalClientView /></PortalShell> : <Navigate to="/portal" replace />}
        />
        <Route
          path="/weekly-reports"
          element={portalUser ? <PortalShell><PortalWeeklyReport /></PortalShell> : <Navigate to="/portal" replace />}
        />
        <Route
          path="/milestones"
          element={portalUser ? <PortalShell><PortalMilestones /></PortalShell> : <Navigate to="/portal" replace />}
        />
        <Route
          path="/isp-input"
          element={portalUser ? <PortalShell><PortalISPInput /></PortalShell> : <Navigate to="/portal" replace />}
        />
        <Route
          path="/concerns"
          element={portalUser ? <PortalShell><PortalGrievancePage /></PortalShell> : <Navigate to="/portal" replace />}
        />
        <Route
          path="/my-access"
          element={portalUser ? <PortalShell><PortalConsentView /></PortalShell> : <Navigate to="/portal" replace />}
        />
        <Route
          path="/memories"
          element={portalUser ? <PortalShell><PortalMemoryStream /></PortalShell> : <Navigate to="/portal" replace />}
        />
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    </PortalContext.Provider>
  );
}