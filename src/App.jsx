import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
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
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App