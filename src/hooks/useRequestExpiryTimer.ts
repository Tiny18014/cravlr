import { useEffect } from 'react';
import { usePopupBus } from '@/hooks/usePopupBus';

interface FoodRequest {
  id: string;
  food_type: string;
  expires_at: string;
  status: string;
  requester_id: string;
}

export const useRequestExpiryTimer = (request: FoodRequest | null, userId: string | undefined) => {
  const { pushPopup } = usePopupBus();

  useEffect(() => {
    if (!request?.expires_at || !userId || request.requester_id !== userId || request.status !== 'active') {
      return;
    }

    const expiryTime = new Date(request.expires_at).getTime();
    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;

    // Don't set timer if already expired
    if (timeUntilExpiry <= 0) return;

    console.log(`⏰ Setting local expiry timer for request ${request.id}: ${timeUntilExpiry}ms`);

    // Cap at 10 minutes to prevent excessive timeouts
    const timeoutDuration = Math.min(timeUntilExpiry + 500, 60_000 * 10); // small buffer, cap at 10m

    const timeoutId = window.setTimeout(() => {
      console.log(`⏰ Local timer fired for request ${request.id}`);
      
      pushPopup({
        type: "request_results",
        title: "Time's up! 🎉",
        message: `Your ${request.food_type} results are ready.`,
        cta: {
          label: "View Results",
          to: `/requests/${request.id}/results`,
        },
        data: { requestId: request.id }
      });
    }, timeoutDuration);

    return () => {
      console.log(`⏰ Clearing local timer for request ${request.id}`);
      clearTimeout(timeoutId);
    };
  }, [request?.id, request?.food_type, request?.expires_at, request?.status, request?.requester_id, userId, pushPopup]);
};