import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  const { nextPing, dnd, acceptRequest, ignoreRequest, clearPing } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const queueRef = useRef<LivePing[]>([]);
  const [active, setActive] = useState<LivePing | null>(null);

  // Handle nextPing changes from context
  useEffect(() => {
    console.log("🎯 Global popup effect triggered:", { nextPing, dnd, active });
    
    // If nextPing is null (cleared by context), clear local state immediately
    if (!nextPing) {
      console.log("🎯 nextPing cleared by context, clearing local state");
      setActive(null);
      queueRef.current = [];
      return;
    }
    
    if (dnd) {
      console.log("🎯 Skipping ping due to DND:", { hasNextPing: !!nextPing, dnd });
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
    console.log("🎯 handleAccept called with:", { id, activeType: active?.type, currentPath: location.pathname });
    
    // Handle differently based on notification type
    if (active?.type === "recommendation") {
      console.log("🎯 Handling recommendation notification");
      
      // Close popup immediately and prevent any queued pings
      setActive(null);
      queueRef.current = []; // Clear queue to prevent popup from reappearing
      
      // Clear the ping from context to prevent re-triggering
      clearPing();
      
      // Always navigate to dashboard with received tab, don't use reload
      console.log("🎯 Navigating to dashboard with received tab");
      navigate('/dashboard?tab=received', { replace: true });
      
    } else {
      console.log("🎯 Handling request notification - accepting request");
      
      // Close popup immediately and prevent any queued pings
      setActive(null);
      queueRef.current = []; // Clear queue to prevent popup from reappearing
      
      // For requests, use the existing accept flow
      try {
        await acceptRequest(id);
        // Navigate immediately after acceptance
        navigate(`/recommend/${id}`);
      } catch (error) {
        console.error("❌ Error accepting request:", error);
        // Even if there's an error, keep the popup closed
      }
    }
  };

  const handleIgnore = async (id: string) => {
    console.log("🎯 handleIgnore called with:", { id, activeType: active?.type });
    
    // Close popup immediately
    setActive(null);
    
    // Handle differently based on notification type  
    if (active?.type === "recommendation") {
      console.log("🎯 Dismissing recommendation notification");
      // For recommendations, clear the ping from context
      clearPing();
    } else {
      console.log("🎯 Ignoring request notification");
      // For requests, use the existing ignore flow
      try {
        await ignoreRequest(id);
      } catch (error) {
        console.error("❌ Error ignoring request:", error);
      }
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAccept(active.id);
            }}
            aria-label={active.type === "request" ? "Accept request" : "View recommendation"}
          >
            {active.type === "request" ? "Accept" : "View"}
          </button>
          <button
            className="flex-1 py-2 rounded-xl border"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleIgnore(active.id);
            }}
            aria-label="Dismiss"
          >
            {active.type === "request" ? "Ignore" : "Dismiss"}
          </button>
        </div>
      </div>
    </div>
  );
}