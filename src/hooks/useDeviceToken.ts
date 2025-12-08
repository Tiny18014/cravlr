import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

declare global {
  interface Window {
    OneSignal: any;
    __oneSignalInitialized?: boolean;
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

  // Initialize OneSignal when user logs in
  useEffect(() => {
    if (!user || window.__oneSignalInitialized) return;

    const initOneSignal = async () => {
      try {
        // Load OneSignal SDK if not already loaded
        if (!window.OneSignal) {
          await new Promise<void>((resolve, reject) => {
            const existingScript = document.querySelector('script[src*="OneSignalSDK"]');
            if (existingScript) {
              // Wait for existing script to load
              const checkLoaded = setInterval(() => {
                if (window.OneSignal) {
                  clearInterval(checkLoaded);
                  resolve();
                }
              }, 100);
              setTimeout(() => {
                clearInterval(checkLoaded);
                reject(new Error('OneSignal load timeout'));
              }, 10000);
              return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.onesignal.com/sdks/OneSignalSDK.js';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load OneSignal'));
            document.head.appendChild(script);
          });
        }

        // Initialize with your app ID
        const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
        if (!appId) {
          console.warn('OneSignal App ID not configured');
          return;
        }

        await window.OneSignal.init({
          appId,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false },
        });

        window.__oneSignalInitialized = true;

        // Set external user ID
        await window.OneSignal.setExternalUserId(user.id);

        // Check subscription status
        const isSubscribed = await window.OneSignal.isPushNotificationsEnabled();
        setIsRegistered(isSubscribed);

        if (isSubscribed) {
          // Register token in our database
          const playerId = await window.OneSignal.getUserId();
          if (playerId) {
            await registerTokenToBackend(playerId, 'web');
          }
        }
      } catch (error) {
        console.error('OneSignal init error:', error);
      }
    };

    initOneSignal();
  }, [user]);

  const registerTokenToBackend = async (token: string, platform: 'web' | 'ios' | 'android', onesignalPlayerId?: string) => {
    try {
      const { error } = await supabase.functions.invoke('register-device-token', {
        body: {
          token,
          platform,
          onesignalPlayerId: onesignalPlayerId || token,
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
      // First request permission
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setIsLoading(false);
        return false;
      }

      // If OneSignal is available, use it
      if (window.OneSignal && window.__oneSignalInitialized) {
        await window.OneSignal.showNativePrompt();
        const isSubscribed = await window.OneSignal.isPushNotificationsEnabled();
        
        if (isSubscribed) {
          const playerId = await window.OneSignal.getUserId();
          if (playerId) {
            await registerTokenToBackend(playerId, 'web', playerId);
            setIsRegistered(true);
            return true;
          }
        }
      } else {
        // Fallback: Use browser's native push if available
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
          });

          const token = JSON.stringify(subscription);
          await registerTokenToBackend(token, 'web');
          setIsRegistered(true);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Register token error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, requestPermission]);

  const unregisterToken = useCallback(async () => {
    if (!user) return;

    try {
      if (window.OneSignal && window.__oneSignalInitialized) {
        const playerId = await window.OneSignal.getUserId();
        if (playerId) {
          await supabase.functions.invoke('register-device-token', {
            method: 'DELETE',
            body: { token: playerId },
          });
        }
        await window.OneSignal.setSubscription(false);
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
