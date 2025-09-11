import { useEffect, useRef } from "react";
import { useClockSkew } from "@/hooks/useClockSkew";
import { useNotifications } from "@/contexts/UnifiedNotificationContext";
import { RequestService, FoodRequest } from "@/services/RequestService";

export const useRequestExpiry = (
  request: FoodRequest | null,
  userId?: string
) => {
  const { showNotification } = useNotifications();
  const skewMs = useClockSkew();
  const firedRef = useRef(false);
  const timeoutIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<number | null>(null);

  const fire = async () => {
    if (firedRef.current || !request) return;
    firedRef.current = true;
    
    console.log(`⏰ UNIFIED: Request ${request.id} expired, checking for recommendations`);

    const recommendations = await RequestService.getRequestRecommendations(request.id);

    if (recommendations.length > 0) {
      console.log(`⏰ UNIFIED: Showing expiry notification for ${request.id} with ${recommendations.length} recommendations`);
      showNotification({
        type: "request_results",
        title: "Time's up! 🎉",
        message: `Your ${request.food_type} results are ready.`,
        actionLabel: "View Results",
        actionUrl: `/requests/${request.id}/results`,
        data: { requestId: request.id, requestType: 'view_results' },
        priority: 'high'
      });
    } else {
      console.log(`⏰ UNIFIED: No recommendations found for ${request.id}, skipping notification`);
    }
  };

  useEffect(() => {
    // Guard: only requester gets their own expiry notification
    if (!request || !userId || request.requester_id !== userId) return;
    if (!request.expires_at) return;

    // Clear old timers
    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    firedRef.current = false;

    const serverExpiry = Date.parse(request.expires_at);
    const localNow = Date.now();
    const localExpiry = serverExpiry - skewMs;
    const msUntil = localExpiry - localNow;

    console.log(`⏰ UNIFIED: Scheduling expiry for ${request.id} in ${Math.max(0, Math.round(msUntil))}ms`);

    if (msUntil <= 50) {
      fire();
      return;
    }

    // Primary timer
    timeoutIdRef.current = window.setTimeout(fire, msUntil);

    // Backup heartbeat
    const beat = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now >= localExpiry) fire();
    };
    intervalIdRef.current = window.setInterval(beat, 1000);

    // Visibility resume
    const onVisibility = () => {
      if (document.visibilityState === "visible") beat();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [request?.id, request?.expires_at, request?.requester_id, userId, skewMs, showNotification]);
};