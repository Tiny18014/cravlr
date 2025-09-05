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
    
    // Primary: Listen for notifications (more reliable than direct table updates)
    const notifChannel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `requester_id=eq.${user.id}`,
        },
        (payload: any) => {
          console.log("🎯 Notification received:", payload);
          const notification = payload.new;
          
          if (notification.type === 'request_results') {
            console.log("🎯 Request results notification, showing popup for:", notification.request_id);
            pushPopup({
              type: "request_results",
              title: notification.payload?.title || "Your results are ready! 🎉",
              message: notification.payload?.message || "Tap to view the best picks.",
              cta: {
                label: "View Results",
                to: `/requests/${notification.request_id}/results`,
              },
              data: { requestId: notification.request_id }
            });
          }
        }
      )
      .subscribe((status) => {
        console.log("🎯 NotificationListener status:", status);
      });

    // Fallback: Also listen for request status changes with corrected filter syntax
    const requestChannel = supabase
      .channel(`requester-expiry-fallback-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "food_requests",
          filter: `requester_id=eq.${user.id}`, // string filter format
        },
        (payload: any) => {
          const timestamp = new Date().toISOString();
          console.log(`🎯 Request updated (fallback) at ${timestamp}:`, payload);
          
          const oldStatus = payload.old?.status;
          const newStatus = payload.new?.status;
          
          console.log(`🎯 Status change: ${oldStatus} -> ${newStatus}`);
          
          if (oldStatus !== "expired" && newStatus === "expired") {
            const popupTime = new Date().toISOString();
            console.log(`🎯 Request expired (fallback)! Showing results popup at ${popupTime}`);
            
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
        console.log("🎯 RequesterExpiryListener (fallback) status:", status);
      });


    return () => {
      console.log("🎯 Cleaning up RequesterExpiryListener");
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(requestChannel);
    };
  }, [user?.id, pushPopup]);

  return null;
}