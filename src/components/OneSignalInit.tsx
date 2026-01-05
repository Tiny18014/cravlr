import { useEffect, useCallback, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import OneSignal from 'react-onesignal';

// Track initialization state globally
let onesignalInitialized = false;
let onesignalAppId: string | null = null;

export const OneSignalInit = () => {
  const { user } = useAuth();
  const registrationAttempted = useRef(false);
  const [appIdLoaded, setAppIdLoaded] = useState(false);
  const initAttempted = useRef(false);

  // Fetch OneSignal App ID from backend
  useEffect(() => {
    if (!user) {
      console.log('🔔 OneSignal: No user logged in, skipping init');
      return;
    }
    
    if (onesignalAppId) {
      console.log('🔔 OneSignal: App ID already cached');
      setAppIdLoaded(true);
      return;
    }

    if (initAttempted.current) {
      console.log('🔔 OneSignal: Init already attempted');
      return;
    }
    
    initAttempted.current = true;

    const fetchAppId = async () => {
      try {
        console.log('🔔 OneSignal: Fetching App ID from backend...');
        
        const { data, error } = await supabase.functions.invoke('get-onesignal-config');
        
        if (error) {
          console.error('❌ OneSignal: Failed to fetch config:', error);
          return;
        }
        
        console.log('🔔 OneSignal: Config response:', data);
        
        if (data?.appId) {
          onesignalAppId = data.appId;
          setAppIdLoaded(true);
          console.log('✅ OneSignal: App ID loaded:', onesignalAppId.substring(0, 8) + '...');
        } else {
          console.error('❌ OneSignal: No appId in response');
        }
      } catch (err) {
        console.error('❌ OneSignal: Error fetching config:', err);
      }
    };

    fetchAppId();
  }, [user]);

  // Register device token with backend
  const registerDeviceToken = useCallback(async (playerId: string) => {
    if (!user || !playerId) return;

    try {
      console.log('🔔 Registering device token:', playerId.substring(0, 8) + '...');
      
      const { data, error } = await supabase.functions.invoke('register-device-token', {
        body: {
          token: playerId,
          platform: 'web',
          onesignalPlayerId: playerId,
          appVersion: '1.0.0',
        }
      });

      if (error) {
        console.error('❌ Failed to register device token:', error);
      } else {
        console.log('✅ Device token registered:', data);
      }
    } catch (error) {
      console.error('❌ Error registering device token:', error);
    }
  }, [user]);

  // Handle notification click - deep link to appropriate screen
  const handleNotificationClick = useCallback((data: any) => {
    console.log('🔔 Notification clicked:', data);
    
    const payload = data?.notification?.additionalData || data?.result?.notification?.additionalData || data;
    
    if (!payload?.type) {
      window.location.href = '/dashboard';
      return;
    }

    switch (payload.type) {
      case 'NEW_REQUEST_NEARBY':
        window.location.href = payload.requestId 
          ? `/browse-requests?highlight=${payload.requestId}` 
          : '/browse-requests';
        break;
      case 'VISIT_REMINDER':
        window.location.href = payload.recommendationId 
          ? `/feedback/${payload.recommendationId}` 
          : '/dashboard';
        break;
      case 'LEVEL_UP':
        window.location.href = '/profile';
        break;
      case 'RECOMMENDATION_RECEIVED':
        window.location.href = payload.requestId 
          ? `/request-results/${payload.requestId}` 
          : '/dashboard';
        break;
      default:
        window.location.href = payload.url || '/dashboard';
    }
  }, []);

  useEffect(() => {
    if (!user || !appIdLoaded || !onesignalAppId) {
      return;
    }

    if (onesignalInitialized) {
      console.log('🔔 OneSignal already initialized, checking subscription...');
      checkAndRegister();
      return;
    }

    async function checkAndRegister() {
      try {
        // Wait for OneSignal to be available on window
        if (!(window as any).OneSignal) return;

        const subscriptionId = await OneSignal.User.PushSubscription.id;
        console.log('🔔 Current subscription ID:', subscriptionId);
        
        if (subscriptionId && !registrationAttempted.current) {
          registrationAttempted.current = true;
          await registerDeviceToken(subscriptionId);
        }
      } catch (e) {
        console.log('🔔 Could not check subscription:', e);
      }
    }

    console.log('🔔 Initializing OneSignal with App ID:', onesignalAppId.substring(0, 8) + '...');

    const initOneSignal = async () => {
      try {
        // 1. Manually load the SDK script if it's not present
        if (!document.querySelector('script[src*="OneSignalSDK.page.js"]')) {
          console.log('🔔 Loading OneSignal SDK script...');
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
            script.async = true;
            script.defer = true;
            script.onload = () => {
              console.log('🔔 OneSignal script loaded');
              resolve();
            };
            script.onerror = () => reject(new Error('Failed to load OneSignal SDK'));
            document.head.appendChild(script);
          });

          // Small delay to ensure window.OneSignal is ready
          await new Promise(r => setTimeout(r, 100));
        }

        // 2. Initialize using react-onesignal
        await OneSignal.init({
          appId: onesignalAppId!,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false },
          // Use our custom service worker (which imports OneSignal SDK) to avoid conflicts
          serviceWorkerPath: '/sw.js',
        });

        onesignalInitialized = true;
        console.log('✅ OneSignal initialized!');

        // Login user
        try {
          await OneSignal.login(user.id);
          console.log('✅ OneSignal user logged in');
        } catch (e) {
          console.warn('⚠️ OneSignal login warning:', e);
        }

        // Set up click handler
        OneSignal.Notifications.addEventListener('click', handleNotificationClick);

        // Check permission and register
        const permission = OneSignal.Notifications.permission;
        console.log('🔔 Permission state:', permission);

        if (permission && !registrationAttempted.current) {
          // Wait a moment for subscription to be ready
          setTimeout(async () => {
            const subscriptionId = OneSignal.User.PushSubscription.id;
            console.log('🔔 Subscription ID:', subscriptionId);
            if (subscriptionId) {
              registrationAttempted.current = true;
              await registerDeviceToken(subscriptionId);
            }
          }, 1000);
        }

        // Listen for changes
        OneSignal.User.PushSubscription.addEventListener('change', async (event: any) => {
          console.log('🔔 Subscription changed:', event);
          if (event.current?.id && event.current?.optedIn) {
            await registerDeviceToken(event.current.id);
          }
        });

      } catch (error) {
        console.error('❌ OneSignal init error:', error);
      }
    };

    initOneSignal();

    return () => {
      // Cleanup if needed
    };
  }, [user, appIdLoaded, registerDeviceToken, handleNotificationClick]);

  return null;
};

// Hook to request push notification permission
export const useRequestPushPermission = () => {
  const { user } = useAuth();

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!user) {
      console.warn('🔔 User not logged in');
      return false;
    }

    try {
      console.log('🔔 Requesting push permission...');
      
      // Use slidedown prompt
      await OneSignal.Slidedown.promptPush();
      
      const permission = OneSignal.Notifications.permission;
      console.log('🔔 Permission result:', permission);
      
      return permission;
    } catch (error) {
      console.error('❌ Error requesting permission:', error);
      return false;
    }
  }, [user]);

  const isPushSupported = useCallback(() => {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }, []);

  const getPermissionState = useCallback(async (): Promise<'granted' | 'denied' | 'default' | null> => {
    try {
      // Direct property access is synchronous in v16 SDK wrapper usually, but let's wrap safely
      return OneSignal.Notifications.permission ? 'granted' : 'default';
    } catch {
      return null;
    }
  }, []);

  return { requestPermission, isPushSupported, getPermissionState };
};
