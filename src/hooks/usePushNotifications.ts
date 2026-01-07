import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission | 'default';
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    permission: 'default'
  });

  useEffect(() => {
    const initializeOneSignal = async () => {
      try {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window) {
          setState(prev => ({
            ...prev,
            isSupported: true,
            isLoading: false,
            permission: Notification.permission
          }));

          // Check if OneSignal is available and user is subscribed
          const OS = (window as any).OneSignal;
          if (OS?.User?.PushSubscription) {
            const subscriptionId = await OS.User.PushSubscription.id;
            const optedIn = await OS.User.PushSubscription.optedIn;
            
            setState(prev => ({
              ...prev,
              isSubscribed: !!subscriptionId && optedIn,
              permission: Notification.permission
            }));
          }
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Error initializing push notifications:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    // Wait a bit for OneSignal to initialize
    const timeout = setTimeout(initializeOneSignal, 2000);
    return () => clearTimeout(timeout);
  }, [user]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const OS = (window as any).OneSignal;
      if (OS?.Slidedown) {
        await OS.Slidedown.promptPush();
        
        // Wait for permission to be processed
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const permission = Notification.permission;
        const subscriptionId = await OS.User?.PushSubscription?.id;
        const optedIn = await OS.User?.PushSubscription?.optedIn;

        setState(prev => ({
          ...prev,
          isSubscribed: !!subscriptionId && optedIn,
          permission,
          isLoading: false
        }));

        return permission === 'granted';
      }
      
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    } catch (error) {
      console.error('Error requesting permission:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    try {
      const OS = (window as any).OneSignal;
      if (OS?.User?.PushSubscription) {
        await OS.User.PushSubscription.optOut();
        setState(prev => ({ ...prev, isSubscribed: false }));
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
    }
  }, []);

  return {
    ...state,
    requestPermission,
    unsubscribe
  };
}
