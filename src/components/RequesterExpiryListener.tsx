import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePopupBus } from "@/hooks/usePopupBus";

export function RequesterExpiryListener() {
  const { user } = useAuth();
  const { pushPopup } = usePopupBus();

  useEffect(() => {
    if (!user?.id) return;

    console.log("🎯 Setting up RequesterExpiryListener for user:", user.id);

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
          console.log("🎯 RequesterExpiryListener received UPDATE:", payload);
          
          const oldStatus = payload.old?.status;
          const newStatus = payload.new?.status;
          
          console.log("🎯 Status change:", oldStatus, "->", newStatus);
          
          if (oldStatus !== "expired" && newStatus === "expired") {
            console.log("🎯 Request expired! Showing results popup");
            
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