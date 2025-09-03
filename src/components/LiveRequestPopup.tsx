import { useEffect, useRef, useState } from "react";

type LivePing = {
  id: string;
  foodType: string;
  location: string; // "Concord, NC" or "0.8 mi away"
  urgency: "quick" | "soon" | "extended";
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
    if (!nextPing || dnd) return;
    // dedupe
    if (!queueRef.current.find(q => q.id === nextPing.id) &&
        active?.id !== nextPing.id) {
      queueRef.current.push(nextPing);
      if (!active) setActive(queueRef.current.shift()!);
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
    setActive(null);
    const nxt = queueRef.current.shift();
    if (nxt) setActive(nxt);
  };

  if (!active || dnd) return null;

  return (
    <div 
      className="fixed left-3 right-3 bottom-4"
      style={{ 
        zIndex: 10000, 
        paddingBottom: 'env(safe-area-inset-bottom)',
        position: 'fixed'
      }}
    >
      <div className="rounded-2xl shadow-xl border bg-white p-3 animate-[slide-up_180ms_ease] text-black">
        <div className="text-sm text-gray-600 mb-1">New request nearby</div>
        <div className="font-semibold text-base">
          {active.foodType} • {active.location}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            className="flex-1 py-2 rounded-xl bg-black text-white"
            onClick={() => { onAccept(active.id); close(); }}
            aria-label="Accept request"
          >
            Accept
          </button>
          <button
            className="flex-1 py-2 rounded-xl border"
            onClick={() => { onIgnore(active.id); close(); }}
            aria-label="Ignore request"
          >
            Ignore
          </button>
        </div>
      </div>
    </div>
  );
}