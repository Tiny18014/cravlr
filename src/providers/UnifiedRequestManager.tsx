import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { RequestService, FoodRequest } from "@/services/RequestService";
import { useRequestExpiry } from "@/hooks/useRequestExpiry";
import { supabase } from "@/integrations/supabase/client";

function RequestExpiryTimer({ request, userId }: { request: FoodRequest; userId: string }) {
  useRequestExpiry(request, userId);
  return null;
}

export function UnifiedRequestManager() {
  const { user } = useAuth();
  const [activeRequests, setActiveRequests] = useState<FoodRequest[]>([]);

  const loadActiveRequests = async (uid: string) => {
    const requests = await RequestService.getUserActiveRequests(uid);
    setActiveRequests(requests);
    // console.log(`🔄 UNIFIED: Loaded ${requests.length} active requests for user ${uid}`);
  };

  useEffect(() => {
    if (!user?.id) {
      setActiveRequests([]);
      return;
    }
    
    loadActiveRequests(user.id);

    // Listen for changes to user's requests
    const channel = supabase
      .channel(`unified-user-requests-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_requests",
          filter: `requester_id=eq.${user.id}`,
        },
        (payload) => {
          // console.log("🔄 UNIFIED: User request change detected:", payload);
          loadActiveRequests(user.id);
        }
      )
      .subscribe((status) => {
        // console.log("🔄 UNIFIED: Request manager subscription:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const memoizedRequests = useMemo(() => activeRequests, [activeRequests]);

  if (!user?.id) return null;

  return (
    <>
      {memoizedRequests.map((request) => (
        <RequestExpiryTimer key={request.id} request={request} userId={user.id} />
      ))}
    </>
  );
}