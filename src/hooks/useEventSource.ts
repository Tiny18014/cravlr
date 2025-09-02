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
  const [usingFallback, setUsingFallback] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<number>(1000);
  const retryCountRef = useRef<number>(0);
  const pollIntervalRef = useRef<number | null>(null);

  const cleanup = () => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const startPolling = () => {
    if (!fallbackPoll || pollIntervalRef.current) return;
    
    setUsingFallback(true);
    setConnected(true);
    
    // Initial poll
    fallbackPoll();
    
    // Poll every 10 seconds
    pollIntervalRef.current = window.setInterval(() => {
      fallbackPoll();
    }, 10000);
  };

  const connect = () => {
    if (!url) return;
    
    cleanup();

    try {
      // Get the auth token for the request
      const authToken = localStorage.getItem('sb-edazolwepxbdeniluamf-auth-token');
      const urlWithAuth = authToken ? `${url}&auth=${encodeURIComponent(authToken)}` : url;
      
      const es = new EventSource(urlWithAuth);
      esRef.current = es;

      es.onopen = () => {
        console.log('SSE connection opened');
        setConnected(true);
        setUsingFallback(false);
        retryRef.current = 1000;
        retryCountRef.current = 0;
        
        // Stop polling if it was running
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };

      es.onmessage = (msg) => {
        try {
          const evt = JSON.parse(msg.data) as LiveEvent;
          onEvent(evt);
        } catch (e) {
          console.warn("Malformed SSE message", e);
        }
      };

      es.onerror = (err) => {
        console.error('SSE error:', err);
        setConnected(false);
        es.close();
        onError?.(err);
        
        retryCountRef.current++;
        
        // After 3 consecutive failures, switch to polling
        if (retryCountRef.current >= 3) {
          console.log('Switching to polling fallback after multiple SSE failures');
          startPolling();
          return;
        }
        
        // Retry with exponential backoff
        const retryDelay = Math.min(30000, retryRef.current);
        setTimeout(() => {
          retryRef.current *= 2;
          connect();
        }, retryDelay);
      };
      
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      onError?.(error);
      startPolling();
    }
  };

  useEffect(() => {
    connect();

    // Reconnect when tab becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden && !connected && !usingFallback) {
        connect();
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