import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';

/**
 * Deep Linking Hook for Capacitor
 * 
 * Handles incoming deep links and navigates to appropriate routes.
 * Supports both Universal Links (iOS) and App Links (Android).
 * 
 * Supported URL patterns:
 * - https://cravlr.lovable.app/requests/{requestId}/results
 * - https://cravlr.lovable.app/recommend/{requestId}
 * - https://cravlr.lovable.app/feedback/{recommendationId}
 * - https://cravlr.lovable.app/dashboard
 * - https://cravlr.lovable.app/browse-requests
 * 
 * Testing Checklist:
 * 1. Test deep link from SMS on Android device
 * 2. Test deep link from Email on iOS device
 * 3. Test app opening from browser link tap
 * 4. Test push notification tap opens correct screen
 * 5. Verify app opens vs browser opens based on app installation
 */
export function useDeepLinking() {
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Parse incoming URL and extract the path for navigation
   * For OAuth callbacks, also preserve the hash fragment which contains auth tokens
   */
  const parseDeepLinkUrl = useCallback((url: string): { path: string; hash: string; search: string } | null => {
    console.log('[Deep Linking] Parsing URL:', url);
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const pathname = urlObj.pathname;
      const hash = urlObj.hash;
      const search = urlObj.search;
      
      console.log('[Deep Linking] Parsed components:', { hostname, pathname, hash: hash ? 'present' : 'none', search: search ? 'present' : 'none' });
      
      // Validate it's our domain
      const validHosts = ['cravlr.lovable.app', 'cravlr.com', 'www.cravlr.com'];
      if (!validHosts.includes(hostname)) {
        console.warn('[Deep Linking] Unknown hostname:', hostname);
        // Still allow navigation for development
      }
      
      // Return the pathname, hash, and search for navigation
      // Hash is important for OAuth callbacks as tokens are in the fragment
      return { 
        path: pathname || '/', 
        hash: hash || '',
        search: search || ''
      };
    } catch (error) {
      console.error('[Deep Linking] Error parsing URL:', error);
      return null;
    }
  }, []);

  /**
   * Handle the deep link navigation
   */
  const handleDeepLink = useCallback((url: string) => {
    console.log('[Deep Linking] Received URL:', url);
    
    const parsed = parseDeepLinkUrl(url);
    
    if (parsed) {
      // For OAuth callbacks, we need to preserve the hash fragment
      // which contains the access token and other auth data
      const fullPath = parsed.path + parsed.search + parsed.hash;
      console.log('[Deep Linking] Navigating to:', fullPath);
      console.log('[Deep Linking] Is OAuth callback:', parsed.path.includes('/auth/google/callback'));
      
      // Check if we're already on this path
      if (location.pathname === parsed.path) {
        console.log('[Deep Linking] Already on path, refreshing...');
        // Force refresh by navigating away and back
        navigate('/', { replace: true });
        setTimeout(() => navigate(fullPath, { replace: true }), 100);
      } else {
        navigate(fullPath, { replace: true });
      }
      
      console.log('[Deep Linking] Navigation completed');
    } else {
      console.error('[Deep Linking] Could not parse URL, navigating to home');
      navigate('/', { replace: true });
    }
  }, [navigate, location.pathname, parseDeepLinkUrl]);

  /**
   * Initialize deep linking listeners
   */
  useEffect(() => {
    console.log('[Deep Linking] Hook initialized');
    console.log('[Deep Linking] Platform:', Capacitor.getPlatform());
    console.log('[Deep Linking] Is native:', Capacitor.isNativePlatform());
    console.log('[Deep Linking] Current route:', location.pathname);

    // Only set up listeners on native platforms
    if (!Capacitor.isNativePlatform()) {
      console.log('[Deep Linking] Not on native platform, skipping listener setup');
      return;
    }

    console.log('[Deep Linking] Setting up appUrlOpen listener...');

    // Listen for app URL open events (Universal Links / App Links)
    const setupListener = async () => {
      try {
        // Add listener for URL opens
        const listener = await App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
          console.log('[Deep Linking] appUrlOpen event received:', event);
          console.log('[Deep Linking] URL:', event.url);
          
          handleDeepLink(event.url);
        });

        console.log('[Deep Linking] Listener registered successfully');

        // Check if app was opened with a URL (cold start)
        const launchUrl = await App.getLaunchUrl();
        if (launchUrl?.url) {
          console.log('[Deep Linking] App launched with URL:', launchUrl.url);
          handleDeepLink(launchUrl.url);
        } else {
          console.log('[Deep Linking] No launch URL detected');
        }

        // Cleanup on unmount
        return () => {
          console.log('[Deep Linking] Removing listener...');
          listener.remove();
        };
      } catch (error) {
        console.error('[Deep Linking] Error setting up listener:', error);
      }
    };

    setupListener();

    // Listen for app state changes (resume from background)
    const stateListener = App.addListener('appStateChange', (state) => {
      console.log('[Deep Linking] App state changed:', state.isActive ? 'active' : 'background');
    });

    return () => {
      console.log('[Deep Linking] Cleanup: removing listeners');
      stateListener.then(l => l.remove());
    };
  }, [handleDeepLink, location.pathname]);

  return {
    handleDeepLink,
    parseDeepLinkUrl,
    isNative: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform()
  };
}

/**
 * Hook to get current platform info
 */
export function useCapacitorPlatform() {
  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();
  const isAndroid = platform === 'android';
  const isIOS = platform === 'ios';
  const isWeb = platform === 'web';

  console.log('[Capacitor Platform] Info:', { platform, isNative, isAndroid, isIOS, isWeb });

  return {
    platform,
    isNative,
    isAndroid,
    isIOS,
    isWeb
  };
}
