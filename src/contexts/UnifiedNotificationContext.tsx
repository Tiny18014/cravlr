import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RequestService } from '@/services/RequestService';

export type NotificationType = 'new_request' | 'request_results' | 'visit_reminder';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
  data: any;
  priority: 'high' | 'normal' | 'low';
  timestamp: number;
}

interface NotificationContextType {
  currentNotification: Notification | null;
  dismissNotification: () => void;
  dnd: boolean;
  setDnd: (value: boolean) => void;
  showNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
}

const UnifiedNotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(UnifiedNotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within UnifiedNotificationProvider');
  }
  return context;
};

// Goal 6: Notification frequency control
const NOTIFICATION_COOLDOWN_MS = 30000; // 30 seconds between same-type notifications
const REMINDER_INTERVAL_HOURS = 3; // Hours between visit reminders

export const UnifiedNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [dnd, setDndState] = useState(false);
  const [notificationQueue, setNotificationQueue] = useState<Notification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [lastNotificationTime, setLastNotificationTime] = useState<Record<string, number>>({});
  const channelsRef = useRef<any[]>([]);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Goal 6: Check if enough time has passed since last notification of this type
  const canShowNotification = useCallback((type: NotificationType, dataId: string): boolean => {
    const key = `${type}-${dataId}`;
    const lastTime = lastNotificationTime[key];
    if (!lastTime) return true;
    return Date.now() - lastTime > NOTIFICATION_COOLDOWN_MS;
  }, [lastNotificationTime]);

  // Show notification with frequency control
  const showNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    if (dnd || !mountedRef.current) return;

    const dataId = notification.data?.requestId || notification.data?.recommendationId || 'default';
    
    // Goal 6: Check cooldown
    if (!canShowNotification(notification.type, dataId)) {
      console.log('🔕 Notification skipped due to cooldown:', notification.type);
      return;
    }

    // Check if already dismissed
    const dismissKey = `${notification.type}-${dataId}`;
    if (dismissedIds.has(dismissKey)) {
      console.log('🔕 Notification skipped - already dismissed:', dismissKey);
      return;
    }

    const fullNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };

    // Update last notification time
    setLastNotificationTime(prev => ({
      ...prev,
      [dismissKey]: Date.now()
    }));

    if (!currentNotification) {
      setCurrentNotification(fullNotification);
    } else {
      // Only queue if not a duplicate
      setNotificationQueue(prev => {
        const isDuplicate = prev.some(n => 
          n.type === fullNotification.type && 
          JSON.stringify(n.data) === JSON.stringify(fullNotification.data)
        );
        if (isDuplicate) return prev;
        return [...prev, fullNotification];
      });
    }
  }, [dnd, currentNotification, canShowNotification, dismissedIds]);

  // Dismiss notification and show next in queue
  const dismissNotification = useCallback(() => {
    if (currentNotification) {
      const dismissKey = `${currentNotification.type}-${currentNotification.data?.requestId || 'default'}`;
      setDismissedIds(prev => new Set([...prev, dismissKey]));
    }
    
    setCurrentNotification(null);
    
    // Show next notification after a brief delay
    setTimeout(() => {
      if (!mountedRef.current) return;
      setNotificationQueue(prev => {
        if (prev.length > 0) {
          const [next, ...rest] = prev;
          setCurrentNotification(next);
          return rest;
        }
        return prev;
      });
    }, 500);
  }, [currentNotification]);

  // Set up realtime subscriptions
  useEffect(() => {
    if (!user?.id) {
      channelsRef.current.forEach(channel => {
        if (channel) supabase.removeChannel(channel);
      });
      channelsRef.current = [];
      return;
    }

    console.log("🔔 Setting up realtime subscriptions for user:", user.id);
    
    // Listen for new requests (for recommenders)
    const requestChannel = supabase
      .channel('unified-requests')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'food_requests' },
        (payload) => {
          const request = payload.new;
          
          // Skip own requests
          if (request.requester_id === user.id) return;
          
          // Skip if DND
          if (dnd) return;
          
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
      .subscribe();

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
        (payload) => {
          const notification = payload.new;
          
          if (notification.read_at || dnd) return;
          
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
      .subscribe();

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
      .subscribe();

    channelsRef.current = [requestChannel, notificationChannel, statusChannel];

    return () => {
      channelsRef.current.forEach(channel => {
        if (channel) supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [user?.id, dnd, showNotification]);

  // Reset dismissed IDs periodically (every hour)
  useEffect(() => {
    const interval = setInterval(() => {
      setDismissedIds(new Set());
    }, 3600000);
    
    return () => clearInterval(interval);
  }, []);

  // Goal: Fetch unread notifications on mount (In-App Inbox)
  useEffect(() => {
    if (!user?.id) return;

    const fetchMissedNotifications = async () => {
      // Fetch 'new_request' notifications that haven't been acted on?
      // Actually, 'notifications' table usually stores results.
      // But now we are storing 'new_request' there too.
      // We want to show them if they are recent (e.g. last 2 hours).

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('requester_id', user.id) // The user receiving the notification
        .is('read_at', null)
        .gte('created_at', twoHoursAgo)
        .order('created_at', { ascending: false })
        .limit(1); // Anti-spam: Only show the most recent missed request

      if (error) {
        console.error('Error fetching missed notifications:', error);
        return;
      }

      if (data && data.length > 0) {
        console.log(`📥 Found missed notification`);
        const n = data[0];
        // Map DB notification to Context Notification
        // Payload structure: { requestId, foodType, location, message }
        const payload = n.payload as any;

        if (n.type === 'new_request') {
            showNotification({
                type: 'new_request',
                title: 'Missed Request',
                message: payload.message || 'New food request nearby',
                actionLabel: 'View',
                actionUrl: `/recommend/${payload.requestId}`,
                data: { requestId: payload.requestId, requestType: 'accept' },
                priority: 'normal'
            });
        }
      }
    };

    fetchMissedNotifications();
  }, [user?.id, showNotification]);

  const setDnd = (enabled: boolean) => {
    setDndState(enabled);
    if (enabled) {
      setCurrentNotification(null);
      setNotificationQueue([]);
    }
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