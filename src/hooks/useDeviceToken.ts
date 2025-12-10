import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

declare global {
  interface Window {
    OneSignal: any;
  }
}

interface UseDeviceTokenReturn {
  isRegistered: boolean;
  isLoading: boolean;
  permissionState: NotificationPermission | 'unsupported';
  registerToken: () => Promise<boolean>;
  unregisterToken: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
}

export function useDeviceToken(): UseDeviceTokenReturn {
  const { user } = useAuth();
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');

  // Check if notifications are supported
  useEffect(() => {
    if (!('Notification' in window)) {
      setPermissionState('unsupported');
      setIsLoading(false);
      return;
    }

    setPermissionState(Notification.permission);
    setIsLoading(false);
  }, []);

  // Check if user is already registered when component mounts
  useEffect(() => {
    if (!user) return;

    const checkRegistration = async () => {
      const OS = window.OneSignal;
      if (!OS) return;

      try {
        const subscriptionId = await OS.User?.PushSubscription?.id;
        if (subscriptionId) {
          setIsRegistered(true);
        }
      } catch (error) {
        console.error('Error checking registration:', error);
      }
    };

    // Wait a bit for OneSignal to initialize
    const timeout = setTimeout(checkRegistration, 2000);
    return () => clearTimeout(timeout);
  }, [user]);

  const registerTokenToBackend = async (token: string, platform: 'web' | 'ios' | 'android') => {
    try {
      const { error } = await supabase.functions.invoke('register-device-token', {
        body: {
          token,
          platform,
          onesignalPlayerId: token,
        },
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to register token:', error);
      return false;
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }, []);

  const registerToken = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setIsLoading(true);

    try {
      const OS = window.OneSignal;
      
      if (!OS) {
        console.warn('OneSignal not available');
        setIsLoading(false);
        return false;
      }

      // Request permission using OneSignal's slidedown
      await OS.Slidedown.promptPush();
      
      // Wait a moment for permission to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const permission = await OS.Notifications.permission;
      
      if (permission) {
        const subscriptionId = await OS.User.PushSubscription.id;
        
        if (subscriptionId) {
          await registerTokenToBackend(subscriptionId, 'web');
          setIsRegistered(true);
          setPermissionState('granted');
          setIsLoading(false);
          return true;
        }
      }

      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Register token error:', error);
      setIsLoading(false);
      return false;
    }
  }, [user]);

  const unregisterToken = useCallback(async () => {
    if (!user) return;

    try {
      const OS = window.OneSignal;
      if (OS) {
        const subscriptionId = await OS.User?.PushSubscription?.id;
        if (subscriptionId) {
          await supabase.functions.invoke('register-device-token', {
            method: 'DELETE',
            body: { token: subscriptionId },
          });
        }
        await OS.User?.PushSubscription?.optOut();
      }
      setIsRegistered(false);
    } catch (error) {
      console.error('Unregister token error:', error);
    }
  }, [user]);

  return {
    isRegistered,
    isLoading,
    permissionState,
    registerToken,
    unregisterToken,
    requestPermission,
  };
}
