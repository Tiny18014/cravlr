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
          { event: 'INSERT', schema: 'public', table: 'recommendations' },
          (payload) => {
            console.log("🌍 Global recommendation INSERT:", payload.new);
            
            const rec = payload.new;
            
            // Only show recommendation notifications to the requester
            // We'll need to fetch the request to get requester_id
            const fetchRequestAndNotify = async () => {
              try {
                const { data: request, error } = await supabase
                  .from('food_requests')
                  .select('requester_id, food_type')
                  .eq('id', rec.request_id)
                  .single();
                
                console.log("🌍 Fetched request for recommendation:", { request, userID: user.id, error });
                
                if (error) {
                  console.error("🌍 Error fetching request for recommendation:", error);
                  return;
                }
                
                if (request && request.requester_id === user.id) {
                  const ping: LivePing = {
                    id: rec.id,
                    type: "recommendation",
                    foodType: request.food_type,
                    location: "0.5 mi away", // placeholder
                    urgency: "soon",
                    restaurantName: rec.restaurant_name
                  };

                  console.log("🌍 Setting recommendation ping:", ping);
                  setNextPing(ping);
                } else {
                  console.log("🌍 Recommendation not for current user, skipping");
                }
              } catch (error) {
                console.error("🌍 Error in fetchRequestAndNotify:", error);
              }
            };
            
            fetchRequestAndNotify();
          }
        )
        .subscribe((status) => {
          console.log("🌍 Global channel status:", status);
          
          if (status === 'CHANNEL_ERROR') {
            console.log("🌍 Channel error, reconnecting in 2s...");
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
    
    try {
      // Record the acceptance in the backend
      const { data, error } = await supabase.functions.invoke('request-accept-ignore', {
        body: { requestId, action: 'accept' }
      });

      if (error) throw error;
      console.log("✅ Request accepted globally:", data);

      // Clear the ping
      setNextPing(null);

      // Navigation will be handled by the page that calls this
    } catch (error) {
      console.error("❌ Error accepting request globally:", error);
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

  return (
    <NotificationsContext.Provider value={{
      nextPing,
      dnd,
      setDnd,
      acceptRequest,
      ignoreRequest
    }}>
      {children}
    </NotificationsContext.Provider>
  );
};