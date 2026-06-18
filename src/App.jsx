import { useEffect } from 'react';
import { Toaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector('main')?.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { PlanProvider, usePlan } from '@/lib/PlanContext';
import SmartHome from '@/components/SmartHome';
import Login from '@/pages/Login';
import ResetPassword from '@/pages/ResetPassword';
import PlanSelection from '@/pages/PlanSelection';
import Settings from '@/pages/Settings';

// Business imports
import BusinessLayout from '@/components/business/BusinessLayout';
import BusinessDashboard from '@/pages/business/BusinessDashboard';
import BusinessTransactions from '@/pages/business/BusinessTransactions';
import BusinessKPIs from '@/pages/business/BusinessKPIs';
import BusinessStats from '@/pages/business/BusinessStats';
import BusinessEmployees from '@/pages/business/BusinessEmployees';
import BusinessAchievements from '@/pages/business/BusinessAchievements';
import BusinessGoals from '@/pages/business/BusinessGoals';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const BL = ({ children }) => <BusinessLayout>{children}</BusinessLayout>;

const BusinessRoutes = () => (
  <Routes>
    <Route index element={<Navigate to="/BusinessDashboard" replace />} />
    <Route path="/BusinessDashboard"   element={<BL><BusinessDashboard /></BL>} />
    <Route path="/BusinessTransactions" element={<BL><BusinessTransactions /></BL>} />
    <Route path="/BusinessKPIs"        element={<BL><BusinessKPIs /></BL>} />
    <Route path="/BusinessStats"       element={<BL><BusinessStats /></BL>} />
    <Route path="/BusinessEmployees"   element={<BL><BusinessEmployees /></BL>} />
    <Route path="/BusinessAchievements" element={<BL><BusinessAchievements /></BL>} />
    <Route path="/BusinessGoals"       element={<BL><BusinessGoals /></BL>} />
    <Route path="/Settings"            element={<BL><Settings /></BL>} />
    <Route path="/PlanSelection"       element={<PlanSelection />} />
    <Route path="*"                    element={<Navigate to="/BusinessDashboard" replace />} />
  </Routes>
);

const PlanGate = () => {
  const { planLoading, needsPlanSelection, isBusiness } = usePlan();

  if (planLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (needsPlanSelection) {
    return <PlanSelection />;
  }

  if (isBusiness) {
    return <BusinessRoutes />;
  }

  return (
    <Routes>
      <Route index element={<SmartHome />} />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/PlanSelection" element={<PlanSelection />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <PlanProvider>
      <PlanGate />
    </PlanProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <NavigationTracker />
          <Routes>
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
