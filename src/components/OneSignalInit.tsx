import { useEffect, useCallback, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
      // console.log('🔔 OneSignal: No user logged in, skipping init');
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
        
        if (data?.appId) {
          // VALIDATION: Check if it looks like a UUID
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

          if (!uuidRegex.test(data.appId)) {
             console.error('❌ CRITICAL CONFIG ERROR: OneSignal App ID is invalid!');
             console.error(`Received: "${data.appId}"`);
             console.error('It looks like you put a Google API Key (starts with AIza...) instead of the OneSignal App ID (UUID).');
             console.error('Please update the ONESIGNAL_APP_ID secret in Supabase Edge Functions.');
             return; // Stop initialization
          }

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
      const OS = (window as any).OneSignal;
      if (!OS) return;
      
      try {
        const subscriptionId = await OS.User?.PushSubscription?.id;
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
        // Load SDK if needed
        if (!(window as any).OneSignal) {
          console.log('🔔 Loading OneSignal SDK...');
          await new Promise<void>((resolve, reject) => {
            const existingScript = document.querySelector('script[src*="OneSignalSDK"]');
            if (existingScript) {
              const checkLoaded = setInterval(() => {
                if ((window as any).OneSignal) {
                  clearInterval(checkLoaded);
                  resolve();
                }
              }, 100);
              setTimeout(() => {
                clearInterval(checkLoaded);
                reject(new Error('SDK load timeout'));
              }, 10000);
              return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load SDK'));
            document.head.appendChild(script);
          });
        }

        // Wait for availability
        await new Promise<void>((resolve) => {
          const check = setInterval(() => {
            if ((window as any).OneSignal) {
              clearInterval(check);
              resolve();
            }
          }, 50);
        });

        const OS = (window as any).OneSignal;
        console.log('🔔 OneSignal SDK available, initializing...');

        await OS.init({
          appId: onesignalAppId,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerParam: { scope: '/' },
          serviceWorkerPath: '/OneSignalSDKWorker.js',
          notifyButton: { enable: false },
        });

        onesignalInitialized = true;
        console.log('✅ OneSignal initialized!');

        // Login user
        try {
          await OS.login(user.id);
          console.log('✅ OneSignal user logged in');
        } catch (e) {
          console.warn('⚠️ OneSignal login warning:', e);
        }

        // Set up click handler
        OS.Notifications.addEventListener('click', handleNotificationClick);

        // Check permission and register
        const permission = await OS.Notifications.permission;
        console.log('🔔 Permission state:', permission);

        if (permission && !registrationAttempted.current) {
          registrationAttempted.current = true;
          const subscriptionId = await OS.User.PushSubscription.id;
          console.log('🔔 Subscription ID:', subscriptionId);
          if (subscriptionId) {
            await registerDeviceToken(subscriptionId);
          }
        }

        // Listen for changes
        OS.User.PushSubscription.addEventListener('change', async (event: any) => {
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
      const OS = (window as any).OneSignal;
      if (OS?.Notifications) {
        OS.Notifications.removeEventListener('click', handleNotificationClick);
      }
    };
  }, [user, appIdLoaded, registerDeviceToken, handleNotificationClick]);

  return null;
};

// Hook to request push notification permission
export const useRequestPushPermission = () => {
  const { user } = useAuth();

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const OS = (window as any).OneSignal;
    if (!OS) {
      console.warn('🔔 OneSignal not available');
      return false;
    }
    if (!user) {
      console.warn('🔔 User not logged in');
      return false;
    }

    try {
      console.log('🔔 Requesting push permission...');
      
      // Use slidedown prompt
      await OS.Slidedown.promptPush();
      
      const permission = await OS.Notifications.permission;
      console.log('🔔 Permission result:', permission);
      
      return permission === true;
    } catch (error) {
      console.error('❌ Error requesting permission:', error);
      return false;
    }
  }, [user]);

  const isPushSupported = useCallback(() => {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }, []);

  const getPermissionState = useCallback(async (): Promise<'granted' | 'denied' | 'default' | null> => {
    const OS = (window as any).OneSignal;
    if (!OS) return null;
    
    try {
      const permission = await OS.Notifications.permission;
      if (permission === true) return 'granted';
      if (permission === false) return 'denied';
      return 'default';
    } catch {
      return null;
    }
  }, []);

  return { requestPermission, isPushSupported, getPermissionState };
};
