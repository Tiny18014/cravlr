import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import GlobalLiveRequestPopup from "@/components/GlobalLiveRequestPopup";
import TestNotificationButton from "@/components/TestNotificationButton";
import { OneSignalInit } from "@/components/OneSignalInit";
import { RequesterExpiryListener } from "@/components/RequesterExpiryListener";
import { GlobalRequestExpiryManager } from "@/providers/GlobalRequestExpiryManager";
import { PopupHost } from "@/components/PopupHost";
import { PopupDebugBinder } from "@/components/PopupDebugBinder";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import RequestFood from "./pages/RequestFood";
import BrowseRequests from "./pages/BrowseRequests";
import SendRecommendation from "./pages/SendRecommendation";
import Dashboard from "./pages/Dashboard";
import RequestResults from "./pages/RequestResults";
import AdminConversions from "./pages/AdminConversions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <NotificationsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <OneSignalInit />
          <BrowserRouter>
            <RequesterExpiryListener />
            <GlobalRequestExpiryManager />
            <PopupHost />
            <PopupDebugBinder />
            <GlobalLiveRequestPopup />
            <TestNotificationButton />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/request-food" element={<RequestFood />} />
              <Route path="/browse-requests" element={<BrowseRequests />} />
              <Route path="/recommend/:requestId" element={<SendRecommendation />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/requests/:requestId/results" element={<RequestResults />} />
              <Route path="/admin/conversions" element={<AdminConversions />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </NotificationsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
