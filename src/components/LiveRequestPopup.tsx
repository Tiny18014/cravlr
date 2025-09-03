import { useEffect, useRef, useState } from "react";

type LivePing = {
  id: string;
  type: "request" | "recommendation";
  foodType: string;
  location: string; // "Concord, NC" or "0.8 mi away"
  urgency: "quick" | "soon" | "extended";
  restaurantName?: string; // For recommendations
};

export default function LiveRequestPopup({
  nextPing,               // parent passes newest ping here
  onAccept, onIgnore,     // handlers provided by parent
  dnd,                    // do-not-disturb on/off
}: {
  nextPing?: LivePing | null;
  onAccept: (id: string) => void;
  onIgnore: (id: string) => void;
  dnd: boolean;
}) {
  const queueRef = useRef<LivePing[]>([]);
  const [active, setActive] = useState<LivePing | null>(null);

  useEffect(() => {
    console.log("🎯 LiveRequestPopup effect triggered:", { nextPing, dnd, active });
    
    if (!nextPing || dnd) {
      console.log("🎯 Skipping ping:", { hasNextPing: !!nextPing, dnd });
      return;
    }
    
    // dedupe
    if (!queueRef.current.find(q => q.id === nextPing.id) &&
        active?.id !== nextPing.id) {
      console.log("🎯 Adding ping to queue:", nextPing);
      queueRef.current.push(nextPing);
      if (!active) {
        console.log("🎯 Setting active immediately:", nextPing);
        setActive(queueRef.current.shift()!);
      }
    } else {
      console.log("🎯 Ping already exists, skipping:", nextPing.id);
    }
  }, [nextPing, dnd, active]);

  useEffect(() => {
    if (!active) return;
    // haptics on urgent
    if (active.urgency === "quick" && "vibrate" in navigator) {
      navigator.vibrate?.([120, 50, 120]);
    }
  }, [active]);

  const close = () => {
    console.log("🧪 LiveRequestPopup close() called");
    setActive(null);
    const nxt = queueRef.current.shift();
    if (nxt) {
      console.log("🧪 Setting next active:", nxt);
      setActive(nxt);
    }
  };

  if (!active || dnd) return null;

  return (
    <div 
      className="fixed left-3 right-3 bottom-4"
      style={{ 
        zIndex: 100000,  // Ultra-high z-index
        paddingBottom: 'env(safe-area-inset-bottom)',
        position: 'fixed'
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
            onClick={() => { onAccept(active.id); close(); }}
            aria-label={active.type === "request" ? "Accept request" : "View recommendation"}
          >
            {active.type === "request" ? "Accept" : "View"}
          </button>
          <button
            className="flex-1 py-2 rounded-xl border"
            onClick={() => { onIgnore(active.id); close(); }}
            aria-label="Dismiss"
          >
            {active.type === "request" ? "Ignore" : "Dismiss"}
          </button>
        </div>
      </div>
    </div>
  );
}