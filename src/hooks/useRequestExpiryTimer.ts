import { useEffect, useRef } from "react";
import { usePopupBus } from "@/hooks/usePopupBus";
import { useClockSkew } from "@/hooks/useClockSkew";
import { supabase } from "@/integrations/supabase/client";

interface FoodRequest {
  id: string;
  food_type: string;
  expires_at: string; // ISO (UTC)
  status: string;     // 'active' | 'expired' | ...
  requester_id: string;
}

export const useRequestExpiryTimer = (
  request: FoodRequest | null,
  userId?: string
) => {
  const { pushPopup } = usePopupBus();
  const skewMs = useClockSkew();
  const firedRef = useRef(false);
  const timeoutIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<number | null>(null);

  // De-duped fire
  const fire = async () => {
    if (firedRef.current || !request) return;
    firedRef.current = true;
    const at = new Date().toISOString();
    console.log(
      `⏰ Expiry fired for ${request.id} at ${at} (expected: ${request.expires_at})`
    );

    // Check if there are any recommendations before showing popup
    const { data: recommendations, error } = await supabase
      .from('recommendations')
      .select('id')
      .eq('request_id', request.id);

    if (error) {
      console.error('Error checking recommendations:', error);
      return;
    }

    // Only show popup if there are recommendations
    if (recommendations && recommendations.length > 0) {
      pushPopup({
        type: "request_results",
        title: "Time's up! 🎉",
        message: `Your ${request.food_type} results are ready.`,
        cta: { label: "View Results", to: `/requests/${request.id}/results` },
        data: { requestId: request.id },
      });
    } else {
      console.log(`⏰ No popup sent for ${request.id} - no recommendations found`);
    }
  };

  useEffect(() => {
    // Guard: only requester gets their own expiry popup
    if (!request || !userId || request.requester_id !== userId) return;
    if (!request.expires_at) return;

    // NOTE: do NOT rely on request.status being 'active' here; race conditions can occur.
    // We only care about the time boundary crossing.

    // Clear old timers
    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    firedRef.current = false;

    const serverExpiry = Date.parse(request.expires_at); // UTC
    const localNow = Date.now();
    const localExpiry = serverExpiry - skewMs; // align to local clock
    const msUntil = localExpiry - localNow;

    console.log(
      `⏰ Scheduling expiry for ${request.id}. server=${request.expires_at}, skew=${skewMs}ms, localDelay=${Math.max(
        0,
        Math.round(msUntil)
      )}ms`
    );

    // If already expired (or within a tiny threshold), fire immediately
    if (msUntil <= 50) {
      fire();
      return;
    }

    // Primary: precise timeout (still subject to background throttling)
    timeoutIdRef.current = window.setTimeout(() => {
      fire();
    }, msUntil);

    // Secondary: 1s heartbeat ONLY when visible (catches throttled timeouts)
    const beat = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now >= localExpiry) fire();
    };
    intervalIdRef.current = window.setInterval(beat, 1000);

    // Visibility resume: fire immediately if we missed it while hidden
    const onVisibility = () => {
      if (document.visibilityState === "visible") beat();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [request?.id, request?.food_type, request?.expires_at, request?.requester_id, userId, skewMs]);
};