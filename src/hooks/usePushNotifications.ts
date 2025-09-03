import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

declare global {
  interface Window {
    OneSignal: any;
  }
}

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission;
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
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
          // Register service worker
          await navigator.serviceWorker.register('/sw.js');

          // Initialize OneSignal
          if (window.OneSignal) {
            await window.OneSignal.init({
              appId: '8b8b8b8b-8b8b-8b8b-8b8b-8b8b8b8b8b8b', // Replace with actual OneSignal App ID
              serviceWorkerParam: { scope: '/' },
              serviceWorkerPath: '/sw.js',
              allowLocalhostAsSecureOrigin: true,
            });

            // Check if user is subscribed
            const isSubscribed = await window.OneSignal.isPushNotificationsEnabled();
            const permission = await window.OneSignal.getNotificationPermission();

            setState({
              isSupported: true,
              isSubscribed,
              isLoading: false,
              permission
            });

            // Store user ID for targeting
            if (user && isSubscribed) {
              await window.OneSignal.setExternalUserId(user.id);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing push notifications:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initializeOneSignal();
  }, [user]);

  const requestPermission = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      if (window.OneSignal) {
        await window.OneSignal.showNativePrompt();
        const isSubscribed = await window.OneSignal.isPushNotificationsEnabled();
        const permission = await window.OneSignal.getNotificationPermission();

        setState(prev => ({
          ...prev,
          isSubscribed,
          permission,
          isLoading: false
        }));

        // Store user ID for targeting
        if (user && isSubscribed) {
          await window.OneSignal.setExternalUserId(user.id);
        }

        return isSubscribed;
      }
      return false;
    } catch (error) {
      console.error('Error requesting permission:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  const unsubscribe = async () => {
    try {
      if (window.OneSignal) {
        await window.OneSignal.setSubscription(false);
        setState(prev => ({ ...prev, isSubscribed: false }));
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
    }
  };

  return {
    ...state,
    requestPermission,
    unsubscribe
  };
}