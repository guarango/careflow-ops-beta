import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { RolePreviewProvider } from '@/lib/RolePreviewContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Staff from './pages/Staff';
import Clients from './pages/Clients';
import SessionNotes from './pages/SessionNotes';
import Incidents from './pages/Incidents';
import EMAR from './pages/EMAR';
import Timecards from './pages/Timecards';
import Compliance from './pages/Compliance';
import Billing from './pages/Billing';
import Goals from './pages/Goals';
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
        <Route path="/staff" element={<Staff />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/session-notes" element={<SessionNotes />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/emar" element={<EMAR />} />
        <Route path="/timecards" element={<Timecards />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/service-codes" element={<ServiceCodes />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/role-preview" element={<RolePreview />} />
        <Route path="/evv" element={<EVV />} />
        <Route path="/hr" element={<HR />} />
        <Route path="/agency-admin" element={<AgencyAdmin />} />
      </Route>
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