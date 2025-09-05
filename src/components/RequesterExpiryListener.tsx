import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePopupBus } from "@/hooks/usePopupBus";

export function RequesterExpiryListener() {
  const { user } = useAuth();
  const { pushPopup } = usePopupBus();

  useEffect(() => {
    if (!user?.id) {
      console.log("🎯 RequesterExpiryListener: No user ID, skipping setup");
      return;
    }

    console.log("🎯 Setting up RequesterExpiryListener for user:", user.id);
    console.log("🎯 Current timestamp:", new Date().toISOString());

    const channel = supabase
      .channel(`req-expiry-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "food_requests",
          filter: `requester_id=eq.${user.id}`, // server-side filter
        },
        (payload: any) => {
          const timestamp = new Date().toISOString();
          console.log(`🎯 RequesterExpiryListener received UPDATE at ${timestamp}:`, payload);
          
          const oldStatus = payload.old?.status;
          const newStatus = payload.new?.status;
          
          console.log(`🎯 Status change: ${oldStatus} -> ${newStatus}`);
          console.log(`🎯 Request expires_at: ${payload.new?.expires_at}, updated_at: ${payload.new?.updated_at}`);
          
          if (oldStatus !== "expired" && newStatus === "expired") {
            const popupTime = new Date().toISOString();
            console.log(`🎯 Request expired! Showing results popup at ${popupTime}`);
            
            // Fire "View Results" popup instantly, on ANY page
            pushPopup({
              type: "request_results",
              title: "Time's up! 🎉",
              message: `Your ${payload.new.food_type} results are ready.`,
              cta: {
                label: "View Results",
                to: `/requests/${payload.new.id}/results`,
              },
              data: { requestId: payload.new.id }
            });
          }
        }
      )
      .subscribe((status) => {
        console.log("🎯 RequesterExpiryListener status:", status);
      });

    return () => {
      console.log("🎯 Cleaning up RequesterExpiryListener");
      supabase.removeChannel(channel);
    };
  }, [user?.id, pushPopup]);

  return null;
}