import { useEffect } from "react";
import { usePopupBus } from "@/hooks/usePopupBus";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function PopupDebugBinder() {
  const { pushPopup } = usePopupBus();
  const { user } = useAuth();
  
  useEffect(() => {
    (window as any).__pushPopup = pushPopup;
    
    // Add test functions for the full notification flow
    (window as any).__testNotification = async (requestId: string) => {
      if (!user?.id) {
        console.error("❌ No user logged in");
        return;
      }
      
      console.log("🧪 Testing notification flow for request:", requestId);
      const { data, error } = await supabase.from('notifications').insert({
        requester_id: user.id,
        request_id: requestId,
        type: 'request_results',
        payload: { title: 'Test Notification', message: 'Manual test notification' }
      });
      
      if (error) {
        console.error("❌ Failed to insert test notification:", error);
      } else {
        console.log("✅ Test notification inserted:", data);
      }
    };
    
    (window as any).__testRLSRecommendations = async (requestId: string) => {
      if (!user?.id) {
        console.error("❌ No user logged in");
        return;
      }
      
      console.log("🧪 Testing RLS for recommendations on request:", requestId);
      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .eq('request_id', requestId);
      
      if (error) {
        console.error("❌ RLS test failed:", error);
      } else {
        console.log("✅ RLS test passed, recommendations:", data);
      }
    };
    
    (window as any).__testSaferRPC = async (requestId: string) => {
      console.log("🧪 Testing safer RPC for request:", requestId);
      const { data, error } = await supabase.rpc('get_request_results', { 
        p_request_id: requestId 
      });
      
      if (error) {
        console.error("❌ RPC test failed:", error);
      } else {
        console.log("✅ RPC test passed, results:", data);
      }
    };
    
    console.log("🔧 Debug functions bound:");
    console.log("  __pushPopup({ type: 'request_results', title: 'Test', message: 'Hello', cta:{label:'Open', to:'/'} })");
    console.log("  __testNotification('request-id') - Test notification insertion");
    console.log("  __testRLSRecommendations('request-id') - Test RLS for recommendations");
    console.log("  __testSaferRPC('request-id') - Test safer RPC function");
  }, [pushPopup, user]);
  
  return null;
}