import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/contexts/NotificationsContext";

type LivePing = {
  id: string;
  type: "request" | "recommendation";
  foodType: string;
  location: string;
  urgency: "quick" | "soon" | "extended";
  restaurantName?: string;
};

export default function GlobalLiveRequestPopup() {
  const { nextPing, dnd, acceptRequest, ignoreRequest } = useNotifications();
  const navigate = useNavigate();
  const queueRef = useRef<LivePing[]>([]);
  const [active, setActive] = useState<LivePing | null>(null);

  // Harden popup queue - remove overzealous dedupe
  useEffect(() => {
    console.log("🎯 Global popup effect triggered:", { nextPing, dnd, active });
    
    if (!nextPing || dnd) {
      console.log("🎯 Skipping ping:", { hasNextPing: !!nextPing, dnd });
      return;
    }
    
    // Base dedupe on id AND type, not just id
    const existsInQueue = queueRef.current.find(q => q.id === nextPing.id && q.type === nextPing.type);
    const isCurrentlyActive = active?.id === nextPing.id && active?.type === nextPing.type;
    
    if (!existsInQueue && !isCurrentlyActive) {
      console.log("🎯 Adding ping to global queue:", nextPing);
      queueRef.current.push(nextPing);
      
      // Always setActive when no active ping
      if (!active) {
        console.log("🎯 Setting active immediately:", nextPing);
        const nextActive = queueRef.current.shift();
        if (nextActive) {
          setActive(nextActive);
        }
      }
    } else {
      console.log("🎯 Ping already exists, skipping:", nextPing.id, nextPing.type);
    }
  }, [nextPing, dnd, active]);

  useEffect(() => {
    if (!active) return;
    // Haptics on urgent
    if (active.urgency === "quick" && "vibrate" in navigator) {
      navigator.vibrate?.([120, 50, 120]);
    }
  }, [active]);

  const close = () => {
    console.log("🧪 Global popup close() called");
    setActive(null);
    
    // Guard for race conditions
    setTimeout(() => {
      const nxt = queueRef.current.shift();
      if (nxt) {
        console.log("🧪 Setting next active:", nxt);
        setActive(nxt);
      }
    }, 100);
  };

  const handleAccept = async (id: string) => {
    // Handle differently based on notification type
    if (active?.type === "recommendation") {
      // For recommendations, just dismiss and navigate - no backend call needed
      close();
      navigate('/dashboard');
    } else {
      // For requests, use the existing accept flow
      await acceptRequest(id);
      close();
      navigate(`/recommend/${id}`);
    }
  };

  const handleIgnore = async (id: string) => {
    // Handle differently based on notification type  
    if (active?.type === "recommendation") {
      // For recommendations, just dismiss - no backend call needed
      close();
    } else {
      // For requests, use the existing ignore flow
      await ignoreRequest(id);
      close();
    }
  };

  if (!active || dnd) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ 
        zIndex: 100000,
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      }}
    >
      <div className="rounded-2xl shadow-xl border bg-white p-3 animate-[slide-up_180ms_ease] text-black">
        <div className="text-sm text-gray-600 mb-1">
          {active.type === "request" ? "New request nearby" : "New recommendation received"}
        </div>
        <div className="font-semibold text-base">
          {active.type === "request" 
            ? `${active.foodType} • ${active.location}`
            : `${active.restaurantName} recommended for ${active.foodType}`
          }
        </div>
        <div className="mt-3 flex gap-2">
          <button
            className="flex-1 py-2 rounded-xl bg-black text-white"
            onClick={() => handleAccept(active.id)}
            aria-label={active.type === "request" ? "Accept request" : "View recommendation"}
          >
            {active.type === "request" ? "Accept" : "View"}
          </button>
          <button
            className="flex-1 py-2 rounded-xl border"
            onClick={() => handleIgnore(active.id)}
            aria-label="Dismiss"
          >
            {active.type === "request" ? "Ignore" : "Dismiss"}
          </button>
        </div>
      </div>
    </div>
  );
}