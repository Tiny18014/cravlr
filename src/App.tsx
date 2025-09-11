import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { UnifiedNotificationProvider } from "@/contexts/UnifiedNotificationContext";
import { UnifiedNotificationDisplay } from "@/components/UnifiedNotificationDisplay";
import { OneSignalInit } from "@/components/OneSignalInit";
import { UnifiedRequestManager } from "@/providers/UnifiedRequestManager";
import { PopupDebugBinder } from "@/components/PopupDebugBinder";
import Index from "./pages/Index";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import AuthFoodlover from "./pages/AuthFoodlover";
import AuthBusiness from "./pages/AuthBusiness";
import RequestFood from "./pages/RequestFood";
import BrowseRequests from "./pages/BrowseRequests";
import SendRecommendation from "./pages/SendRecommendation";
import Dashboard from "./pages/Dashboard";
import RequestResults from "./pages/RequestResults";
import AdminConversions from "./pages/AdminConversions";
import BusinessClaim from "./pages/BusinessClaim";
import BusinessOnboarding from "./pages/BusinessOnboarding";
import BusinessDashboard from "./pages/BusinessDashboard";
import AdminBusinessClaims from "./pages/AdminBusinessClaims";
import SampleAccounts from "./pages/SampleAccounts";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <UnifiedNotificationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <OneSignalInit />
          <BrowserRouter>
            <UnifiedRequestManager />
            <UnifiedNotificationDisplay />
            <PopupDebugBinder />
            {/* <TestNotificationButton /> */}
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/foodlover" element={<AuthFoodlover />} />
              <Route path="/auth/business" element={<AuthBusiness />} />
              <Route path="/request-food" element={<RequestFood />} />
              <Route path="/browse-requests" element={<BrowseRequests />} />
              <Route path="/recommend/:requestId" element={<SendRecommendation />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/requests/:requestId/results" element={<RequestResults />} />
              <Route path="/admin/conversions" element={<AdminConversions />} />
              <Route path="/admin/business-claims" element={<AdminBusinessClaims />} />
              <Route path="/business/claim" element={<BusinessClaim />} />
              <Route path="/business/onboarding" element={<BusinessOnboarding />} />
              <Route path="/business/dashboard" element={<BusinessDashboard />} />
              <Route path="/sample-accounts" element={<SampleAccounts />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </UnifiedNotificationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
