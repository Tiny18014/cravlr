/**
 * Native Push Notification Service
 * 
 * Unified service for handling push notifications across:
 * - Native iOS (Capacitor)
 * - Native Android (Capacitor)
 * - Web (PWA)
 * 
 * Uses OneSignal as the push notification provider.
 */

import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

// NOTE: Native push is temporarily disabled (Firebase removed).
// We keep the web OneSignal flow intact while preventing any native calls
// that would crash without Firebase configuration.

type MinimalPushNotification = {
  title?: string;
  body?: string;
  data?: unknown;
};

// OneSignal App ID will be fetched from backend
let ONESIGNAL_APP_ID: string | null = null;

// Track initialization state
let isInitialized = false;
let currentUserId: string | null = null;

export interface NotificationData {
  type: 'NEW_REQUEST_NEARBY' | 'VISIT_REMINDER' | 'LEVEL_UP' | 'RECOMMENDATION_RECEIVED';
  requestId?: string;
  recommendationId?: string;
  deepLink?: string;
  [key: string]: any;
}

export class NativePushNotificationService {
  /**
   * Initialize push notifications based on platform
   */
  static async initialize(userId?: string): Promise<void> {
    if (isInitialized && currentUserId === userId) {
      console.log('📱 Push: Already initialized for user:', userId);
      return;
    }

    currentUserId = userId || null;
    
    console.log('📱 Push: Initializing...', {
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      userId,
    });

    try {
      // Fetch OneSignal App ID from backend
      if (!ONESIGNAL_APP_ID) {
        const { data, error } = await supabase.functions.invoke('get-onesignal-config');
        if (error) {
          console.error('📱 Push: Failed to get OneSignal config:', error);
          return;
        }
        ONESIGNAL_APP_ID = data?.appId;
        console.log('📱 Push: OneSignal App ID loaded');
      }

      if (Capacitor.isNativePlatform()) {
        await this.initializeNative();
      } else {
        await this.initializeWeb();
      }

      isInitialized = true;
      console.log('📱 Push: Initialization complete');
    } catch (error) {
      console.error('📱 Push: Initialization failed:', error);
    }
  }

  /**
   * Initialize for native platforms (iOS/Android)
   */
  private static async initializeNative(): Promise<void> {
    // Native push requires platform configuration (Android Firebase / iOS APNs).
    // Until you explicitly decide to enable that, we disable native initialization.
    console.log('📱 Push: Native push is disabled (Firebase not configured)');
  }

  /**
   * Register native event listeners
   */
  private static registerNativeListeners(): void {
    // No-op while native push is disabled.
    console.log('📱 Push: Native listeners skipped (native push disabled)');
  }

  /**
   * Initialize for web platform (PWA)
   */
  private static async initializeWeb(): Promise<void> {
    console.log('📱 Push: Initializing web push notifications...');

    // Web uses the existing OneSignalInit component
    // This service provides additional utilities and unified API
    
    // Check if OneSignal is available
    const OS = (window as any).OneSignal;
    if (OS) {
      console.log('📱 Push: OneSignal web SDK available');
    } else {
      console.log('📱 Push: OneSignal web SDK not loaded yet');
    }
  }

  /**
   * Request notification permission
   * Returns true if granted
   */
  static async requestPermission(): Promise<boolean> {
    console.log('📱 Push: Requesting permission...');

    try {
      if (Capacitor.isNativePlatform()) {
        return await this.requestNativePermission();
      } else {
        return await this.requestWebPermission();
      }
    } catch (error) {
      console.error('📱 Push: Permission request failed:', error);
      return false;
    }
  }

  /**
   * Request native permission (iOS/Android)
   */
  private static async requestNativePermission(): Promise<boolean> {
    console.log('📱 Push: Native permission request skipped (native push disabled)');
    return false;
  }

  /**
   * Request web permission (PWA)
   */
  private static async requestWebPermission(): Promise<boolean> {
    const OS = (window as any).OneSignal;
    
    if (!OS) {
      console.warn('📱 Push: OneSignal not available');
      return false;
    }

    try {
      await OS.Slidedown.promptPush();
      
      // Wait a moment for permission to be processed
      await new Promise(r => setTimeout(r, 1000));
      
      const permission = OS.Notifications.permission;
      console.log('📱 Push: Web permission result:', permission);
      
      return permission === true;
    } catch (error) {
      console.error('📱 Push: Web permission error:', error);
      return false;
    }
  }

  /**
   * Register device token with backend
   */
  private static async registerDeviceToken(
    token: string, 
    platform: 'ios' | 'android' | 'web'
  ): Promise<void> {
    if (!currentUserId) {
      console.warn('📱 Push: No user ID, skipping token registration');
      return;
    }

    console.log('📱 Push: Registering device token...', { platform, tokenLength: token.length });

    try {
      const { data, error } = await supabase.functions.invoke('register-device-token', {
        body: {
          token,
          platform,
          onesignalPlayerId: token, // For native, the token IS the player ID
          appVersion: '1.0.0',
        }
      });

      if (error) {
        console.error('📱 Push: Token registration failed:', error);
      } else {
        console.log('📱 Push: Token registered successfully:', data);
      }
    } catch (error) {
      console.error('📱 Push: Token registration error:', error);
    }
  }

  /**
   * Handle notification received in foreground
   */
  private static handleForegroundNotification(notification: MinimalPushNotification): void {
    console.log('📱 Push: Foreground notification:', notification);

    // On native, you might want to show an in-app toast or banner
    // The system notification will still appear in the notification tray
    
    const data = (notification.data || {}) as NotificationData;
    
    // Dispatch custom event for UI components to react
    window.dispatchEvent(new CustomEvent('push-notification-received', {
      detail: {
        title: notification.title,
        body: notification.body,
        data,
      }
    }));
  }

  /**
   * Handle notification opened (tapped)
   */
  private static handleNotificationOpened(notification: MinimalPushNotification): void {
    console.log('📱 Push: Notification opened:', notification);

    const data = (notification.data || {}) as NotificationData;
    
    // Navigate based on notification type
    switch (data.type) {
      case 'NEW_REQUEST_NEARBY':
        if (data.requestId) {
          window.location.href = `/recommend/${data.requestId}`;
        } else {
          window.location.href = '/browse-requests';
        }
        break;

      case 'VISIT_REMINDER':
        if (data.recommendationId) {
          window.location.href = `/feedback/${data.recommendationId}`;
        } else {
          window.location.href = '/dashboard';
        }
        break;

      case 'LEVEL_UP':
        window.location.href = '/profile';
        break;

      case 'RECOMMENDATION_RECEIVED':
        if (data.requestId) {
          window.location.href = `/request-results/${data.requestId}`;
        } else {
          window.location.href = '/dashboard';
        }
        break;

      default:
        // Use deep link if provided, otherwise go to dashboard
        if (data.deepLink) {
          window.location.href = data.deepLink;
        } else {
          window.location.href = '/dashboard';
        }
    }
  }

  /**
   * Check if push notifications are supported
   */
  static isSupported(): boolean {
    // Native push is intentionally disabled for now.
    if (Capacitor.isNativePlatform()) return false;
    
    // Web support check
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Get current permission status
   */
  static async getPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
    try {
      if (Capacitor.isNativePlatform()) {
        return 'unknown';
      } else {
        // Web permission
        if ('Notification' in window) {
          return Notification.permission as 'granted' | 'denied' | 'default' === 'default' 
            ? 'prompt' 
            : Notification.permission as 'granted' | 'denied';
        }
        return 'unknown';
      }
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get platform info
   */
  static getPlatformInfo(): { platform: string; isNative: boolean } {
    return {
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
    };
  }

  /**
   * Unsubscribe from push notifications
   */
  static async unsubscribe(): Promise<void> {
    console.log('📱 Push: Unsubscribing...');

    try {
      if (Capacitor.isNativePlatform()) {
        // On native, we can't really unsubscribe, but we can mark token as inactive
        console.log('📱 Push: Native unsubscribe - marking token inactive');
      } else {
        const OS = (window as any).OneSignal;
        if (OS?.User?.PushSubscription) {
          await OS.User.PushSubscription.optOut();
          console.log('📱 Push: Web unsubscribe successful');
        }
      }
    } catch (error) {
      console.error('📱 Push: Unsubscribe error:', error);
    }
  }

  /**
   * Set external user ID (for cross-platform tracking)
   */
  static async setExternalUserId(userId: string): Promise<void> {
    currentUserId = userId;
    
    if (!Capacitor.isNativePlatform()) {
      const OS = (window as any).OneSignal;
      if (OS) {
        try {
          await OS.login(userId);
          console.log('📱 Push: External user ID set:', userId);
        } catch (error) {
          console.warn('📱 Push: Failed to set external user ID:', error);
        }
      }
    }
    // For native, the user ID is associated during token registration
  }

  /**
   * Clear external user ID (on logout)
   */
  static async clearExternalUserId(): Promise<void> {
    currentUserId = null;

    if (!Capacitor.isNativePlatform()) {
      const OS = (window as any).OneSignal;
      if (OS) {
        try {
          await OS.logout();
          console.log('📱 Push: External user ID cleared');
        } catch (error) {
          console.warn('📱 Push: Failed to clear external user ID:', error);
        }
      }
    }
  }
}

// Export singleton instance methods for convenience
export const initializePushNotifications = NativePushNotificationService.initialize.bind(NativePushNotificationService);
export const requestPushPermission = NativePushNotificationService.requestPermission.bind(NativePushNotificationService);
export const isPushSupported = NativePushNotificationService.isSupported.bind(NativePushNotificationService);
export const getPushPermissionStatus = NativePushNotificationService.getPermissionStatus.bind(NativePushNotificationService);
