import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

type LivePing = {
  id: string;
  type: "request" | "recommendation";
  foodType: string;
  location: string;
  urgency: "quick" | "soon" | "extended";
  restaurantName?: string;
};

type NotificationsContextType = {
  nextPing: LivePing | null;
  dnd: boolean;
  setDnd: (value: boolean) => void;
  acceptRequest: (id: string) => void;
  ignoreRequest: (id: string) => void;
  clearPing: () => void;
};

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
};

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [nextPing, setNextPing] = useState<LivePing | null>(null);
  const [dnd, setDnd] = useState(false);
  const channelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  // Global realtime subscription - mounted once at app root
  useEffect(() => {
    if (!user?.id) {
      cleanup();
      return;
    }

    console.log("🌍 Setting up global realtime subscription for user:", user.id);
    
    const setupChannel = () => {
      const channel = supabase
        .channel('global-notifications')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'food_requests' },
          (payload) => {
            console.log("🌍 Global request INSERT:", payload.new);
            
            const request = payload.new;
            
            // Skip notifications for your own requests
            if (request.requester_id === user.id) {
              console.log("🌍 Skipping ping for own request:", request.id);
              return;
            }
            
            // Create ping (dedupe will be handled in popup component)
            const ping: LivePing = {
              id: request.id,
              type: "request",
              foodType: request.food_type,
              location: `${request.location_city}, ${request.location_state}`,
              urgency: request.response_window <= 15 ? 'quick' : 
                      request.response_window <= 60 ? 'soon' : 'extended'
            };

            console.log("🌍 Setting new ping:", ping);
            setNextPing(ping);
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'food_requests' },
          (payload) => {
            console.log("🌍 Global request UPDATE:", payload.new);
            
            const request = payload.new;
            const oldRequest = payload.old;
            
            // Only show notification when request closes/expires for the requester
            if (request.requester_id === user.id && 
                oldRequest.status === 'active' && 
                (request.status === 'closed' || request.status === 'expired')) {
              
              console.log("🌍 Request closed/expired for user, showing aggregated results");
              
              const ping: LivePing = {
                id: request.id,
                type: "recommendation",
                foodType: request.food_type,
                location: `${request.location_city}, ${request.location_state}`,
                urgency: "soon",
                restaurantName: "Multiple restaurants" // Will show aggregated results
              };

              console.log("🌍 Setting aggregated results ping:", ping);
              setNextPing(ping);
            }
          }
        )
        .subscribe((status) => {
          console.log("🌍 Global channel status:", status);
          
          if (status === 'SUBSCRIBED') {
            console.log("🌍 ✅ Notification subscription is now ACTIVE and listening for recommendations");
          } else if (status === 'CHANNEL_ERROR') {
            console.log("🌍 ❌ Channel error, reconnecting in 2s...");
            reconnectTimeoutRef.current = setTimeout(() => {
              cleanup();
              setupChannel();
            }, 2000);
          }
        });

      channelRef.current = channel;
    };

    setupChannel();

    return cleanup;
  }, [user?.id]); // Only depend on user.id, not the full user object

  const cleanup = () => {
    if (channelRef.current) {
      console.log("🌍 Cleaning up global channel");
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  };

  const acceptRequest = async (requestId: string) => {
    console.log("🌍 Global accept:", requestId);
    
    // Always clear the ping first, regardless of backend call success
    setNextPing(null);
    
    try {
      // Record the acceptance in the backend
      const { data, error } = await supabase.functions.invoke('request-accept-ignore', {
        body: { requestId, action: 'accept' }
      });

      if (error) throw error;
      console.log("✅ Request accepted globally:", data);

      // Navigation will be handled by the page that calls this
    } catch (error) {
      console.error("❌ Error accepting request globally:", error);
      // Don't re-show the ping even if backend call fails
    }
  };

  const ignoreRequest = async (requestId: string) => {
    console.log("🌍 Global ignore:", requestId);
    
    try {
      // Record the ignore in the backend
      const { data, error } = await supabase.functions.invoke('request-accept-ignore', {
        body: { requestId, action: 'ignore' }
      });

      if (error) throw error;
      console.log("✅ Request ignored globally:", data);
    } catch (error) {
      console.error("❌ Error ignoring request globally:", error);
    }

    // Clear the ping regardless
    setNextPing(null);
  };

  const clearPing = () => {
    console.log("🌍 Clearing current ping");
    setNextPing(null);
  };

  return (
    <NotificationsContext.Provider value={{
      nextPing,
      dnd,
      setDnd,
      acceptRequest,
      ignoreRequest,
      clearPing
    }}>
      {children}
    </NotificationsContext.Provider>
  );
};