import * as React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { UnifiedNotificationProvider } from "@/contexts/UnifiedNotificationContext";
import { UnifiedNotificationDisplay } from "@/components/UnifiedNotificationDisplay";
import { OneSignalInit } from "@/components/OneSignalInit";
import { UnifiedRequestManager } from "@/providers/UnifiedRequestManager";
import { PopupDebugBinder } from "@/components/PopupDebugBinder";
import DebugDBRealtime from "@/components/DebugDBRealtime";
import MobileDebugConsole from "@/components/MobileDebugConsole";
import CookieConsent from "@/components/CookieConsent";
import { useAuth } from "@/contexts/AuthContext";
import { RouteGuard } from "./components/RouteGuard";
import { DashboardBottomNav } from "./components/DashboardBottomNav";
import { useVisitReminderPoller } from "./hooks/useVisitReminderPoller";
import Index from "./pages/Index";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import AuthFoodlover from "./pages/AuthFoodlover";
import AuthBusiness from "./pages/AuthBusiness";
import UserOnboarding from "./pages/UserOnboarding";
import { RecommenderOnboarding } from "./components/onboarding/RecommenderOnboarding";
import { RequesterOnboarding } from "./components/onboarding/RequesterOnboarding";
import RequestFood from "./pages/RequestFood";
import BrowseRequests from "./pages/BrowseRequests";
import SendRecommendation from "./pages/SendRecommendation";
import Dashboard from "./pages/Dashboard";
import RequestResults from "./pages/RequestResults";
import FeedbackSubmission from "./pages/FeedbackSubmission";
import AdminConversions from "./pages/AdminConversions";
import AdminFeedback from "./pages/AdminFeedback";
import BusinessClaim from "./pages/BusinessClaim";
import BusinessOnboarding from "./pages/BusinessOnboarding";
import BusinessDashboard from "./pages/BusinessDashboard";
import AdminBusinessClaims from "./pages/AdminBusinessClaims";
import SampleAccounts from "./pages/SampleAccounts";
import HowItWorks from "./pages/HowItWorks";
import Profile from "./pages/Profile";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import SubscriptionSelection from "./pages/SubscriptionSelection";
import GuruLounge from "./pages/GuruLounge";
import GuruMapDetail from "./pages/GuruMapDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to listen to location changes
const LocationListener = ({ setCurrentPath }: { setCurrentPath: (path: string) => void }) => {
  const location = useLocation();
  
  React.useEffect(() => {
    setCurrentPath(location.pathname);
  }, [location.pathname, setCurrentPath]);
  
  return null;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
};

const AppContent = () => {
  const { user } = useAuth();
  const isDevelopment = import.meta.env.DEV;
  const [currentPath, setCurrentPath] = React.useState(window.location.pathname);
  
  // Poll for visit reminders every 30 seconds
  useVisitReminderPoller();
  
  return (
    <UnifiedNotificationProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OneSignalInit />
        <BrowserRouter>
          <LocationListener setCurrentPath={setCurrentPath} />
          <UnifiedRequestManager />
          <UnifiedNotificationDisplay />
          {isDevelopment && (
            <>
              <PopupDebugBinder />
              <DebugDBRealtime user={user} />
              <MobileDebugConsole />
            </>
          )}
          <CookieConsent />
            {/* <TestNotificationButton /> */}
            <Routes>
              <Route path="/" element={<RouteGuard><Index /></RouteGuard>} />
              <Route path="/welcome" element={<RouteGuard requiresAuth={false}><Welcome /></RouteGuard>} />
              <Route path="/auth" element={<RouteGuard requiresAuth={false}><Auth /></RouteGuard>} />
              <Route path="/auth/foodlover" element={<RouteGuard requiresAuth={false}><AuthFoodlover /></RouteGuard>} />
              <Route path="/auth/business" element={<RouteGuard requiresAuth={false}><AuthBusiness /></RouteGuard>} />
              <Route path="/onboarding" element={<RouteGuard requiresAuth={true}><UserOnboarding /></RouteGuard>} />
              <Route path="/onboarding/recommender" element={<RouteGuard requiresAuth={true}><RecommenderOnboarding /></RouteGuard>} />
              <Route path="/onboarding/requester" element={<RouteGuard requiresAuth={true}><RequesterOnboarding /></RouteGuard>} />
              <Route path="/request-food" element={<RouteGuard regularUserOnly={true}><RequestFood /></RouteGuard>} />
              <Route path="/browse-requests" element={<RouteGuard regularUserOnly={true}><BrowseRequests /></RouteGuard>} />
              <Route path="/recommend/:requestId" element={<RouteGuard regularUserOnly={true}><SendRecommendation /></RouteGuard>} />
              <Route path="/dashboard" element={<RouteGuard regularUserOnly={true}><Dashboard /></RouteGuard>} />
              <Route path="/profile" element={<RouteGuard><Profile /></RouteGuard>} />
              <Route path="/requests/:requestId/results" element={<RouteGuard regularUserOnly={true}><RequestResults /></RouteGuard>} />
              <Route path="/feedback/:recommendationId" element={<RouteGuard regularUserOnly={true}><FeedbackSubmission /></RouteGuard>} />
              <Route path="/admin/conversions" element={<RouteGuard><AdminConversions /></RouteGuard>} />
              <Route path="/admin/feedback" element={<RouteGuard><AdminFeedback /></RouteGuard>} />
              <Route path="/admin/business-claims" element={<RouteGuard><AdminBusinessClaims /></RouteGuard>} />
              <Route path="/business/claim" element={<RouteGuard businessOnly={true}><BusinessClaim /></RouteGuard>} />
              <Route path="/business/onboarding" element={<RouteGuard businessOnly={true}><BusinessOnboarding /></RouteGuard>} />
              <Route path="/business/subscription" element={<RouteGuard businessOnly={true}><SubscriptionSelection /></RouteGuard>} />
              <Route path="/business/dashboard" element={<RouteGuard businessOnly={true}><BusinessDashboard /></RouteGuard>} />
              <Route path="/how-it-works" element={<RouteGuard requiresAuth={false}><HowItWorks /></RouteGuard>} />
              <Route path="/sample-accounts" element={<RouteGuard requiresAuth={false}><SampleAccounts /></RouteGuard>} />
              <Route path="/terms-of-service" element={<RouteGuard requiresAuth={false}><TermsOfService /></RouteGuard>} />
              <Route path="/privacy-policy" element={<RouteGuard requiresAuth={false}><PrivacyPolicy /></RouteGuard>} />
              <Route path="/guru-lounge" element={<RouteGuard><GuruLounge /></RouteGuard>} />
              <Route path="/guru-lounge/map/:mapId" element={<RouteGuard><GuruMapDetail /></RouteGuard>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            {user && currentPath !== '/welcome' && <DashboardBottomNav />}
          </BrowserRouter>
        </TooltipProvider>
      </UnifiedNotificationProvider>
  );
};

export default App;
