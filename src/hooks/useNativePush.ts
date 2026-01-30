/**
 * Hook for native push notifications
 * 
 * Provides a React-friendly interface to the NativePushNotificationService
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  NativePushNotificationService,
  initializePushNotifications,
  requestPushPermission,
  isPushSupported,
  getPushPermissionStatus,
} from '@/services/NativePushNotificationService';

export interface UseNativePushResult {
  /** Whether push notifications are supported on this platform */
  isSupported: boolean;
  /** Current permission status */
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown' | null;
  /** Whether push is currently enabled */
  isEnabled: boolean;
  /** Whether initialization is in progress */
  isLoading: boolean;
  /** Request permission to send push notifications */
  requestPermission: () => Promise<boolean>;
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<void>;
  /** Platform info */
  platformInfo: { platform: string; isNative: boolean };
}

export function useNativePush(): UseNativePushResult {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown' | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize on mount and when user changes
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      
      try {
        if (user) {
          await initializePushNotifications(user.id);
          await NativePushNotificationService.setExternalUserId(user.id);
        }
        
        const status = await getPushPermissionStatus();
        setPermissionStatus(status);
        setIsInitialized(true);
      } catch (error) {
        console.error('useNativePush: Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [user?.id]);

  // Request permission
  const handleRequestPermission = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const granted = await requestPushPermission();
      const status = await getPushPermissionStatus();
      setPermissionStatus(status);
      return granted;
    } catch (error) {
      console.error('useNativePush: Permission request error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Unsubscribe
  const handleUnsubscribe = useCallback(async (): Promise<void> => {
    try {
      await NativePushNotificationService.unsubscribe();
      const status = await getPushPermissionStatus();
      setPermissionStatus(status);
    } catch (error) {
      console.error('useNativePush: Unsubscribe error:', error);
    }
  }, []);

  // Listen for push notifications received in foreground
  useEffect(() => {
    const handlePushReceived = (event: CustomEvent) => {
      console.log('useNativePush: Notification received:', event.detail);
      // Components can listen to this event to show in-app UI
    };

    window.addEventListener('push-notification-received', handlePushReceived as EventListener);
    
    return () => {
      window.removeEventListener('push-notification-received', handlePushReceived as EventListener);
    };
  }, []);

  return {
    isSupported: isPushSupported(),
    permissionStatus,
    isEnabled: permissionStatus === 'granted',
    isLoading,
    requestPermission: handleRequestPermission,
    unsubscribe: handleUnsubscribe,
    platformInfo: NativePushNotificationService.getPlatformInfo(),
  };
}
