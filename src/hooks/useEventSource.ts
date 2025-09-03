import { useEffect, useRef, useState } from "react";

type LiveEvent =
  | { type: "hello" | "heartbeat"; serverTime: string }
  | { type: "request.created" | "request.updated" | "request.closed" | "recommendation.created"; requestId: string; serverTime: string; payload: any };

interface UseEventSourceOptions {
  onEvent: (e: LiveEvent) => void;
  onError?: (err: any) => void;
  fallbackPoll?: () => void;
}

export function useEventSource(
  url: string,
  { onEvent, onError, fallbackPoll }: UseEventSourceOptions
) {
  const [connected, setConnected] = useState(false);
  const [usingFallback, setUsingFallback] = useState(true); // Start with fallback
  const pollIntervalRef = useRef<number | null>(null);

  const cleanup = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const startPolling = () => {
    if (!fallbackPoll || pollIntervalRef.current) return;
    
    console.log('Starting polling mode for real-time updates');
    setUsingFallback(true);
    setConnected(true);
    
    // Initial poll
    fallbackPoll();
    
    // Poll every 5 seconds for more responsive updates
    pollIntervalRef.current = window.setInterval(() => {
      fallbackPoll();
    }, 5000);
  };

  useEffect(() => {
    // For now, just use polling since SSE is complex to get right
    startPolling();

    // Reconnect when tab becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden && !connected) {
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cleanup();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [url]);

  return { connected, usingFallback };
}