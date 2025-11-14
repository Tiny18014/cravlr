import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function DebugRealtime({ user }: { user: any }) {
  const [status, setStatus] = useState("…");
  const [lastMsg, setLastMsg] = useState("");

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.log("DebugRealtime mounting with user:", user?.email);
    if (!user) return;
    
    const ch = supabase.channel("cravlr-debug");
    ch.on("broadcast", { event: "ping" }, (p) => {
      console.log("📡 Broadcast received:", p);
      setLastMsg(`recv:${p.payload.from}`);
    });
    
    ch.subscribe((s) => {
      console.log("📡 Broadcast channel status:", s);
      setStatus(s);
    });
    
    return () => {
      console.log("📡 Cleaning up broadcast channel");
      supabase.removeChannel(ch);
    };
  }, [user]);

  if (!import.meta.env.DEV) return null;

  async function sendPing() {
    console.log("📡 Sending broadcast ping from:", user?.email);
    const result = await supabase.channel("cravlr-debug").send({
      type: "broadcast",
      event: "ping",
      payload: { from: user?.email || "unknown" }
    });
    console.log("📡 Broadcast send result:", result);
  }

  return (
    <div style={{
      position: "fixed",
      left: 8,
      bottom: 8,
      zIndex: 9999,
      background: "#111",
      color: "#fff",
      padding: "6px 10px",
      borderRadius: 10,
      opacity: 0.9,
      fontSize: 12,
      fontFamily: "monospace"
    }}>
      RT:{status} • {lastMsg || "—"}
      <button 
        onClick={sendPing} 
        style={{
          marginLeft: 8,
          padding: "2px 6px",
          background: "#333",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          cursor: "pointer"
        }}
      >
        Send
      </button>
    </div>
  );
}