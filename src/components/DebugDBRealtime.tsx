import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function DebugDBRealtime({ user }: { user: any }) {
  const [lastEvt, setLastEvt] = useState("");

  useEffect(() => {
    console.log("DebugDBRealtime mounting with user:", user?.email);
    if (!user) return;
    
    const ch = supabase
      .channel("nibblr-db")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "food_requests" },
        (payload) => {
          console.log("🗄️ DB INSERT event received:", payload);
          setLastEvt(`INSERT ${new Date().toLocaleTimeString()}: ${payload.new?.food_type}`);
        }
      )
      .subscribe((s) => {
        console.log("🗄️ DB channel status:", s);
      });
      
    return () => {
      console.log("🗄️ Cleaning up DB channel");
      supabase.removeChannel(ch);
    };
  }, [user]);

  return lastEvt ? (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: "#10b981",
      color: "#fff",
      padding: "6px 8px",
      fontSize: 12,
      textAlign: "center",
      fontFamily: "monospace"
    }}>
      🗄️ {lastEvt}
    </div>
  ) : null;
}