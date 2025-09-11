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
  const [dnd, setDnd] = useState(false);
  const [notificationQueue, setNotificationQueue] = useState<Notification[]>([]);
  const channelsRef = useRef<any[]>([]);

  // Unified realtime subscription setup
  useEffect(() => {
    if (!user?.id) {
      cleanup();
      return;
    }

    console.log("🔔 Setting up unified notification system for user:", user.id);
    
    // Listen for new requests (for recommenders)
    const requestChannel = supabase
      .channel('unified-requests')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'food_requests' },
        (payload) => {
          const request = payload.new;
          
          // Skip notifications for your own requests
          if (request.requester_id === user.id) return;
          
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
        console.log("🔔 Request notifications status:", status);
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
        (payload) => {
          const notification = payload.new;
          
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
        console.log("🔔 Status notifications status:", status);
      });

    channelsRef.current = [requestChannel, notificationChannel, statusChannel];

    return cleanup;
  }, [user?.id]);

  const cleanup = () => {
    channelsRef.current.forEach(channel => {
      if (channel) supabase.removeChannel(channel);
    });
    channelsRef.current = [];
  };

  const showNotification = (notification: Omit<Notification, 'id'>) => {
    if (dnd) return;

    const fullNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9)
    };

    console.log("🔔 Showing notification:", fullNotification);

    // Dedupe by type and data
    const isDuplicate = notificationQueue.some(n => 
      n.type === fullNotification.type && 
      JSON.stringify(n.data) === JSON.stringify(fullNotification.data)
    );

    if (!isDuplicate) {
      if (!currentNotification) {
        setCurrentNotification(fullNotification);
      } else {
        setNotificationQueue(prev => [...prev, fullNotification]);
      }
    }
  };

  const dismissNotification = () => {
    console.log("🔔 Dismissing notification");
    setCurrentNotification(null);
    
    // Show next notification after a brief delay
    setTimeout(() => {
      setNotificationQueue(prev => {
        const [next, ...rest] = prev;
        if (next) {
          setCurrentNotification(next);
        }
        return rest;
      });
    }, 300);
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