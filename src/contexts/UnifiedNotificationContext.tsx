import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RequestService } from '@/services/RequestService';

export type NotificationType = 'new_request' | 'request_results';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
  data: any;
  priority: 'high' | 'normal' | 'low';
}

interface NotificationContextType {
  currentNotification: Notification | null;
  dismissNotification: () => void;
  dnd: boolean;
  setDnd: (value: boolean) => void;
  showNotification: (notification: Omit<Notification, 'id'>) => void;
}

const UnifiedNotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(UnifiedNotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within UnifiedNotificationProvider');
  }
  return context;
};

export const UnifiedNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [dnd, setDndState] = useState(false);
  const [notificationQueue, setNotificationQueue] = useState<Notification[]>([]);
  const [dismissedRequestIds, setDismissedRequestIds] = useState<Set<string>>(new Set());
  const channelsRef = useRef<any[]>([]);

  // Unified realtime subscription setup - wait for DND state to load
  useEffect(() => {
    if (!user?.id) {
      cleanup();
      return;
    }

    // Wait a moment for DND state to load before setting up subscriptions
    const timer = setTimeout(() => {
        // console.log("🔔 Setting up unified notification system for user:", user.id, "DND:", dnd);
    }, 1000);

    return () => clearTimeout(timer);
  }, [user?.id, dnd]);
  // Set up actual realtime subscriptions
  useEffect(() => {
    if (!user?.id) {
      cleanup();
      return;
    }

    console.log("🔔 Setting up realtime subscriptions for user:", user.id, "DND state:", dnd);
    
    // Listen for new requests (for recommenders)
    const requestChannel = supabase
      .channel('unified-requests')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'food_requests' },
        (payload) => {
          const request = payload.new;
          
          console.log("🔔 New request received, DND state:", dnd, "Request:", request.food_type);
          
          // Skip notifications for your own requests
          if (request.requester_id === user.id) {
            console.log("🔕 Skipping notification - own request");
            return;
          }
          
          // Skip if Do Not Disturb is enabled
          if (dnd) {
            console.log("🔕 Skipping notification due to DND mode");
            return;
          }
          
          console.log("📨 Proceeding to show notification");
          showNotification({
            type: 'new_request',
            title: 'New request nearby',
            message: `${request.food_type} • ${request.location_city}, ${request.location_state}`,
            actionLabel: 'Accept',
            actionUrl: `/recommend/${request.id}`,
            data: { requestId: request.id, requestType: 'accept' },
            priority: request.response_window <= 15 ? 'high' : 'normal'
          });
        }
      )
      .subscribe((status) => {
        // console.log("🔔 Request notifications status:", status);
      });

    // Listen for request results (for requesters)
    const notificationChannel = supabase
      .channel(`unified-notifications-${user.id}`)
      .on('postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `requester_id=eq.${user.id}`
        },
        async (payload) => {
          const notification = payload.new;
          
          // Skip if already read
          if (notification.read_at) {
            // console.log("🔕 Skipping notification - already read");
            return;
          }
          
          // Skip if request was already dismissed
          if (dismissedRequestIds.has(notification.request_id)) {
            // console.log("🔕 Skipping notification - request already dismissed");
            return;
          }
          
          // Skip if Do Not Disturb is enabled
          if (dnd) {
            // console.log("🔕 Skipping notification due to DND mode");
            return;
          }
          
          if (notification.type === 'request_results') {
            showNotification({
              type: 'request_results',
              title: "Time's up! 🎉",
              message: notification.payload?.message || "Your results are ready.",
              actionLabel: 'View Results',
              actionUrl: `/requests/${notification.request_id}/results`,
              data: { requestId: notification.request_id, requestType: 'view_results' },
              priority: 'high'
            });
          }
        }
      )
      .subscribe((status) => {
        console.log("🔔 User notifications status:", status);
      });

    // Listen for request status changes (fallback for expiry)
    const statusChannel = supabase
      .channel(`unified-status-${user.id}`)
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'food_requests',
          filter: `requester_id=eq.${user.id}`
        },
        async (payload) => {
          const oldStatus = payload.old?.status;
          const newStatus = payload.new?.status;
          
          if (oldStatus === 'active' && (newStatus === 'expired' || newStatus === 'closed')) {
            const recommendations = await RequestService.getRequestRecommendations(payload.new.id);
            
            if (recommendations.length > 0) {
              showNotification({
                type: 'request_results',
                title: "Time's up! 🎉",
                message: `Your ${payload.new.food_type} results are ready.`,
                actionLabel: 'View Results',
                actionUrl: `/requests/${payload.new.id}/results`,
                data: { requestId: payload.new.id, requestType: 'view_results' },
                priority: 'high'
              });
            }
          }
        }
      )
      .subscribe((status) => {
        // console.log("🔔 Status notifications status:", status);
      });

    channelsRef.current = [requestChannel, notificationChannel, statusChannel];

    return cleanup;
  }, [user?.id, dnd]); // Add dnd as dependency so subscriptions restart when DND changes

  // Load DND state from profile on mount
  useEffect(() => {
    if (!user?.id) return;
    
    const loadDndState = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('do_not_disturb')
          .eq('user_id', user.id)
          .single();
          
        if (profile) {
          setDndState(profile.do_not_disturb ?? false);
        } else {
          setDndState(false);
        }
      } catch (error) {
        console.error('Error loading DND state:', error);
        setDndState(false); // Default to false on error
      }
    };
    
    loadDndState();
  }, [user?.id]);

  const setDnd = async (enabled: boolean) => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ do_not_disturb: enabled })
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      setDndState(enabled);
    } catch (error) {
      console.error('❌ Error updating DND state:', error);
      // Revert state on error
      setDndState(!enabled);
    }
  };

  const cleanup = () => {
    channelsRef.current.forEach(channel => {
      if (channel) supabase.removeChannel(channel);
    });
    channelsRef.current = [];
  };

  const showNotification = (notification: Omit<Notification, 'id'>) => {
    // Double-check DND status before showing any notification
    if (dnd) {
      return;
    }

    const fullNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9)
    };

    // Enhanced deduplication - check both current notification and queue
    const isDuplicateOfCurrent = currentNotification && 
      currentNotification.type === fullNotification.type && 
      JSON.stringify(currentNotification.data) === JSON.stringify(fullNotification.data);
      
    const isDuplicateInQueue = notificationQueue.some(n => 
      n.type === fullNotification.type && 
      JSON.stringify(n.data) === JSON.stringify(fullNotification.data)
    );

    if (isDuplicateOfCurrent || isDuplicateInQueue) {
      return;
    }

    if (!currentNotification) {
      setCurrentNotification(fullNotification);
    } else {
      setNotificationQueue(prev => [...prev, fullNotification]);
    }
  };

  const dismissNotification = () => {
    // Add the request ID to dismissed list to prevent future notifications
    if (currentNotification?.data?.requestId) {
      setDismissedRequestIds(prev => new Set([...prev, currentNotification.data.requestId]));
    }
    
    // Clear current notification immediately
    setCurrentNotification(null);
    
    // Clear the entire queue to prevent multiple popups for the same event
    setNotificationQueue([]);
  };

  return (
    <UnifiedNotificationContext.Provider value={{
      currentNotification,
      dismissNotification,
      dnd,
      setDnd,
      showNotification
    }}>
      {children}
    </UnifiedNotificationContext.Provider>
  );
};