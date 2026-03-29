import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { RolePreviewProvider } from '@/lib/RolePreviewContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from './components/layout/AppLayout';
import RouteGuard from './components/shared/RouteGuard';
import Dashboard from './pages/Dashboard';
import Staff from './pages/Staff';
import Clients from './pages/Clients';
import SessionNotes from './pages/SessionNotes.jsx';
import Incidents from './pages/Incidents';
import EMAR from './pages/EMAR';
import Timecards from './pages/Timecards';
import Compliance from './pages/Compliance';
import Billing from './pages/Billing';
import Goals from './pages/Goals.jsx';
import Schedule from './pages/Schedule';
import ServiceCodes from './pages/ServiceCodes';
import UserManagement from './pages/UserManagement';
import Payroll from './pages/Payroll';
import RolePreview from './pages/RolePreview';
import EVV from './pages/EVV';
import HR from './pages/HR';
import SuperAdmin from './pages/SuperAdmin';
import AgencyAdmin from './pages/AgencyAdmin';
import OnboardingWizard from './pages/OnboardingWizard';
import APIDocs from './pages/APIDocs';
import Portal from './pages/Portal';
import Reports from './pages/Reports';
import AIHub from './pages/AIHub';
import MobileApp from './pages/MobileApp';
import BSP from './pages/BSP';
import ISP from './pages/ISP';
import Training from './pages/Training';
import QoL from './pages/QoL';
import FamilyPortalAdmin from './pages/FamilyPortalAdmin';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/staff" element={<RouteGuard path="/staff"><Staff /></RouteGuard>} />
        <Route path="/clients" element={<RouteGuard path="/clients"><Clients /></RouteGuard>} />
        <Route path="/session-notes" element={<RouteGuard path="/session-notes"><SessionNotes /></RouteGuard>} />
        <Route path="/incidents" element={<RouteGuard path="/incidents"><Incidents /></RouteGuard>} />
        <Route path="/emar" element={<RouteGuard path="/emar"><EMAR /></RouteGuard>} />
        <Route path="/timecards" element={<RouteGuard path="/timecards"><Timecards /></RouteGuard>} />
        <Route path="/compliance" element={<RouteGuard path="/compliance"><Compliance /></RouteGuard>} />
        <Route path="/billing" element={<RouteGuard path="/billing"><Billing /></RouteGuard>} />
        <Route path="/goals" element={<RouteGuard path="/goals"><Goals /></RouteGuard>} />
        <Route path="/schedule" element={<RouteGuard path="/schedule"><Schedule /></RouteGuard>} />
        <Route path="/service-codes" element={<RouteGuard path="/service-codes"><ServiceCodes /></RouteGuard>} />
        <Route path="/users" element={<RouteGuard path="/users"><UserManagement /></RouteGuard>} />
        <Route path="/payroll" element={<RouteGuard path="/payroll"><Payroll /></RouteGuard>} />
        <Route path="/role-preview" element={<RouteGuard path="/role-preview"><RolePreview /></RouteGuard>} />
        <Route path="/evv" element={<RouteGuard path="/evv"><EVV /></RouteGuard>} />
        <Route path="/hr" element={<RouteGuard path="/hr"><HR /></RouteGuard>} />
        <Route path="/agency-admin" element={<RouteGuard path="/agency-admin"><AgencyAdmin /></RouteGuard>} />
        <Route path="/reports" element={<RouteGuard path="/reports"><Reports /></RouteGuard>} />
        <Route path="/ai-hub" element={<RouteGuard path="/ai-hub"><AIHub /></RouteGuard>} />
        <Route path="/bsp" element={<RouteGuard path="/bsp"><BSP /></RouteGuard>} />
        <Route path="/isp" element={<RouteGuard path="/isp"><ISP /></RouteGuard>} />
        <Route path="/training" element={<RouteGuard path="/training"><Training /></RouteGuard>} />
        <Route path="/qol" element={<RouteGuard path="/qol"><QoL /></RouteGuard>} />
        <Route path="/family-portal-admin" element={<RouteGuard path="/family-portal-admin"><FamilyPortalAdmin /></RouteGuard>} />
      </Route>
      {/* Mobile PWA — dedicated layout */}
      <Route path="/mobile" element={<MobileApp />} />
      {/* Standalone routes — no sidebar layout */}
      <Route path="/super-admin" element={<SuperAdmin />} />
      <Route path="/onboarding" element={<OnboardingWizard />} />
      <Route path="/api/docs" element={<APIDocs />} />
      {/* Family Portal — completely separate environment */}
      <Route path="/portal/*" element={<Portal />} />
      <Route path="*" element={<PageNotFound />} />

    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <RolePreviewProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </RolePreviewProvider>
    </AuthProvider>
  )
}

export default App