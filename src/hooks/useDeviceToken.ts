import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

  // Check registration status periodically
  useEffect(() => {
    if (!user) return;

    const checkRegistration = async () => {
      // Wait for OneSignal to be ready
      const OS = (window as any).OneSignal;
      if (!OS) {
        // Retry after a delay
        const timeout = setTimeout(checkRegistration, 2000);
        return () => clearTimeout(timeout);
      }
      
      try {
        const subscriptionId = await OS.User?.PushSubscription?.id;
        const optedIn = await OS.User?.PushSubscription?.optedIn;
        console.log('🔔 useDeviceToken: subscription check -', { subscriptionId, optedIn });
        
        if (subscriptionId && optedIn) {
          setIsRegistered(true);
          setPermissionState('granted');
        }
      } catch (error) {
        console.log('🔔 useDeviceToken: Could not check registration:', error);
      }
    };

    // Check after a delay to allow OneSignal to initialize
    const timeout = setTimeout(checkRegistration, 3000);
    return () => clearTimeout(timeout);
  }, [user]);

  const registerTokenToBackend = async (token: string, platform: 'web' | 'ios' | 'android') => {
    try {
      console.log('🔔 useDeviceToken: Registering token to backend...');
      const { data, error } = await supabase.functions.invoke('register-device-token', {
        body: {
          token,
          platform,
          onesignalPlayerId: token,
        },
      });

      if (error) {
        console.error('❌ useDeviceToken: Backend registration failed:', error);
        return false;
      }
      
      console.log('✅ useDeviceToken: Token registered:', data);
      return true;
    } catch (error) {
      console.error('❌ useDeviceToken: Registration error:', error);
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
    if (!user) {
      console.log('🔔 useDeviceToken: No user, cannot register');
      return false;
    }

    setIsLoading(true);
    console.log('🔔 useDeviceToken: Starting registration flow...');

    try {
      const OS = (window as any).OneSignal;
      
      if (!OS) {
        console.warn('🔔 useDeviceToken: OneSignal not available yet');
        setIsLoading(false);
        return false;
      }

      // Request permission using OneSignal's slidedown
      console.log('🔔 useDeviceToken: Showing OneSignal prompt...');
      await OS.Slidedown.promptPush();
      
      // Wait for permission to be processed
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const permission = Notification.permission;
      console.log('🔔 useDeviceToken: Permission after prompt:', permission);
      
      if (permission === 'granted') {
        const subscriptionId = await OS.User.PushSubscription.id;
        console.log('🔔 useDeviceToken: Got subscription ID:', subscriptionId);
        
        if (subscriptionId) {
          const success = await registerTokenToBackend(subscriptionId, 'web');
          if (success) {
            setIsRegistered(true);
            setPermissionState('granted');
            setIsLoading(false);
            return true;
          }
        }
      }

      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('❌ useDeviceToken: Registration error:', error);
      setIsLoading(false);
      return false;
    }
  }, [user]);

  const unregisterToken = useCallback(async () => {
    if (!user) return;

    try {
      const OS = (window as any).OneSignal;
      if (OS) {
        const subscriptionId = await OS.User?.PushSubscription?.id;
        if (subscriptionId) {
          await supabase.functions.invoke('register-device-token', {
            body: { token: subscriptionId, action: 'delete' },
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
