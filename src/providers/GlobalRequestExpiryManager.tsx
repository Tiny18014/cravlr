import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRequestExpiryTimer } from "@/hooks/useRequestExpiryTimer";

type FoodRequest = {
  id: string;
  food_type: string;
  expires_at: string;
  status: "active" | "expired" | string;
  requester_id: string;
};

function RequestTimer({ req, userId }: { req: FoodRequest; userId: string }) {
  // one hook per request (no hooks inside loops directly)
  useRequestExpiryTimer(req, userId);
  return null;
}

export function GlobalRequestExpiryManager() {
  const { user } = useAuth();
  const [active, setActive] = useState<FoodRequest[]>([]);

  // 1) initial+refresh loader
  const loadActive = async (uid: string) => {
    const { data, error } = await supabase
      .from("food_requests")
      .select("id, food_type, expires_at, status, requester_id")
      .eq("requester_id", uid)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      // PGRST116 = no rows; ignore
      if (error.code !== "PGRST116") console.error("loadActive error:", error);
      setActive([]);
      return;
    }
    setActive(data || []);
    console.log(`🌍 GlobalRequestExpiryManager: Found ${data?.length || 0} active requests`);
  };

  // 2) subscribe to this requester's request changes
  useEffect(() => {
    if (!user?.id) {
      setActive([]);
      return;
    }
    
    loadActive(user.id);

    const channel = supabase
      .channel(`req-global-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_requests",
          filter: `requester_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("🌍 GlobalRequestExpiryManager: Request change detected:", payload);
          loadActive(user.id);
        }
      )
      .subscribe((s) => console.log("GlobalRequestExpiryManager subscription:", s));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Avoid re-renders unless list changed
  const list = useMemo(() => active, [active]);

  if (!user?.id) return null;
  return (
    <>
      {list.map((req) => (
        <RequestTimer key={req.id} req={req} userId={user.id} />
      ))}
    </>
  );
}