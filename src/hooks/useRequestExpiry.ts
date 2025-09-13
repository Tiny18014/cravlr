import { useEffect, useRef } from "react";
import { useClockSkew } from "@/hooks/useClockSkew";
import { useNotifications } from "@/contexts/UnifiedNotificationContext";
import { RequestService, FoodRequest } from "@/services/RequestService";

// Global store to track which requests have already fired expiry notifications
const firedRequests = new Set<string>();

// Global store to track notification counts per request to prevent spam
const notificationCounts = new Map<string, number>();
const MAX_NOTIFICATIONS_PER_REQUEST = 1;

export const useRequestExpiry = (
  request: FoodRequest | null,
  userId?: string
) => {
  const { showNotification } = useNotifications();
  const skewMs = useClockSkew();
  const timeoutIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<number | null>(null);

  const fire = async () => {
    if (!request || firedRequests.has(request.id)) return;
    
    // Check notification count to prevent spam
    const currentCount = notificationCounts.get(request.id) || 0;
    if (currentCount >= MAX_NOTIFICATIONS_PER_REQUEST) {
      return;
    }
    
    firedRequests.add(request.id);
    notificationCounts.set(request.id, currentCount + 1);

    const recommendations = await RequestService.getRequestRecommendations(request.id);

    if (recommendations.length > 0) {
      showNotification({
        type: "request_results",
        title: "Time's up! 🎉",
        message: `Your ${request.food_type} results are ready.`,
        actionLabel: "View Results",
        actionUrl: `/requests/${request.id}/results`,
        data: { requestId: request.id, requestType: 'view_results' },
        priority: 'high'
      });
    }
  };

  useEffect(() => {
    // Guard: only requester gets their own expiry notification
    if (!request || !userId || request.requester_id !== userId) return;
    if (!request.expires_at) return;
    
    // Skip if already fired for this request
    if (firedRequests.has(request.id)) return;

    // Clear old timers
    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    if (intervalIdRef.current) clearInterval(intervalIdRef.current);

    const serverExpiry = Date.parse(request.expires_at);
    const localNow = Date.now();
    const localExpiry = serverExpiry - skewMs;
    const msUntil = localExpiry - localNow;

    if (msUntil <= 50) {
      fire();
      return;
    }

    // Primary timer
    timeoutIdRef.current = window.setTimeout(fire, msUntil);

    // Backup heartbeat - but only if request hasn't fired yet and not too frequent
    const beat = () => {
      if (document.visibilityState !== "visible") return;
      if (firedRequests.has(request.id)) return; // Skip if already fired
      const now = Date.now();
      if (now >= localExpiry) fire();
    };
    
    // Reduce heartbeat frequency to every 5 seconds instead of every second
    intervalIdRef.current = window.setInterval(beat, 5000);

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

  // Cleanup function to reset notification counts when component unmounts
  useEffect(() => {
    return () => {
      if (request?.id) {
        // Don't reset fired status, but we can clean up counts after a delay
        setTimeout(() => {
          notificationCounts.delete(request.id);
        }, 60000); // Clean up after 1 minute
      }
    };
  }, [request?.id]);
};