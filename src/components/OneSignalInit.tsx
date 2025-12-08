import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Get OneSignal App ID from environment
const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || '';

// Track initialization state
let onesignalInitialized = false;

export const OneSignalInit = () => {
  const { user } = useAuth();
  const registrationAttempted = useRef(false);

  // Register device token with backend
  const registerDeviceToken = useCallback(async (playerId: string) => {
    if (!user || !playerId) return;

    try {
      console.log('🔔 Registering device token with backend:', playerId);
      
      const { error } = await supabase.functions.invoke('register-device-token', {
        body: {
          action: 'register',
          token: playerId,
          platform: 'web',
          onesignal_player_id: playerId,
          app_version: import.meta.env.VITE_APP_VERSION || '1.0.0',
        }
      });

      if (error) {
        console.error('❌ Failed to register device token:', error);
      } else {
        console.log('✅ Device token registered successfully');
      }
    } catch (error) {
      console.error('❌ Error registering device token:', error);
    }
  }, [user]);

  // Handle notification click - deep link to appropriate screen
  const handleNotificationClick = useCallback((data: any) => {
    console.log('🔔 Notification clicked:', data);
    
    const payload = data?.notification?.additionalData || data;
    
    if (!payload?.type) return;

    // Deep link based on notification type
    switch (payload.type) {
      case 'NEW_REQUEST_NEARBY':
        if (payload.requestId) {
          window.location.href = `/browse-requests?highlight=${payload.requestId}`;
        } else {
          window.location.href = '/browse-requests';
        }
        break;
      
      case 'VISIT_REMINDER':
        if (payload.recommendationId) {
          window.location.href = `/feedback/${payload.recommendationId}`;
        } else {
          window.location.href = '/dashboard';
        }
        break;
      
      case 'LEVEL_UP':
        window.location.href = '/profile';
        break;
      
      case 'RECOMMENDATION_RECEIVED':
        if (payload.requestId) {
          window.location.href = `/request-results/${payload.requestId}`;
        }
        break;
      
      default:
        window.location.href = '/dashboard';
    }
  }, []);

  useEffect(() => {
    // Don't initialize if no user or no app ID
    if (!user || !ONESIGNAL_APP_ID) {
      if (!ONESIGNAL_APP_ID) {
        console.warn('🔔 OneSignal App ID not configured (VITE_ONESIGNAL_APP_ID)');
      }
      return;
    }

    // Prevent double initialization
    if (onesignalInitialized) {
      console.log('🔔 OneSignal already initialized');
      return;
    }

    console.log('🔔 Initializing OneSignal...');

    const initOneSignal = async () => {
      try {
        // Access OneSignal from window
        const OneSignal = (window as any).OneSignal;
        
        // Load OneSignal SDK if not already loaded
        if (!OneSignal) {
          await new Promise<void>((resolve, reject) => {
            const existingScript = document.querySelector('script[src*="OneSignalSDK"]');
            if (existingScript) {
              // Wait for it to load
              const checkLoaded = setInterval(() => {
                if ((window as any).OneSignal) {
                  clearInterval(checkLoaded);
                  resolve();
                }
              }, 100);
              setTimeout(() => {
                clearInterval(checkLoaded);
                reject(new Error('OneSignal SDK load timeout'));
              }, 10000);
              return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load OneSignal SDK'));
            document.head.appendChild(script);
          });
        }

        // Wait for OneSignal to be available
        await new Promise<void>((resolve) => {
          const check = setInterval(() => {
            if ((window as any).OneSignal) {
              clearInterval(check);
              resolve();
            }
          }, 50);
        });

        // Get OneSignal reference
        const OS = (window as any).OneSignal;

        // Initialize OneSignal
        await OS.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: false,
          },
          promptOptions: {
            slidedown: {
              prompts: [{
                type: 'push',
                autoPrompt: false,
                text: {
                  actionMessage: "Get notified about food requests near you!",
                  acceptButton: "Enable",
                  cancelButton: "Maybe later",
                }
              }]
            }
          }
        });

        onesignalInitialized = true;
        console.log('✅ OneSignal initialized successfully');

        // Set external user ID for targeting
        try {
          await OS.login(user.id);
          console.log('✅ OneSignal user logged in:', user.id);
        } catch (loginError) {
          console.warn('⚠️ OneSignal login failed:', loginError);
        }

        // Set up notification click handler
        OS.Notifications.addEventListener('click', handleNotificationClick);

        // Get subscription state and register if subscribed
        const permission = await OS.Notifications.permission;
        console.log('🔔 OneSignal permission state:', permission);

        if (permission && !registrationAttempted.current) {
          registrationAttempted.current = true;
          
          // Get the player/subscription ID
          const subscriptionId = await OS.User.PushSubscription.id;
          if (subscriptionId) {
            await registerDeviceToken(subscriptionId);
          }
        }

        // Listen for subscription changes
        OS.User.PushSubscription.addEventListener('change', async (event: any) => {
          console.log('🔔 Subscription changed:', event);
          if (event.current.id && event.current.optedIn) {
            await registerDeviceToken(event.current.id);
          }
        });

      } catch (error) {
        console.error('❌ OneSignal initialization error:', error);
      }
    };

    initOneSignal();

    // Cleanup on unmount
    return () => {
      const OS = (window as any).OneSignal;
      if (OS?.Notifications) {
        OS.Notifications.removeEventListener('click', handleNotificationClick);
      }
    };
  }, [user, registerDeviceToken, handleNotificationClick]);

  return null;
};

// Hook to request push notification permission
export const useRequestPushPermission = () => {
  const { user } = useAuth();

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const OS = (window as any).OneSignal;
    if (!OS || !user) {
      console.warn('🔔 OneSignal not initialized or user not logged in');
      return false;
    }

    try {
      // Check current permission
      const currentPermission = await OS.Notifications.permission;
      
      if (currentPermission) {
        console.log('🔔 Already has permission');
        return true;
      }

      // Request permission
      await OS.Notifications.requestPermission();
      
      const newPermission = await OS.Notifications.permission;
      console.log('🔔 New permission state:', newPermission);
      
      return newPermission;
    } catch (error) {
      console.error('❌ Error requesting push permission:', error);
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

  return {
    requestPermission,
    isPushSupported,
    getPermissionState,
  };
};
