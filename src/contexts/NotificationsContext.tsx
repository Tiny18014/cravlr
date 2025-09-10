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

  // Load DND setting from user profile
  useEffect(() => {
    const loadDndSetting = async () => {
      if (!user?.id) {
        setDnd(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('notify_recommender')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading DND setting:', error);
          return;
        }

        // DND is enabled when notify_recommender is false
        const isDnd = profile ? !profile.notify_recommender : false;
        console.log("🔔 Loaded DND setting:", { notify_recommender: profile?.notify_recommender, isDnd });
        setDnd(isDnd);
      } catch (error) {
        console.error('Error loading DND setting:', error);
      }
    };

    loadDndSetting();
  }, [user?.id]);

  // Global realtime subscription - mounted once at app root
  useEffect(() => {
    if (!user?.id) {
      cleanup();
      return;
    }

    console.log("🌍 Setting up global realtime subscription for user:", user.id);
    console.log("🌍 Current DND state:", dnd);
    
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
            
            // Skip notifications if DND is enabled
            if (dnd) {
              console.log("🌍 Skipping ping due to DND enabled:", request.id);
              return;
            }
            
            // Check if collection period has ended for this request
            const createdAt = new Date(request.created_at);
            const responseWindow = request.response_window || 1; // Default 1 minute
            const collectionEndTime = new Date(createdAt.getTime() + (responseWindow * 60 * 1000));
            const now = new Date();
            
            if (now < collectionEndTime) {
              // Collection period hasn't ended yet, schedule notification
              const delay = collectionEndTime.getTime() - now.getTime();
              console.log(`🌍 Scheduling notification in ${delay}ms for request ${request.id}`);
              setTimeout(() => {
                // Create ping after collection period ends
                const ping: LivePing = {
                  id: request.id,
                  type: "request",
                  foodType: request.food_type,
                  location: `${request.location_city}, ${request.location_state}`,
                  urgency: request.response_window <= 15 ? 'quick' : 
                          request.response_window <= 60 ? 'soon' : 'extended'
                };
                console.log("🌍 Setting scheduled ping:", ping);
                setNextPing(ping);
              }, delay);
              return;
            }
            
            // Collection period has ended, show notification immediately
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
            console.log("🌍 Global request OLD:", payload.old);
            
            const request = payload.new;
            const oldRequest = payload.old;
            
            // Debug logging
            console.log("🌍 Checking notification conditions:", {
              requester_id: request.requester_id,
              current_user: user.id,
              old_status: oldRequest?.status,
              new_status: request.status,
              is_requester: request.requester_id === user.id,
              status_changed: oldRequest?.status !== request.status
            });
            
            // Show notification when request closes/expires for the requester
            // Only show if we haven't already shown a notification for this request
            if (request.requester_id === user.id && 
                oldRequest && 
                oldRequest.status === 'active' && 
                (request.status === 'closed' || request.status === 'expired')) {
              
              console.log("🌍 Request closed/expired for user, checking if notification already shown");
              
              // Check if notification already exists and was read
              supabase
                .from('notifications')
                .select('read_at')
                .eq('request_id', request.id)
                .eq('requester_id', user.id)
                .eq('type', 'request_results')
                .single()
                .then(({ data: existingNotification, error }) => {
                  // Only show popup if no notification exists or it hasn't been read
                  if (error || !existingNotification || !existingNotification.read_at) {
                    console.log("🌍 No existing read notification found, showing results popup");
                    
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
                  } else {
                    console.log("🌍 Notification already read, not showing popup again");
                  }
                });
            } else {
              console.log("🌍 No notification - conditions not met for update event");
              console.log("🌍 Request belongs to:", request.requester_id);
              console.log("🌍 Current user:", user.id);
              console.log("🌍 Status change:", oldRequest?.status, "->", request.status);
            }
          }
        )
        .subscribe((status) => {
          console.log("🌍 Global channel status:", status);
          
          if (status === 'SUBSCRIBED') {
            console.log("🌍 ✅ Notification subscription is now ACTIVE and listening for food requests");
            console.log("🌍 Current user ID:", user.id);
            console.log("🌍 Listening for INSERT/UPDATE events on food_requests table");
          } else if (status === 'CHANNEL_ERROR') {
            console.log("🌍 ❌ Channel error, reconnecting in 2s...");
            reconnectTimeoutRef.current = setTimeout(() => {
              cleanup();
              setupChannel();
            }, 2000);
          } else {
            console.log("🌍 Channel status changed to:", status);
          }
        });

      channelRef.current = channel;
    };

    setupChannel();

    return cleanup;
  }, [user?.id, dnd]); // Depend on user.id and dnd state

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

  // Update DND setting when toggled
  const updateDnd = async (enabled: boolean) => {
    console.log("🔔 Updating DND setting:", enabled);
    setDnd(enabled);
    
    if (user?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ notify_recommender: !enabled })
          .eq('user_id', user.id);
      } catch (error) {
        console.error('Error updating DND setting:', error);
      }
    }
  };

  return (
    <NotificationsContext.Provider value={{
      nextPing,
      dnd,
      setDnd: updateDnd,
      acceptRequest,
      ignoreRequest,
      clearPing
    }}>
      {children}
    </NotificationsContext.Provider>
  );
};