import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNotifications } from "@/contexts/NotificationsContext";
import { supabase } from "@/integrations/supabase/client";

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
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle nextPing changes from context
  useEffect(() => {
    console.log("🎯 Global popup effect triggered:", { nextPing, dnd, active });
    
    // If DND is enabled, clear everything and don't show any notifications
    if (dnd) {
      console.log("🎯 DND enabled - clearing all notifications");
      setActive(null);
      queueRef.current = [];
      return;
    }
    
    // Handle explicit clear (when nextPing is set to null)
    if (nextPing === null) {
      console.log("🎯 nextPing cleared - removing active and processing queue");
      setActive(null);
      // Process next in queue after a short delay
      setTimeout(() => {
        const next = queueRef.current.shift();
        if (next) {
          console.log("🎯 Setting next from queue:", next);
          setActive(next);
        }
      }, 100);
      return;
    }
    
    // Only add new pings when they arrive
    if (nextPing) {
      // Base dedupe on id AND type, not just id
      const existsInQueue = queueRef.current.find(q => q.id === nextPing.id && q.type === nextPing.type);
      const isCurrentlyActive = active?.id === nextPing.id && active?.type === nextPing.type;
      
      if (!existsInQueue && !isCurrentlyActive) {
        console.log("🎯 Adding ping to global queue:", nextPing);
        queueRef.current.push(nextPing);
        
        // If no active ping, show this one immediately
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
      console.log("🎯 Handling aggregated results notification");
      
      // Close popup immediately and prevent any queued pings
      setActive(null);
      queueRef.current = []; // Clear queue to prevent popup from reappearing
      
      // Clear the ping from context to prevent re-triggering
      clearPing();
      
      // Mark as viewed to prevent re-showing
      try {
        await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('request_id', id)
          .eq('requester_id', nextPing?.id || '');
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
      
      // Navigate to the request results page to show aggregated recommendations
      console.log("🎯 Navigating to request results page");
      navigate(`/requests/${id}/results`, { replace: true });
      
    } else {
      console.log("🎯 Handling request notification - accepting request");
      
      // Close popup immediately and prevent any queued pings
      setActive(null);
      queueRef.current = []; // Clear queue to prevent popup from reappearing
      
      // For requests, use the existing accept flow
      try {
        await acceptRequest(id);
        // Don't navigate immediately - let the recommendation delay timer handle it
      } catch (error) {
        console.error("❌ Error accepting request:", error);
        // Even if there's an error, keep the popup closed
      }
    }
  };

  const handleIgnore = async (id: string) => {
    console.log("🎯 handleIgnore called with:", { id, activeType: active?.type, isProcessing });
    
    // Prevent multiple rapid clicks
    if (isProcessing) {
      console.log("🎯 Already processing, ignoring duplicate click");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Handle differently based on notification type  
      if (active?.type === "recommendation") {
        console.log("🎯 Dismissing aggregated results notification");
        
        // Mark as viewed to prevent re-showing
        try {
          await supabase
            .from('notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('request_id', id)
            .eq('requester_id', nextPing?.id || '');
        } catch (error) {
          console.error("Error marking notification as read:", error);
        }
        
        // For recommendations, clear the ping from context
        clearPing();
      } else {
        console.log("🎯 Ignoring request notification");
        // For requests, use the existing ignore flow
        await ignoreRequest(id);
      }
      
      // Clear current popup and queue properly
      setActive(null);
      queueRef.current = [];
    } catch (error) {
      console.error("❌ Error ignoring request:", error);
    } finally {
      setIsProcessing(false);
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
          {active.type === "request" ? "New request nearby" : "Your request has ended"}
        </div>
        <div className="font-semibold text-base">
          {active.type === "request" 
            ? `${active.foodType} • ${active.location}`
            : `Recommendations received for ${active.foodType}`
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
            aria-label={active.type === "request" ? "Accept request" : "View results"}
          >
            {active.type === "request" ? "Accept" : "View Results"}
          </button>
          <button
            className="flex-1 py-2 rounded-xl border"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleIgnore(active.id);
            }}
            disabled={isProcessing}
            aria-label="Dismiss"
          >
            {active.type === "request" ? "Ignore" : "Dismiss"}
          </button>
        </div>
      </div>
    </div>
  );
}