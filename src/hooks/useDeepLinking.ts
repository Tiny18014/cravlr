import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '@/integrations/supabase/client';

/**
 * Deep Linking Hook for Capacitor
 * 
 * Handles incoming deep links and navigates to appropriate routes.
 * Supports both Universal Links (iOS) and App Links (Android).
 * 
 * CRITICAL: Handles OAuth callback URLs with token extraction
 * 
 * Supported URL patterns:
 * - https://cravlr.lovable.app/auth/google/callback#access_token=...
 * - https://cravlr.lovable.app/requests/{requestId}/results
 * - https://cravlr.lovable.app/recommend/{requestId}
 * - https://cravlr.lovable.app/feedback/{recommendationId}
 * - https://cravlr.lovable.app/dashboard
 * - https://cravlr.lovable.app/browse-requests
 * 
 * Testing Checklist:
 * 1. Test Google OAuth on Android - should return to app
 * 2. Test Google OAuth on iOS - should return to app
 * 3. Test deep link from SMS on Android device
 * 4. Test deep link from Email on iOS device
 * 5. Test app opening from browser link tap
 */
export function useDeepLinking() {
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Handle OAuth callback - extract tokens from URL and set session
   */
  const handleOAuthCallback = useCallback(async (url: string): Promise<boolean> => {
    console.log('[Auth Deep Link] Checking if URL is OAuth callback:', url);
    
    // Check if this is an OAuth callback URL
    const isOAuthCallback = url.includes('/auth/google/callback') || 
                           url.includes('/auth/callback') ||
                           url.includes('#access_token=');
    
    if (!isOAuthCallback) {
      console.log('[Auth Deep Link] Not an OAuth callback URL');
      return false;
    }

    console.log('[Auth Deep Link] ═══════════════════════════════════════');
    console.log('[Auth Deep Link] OAuth callback detected!');
    console.log('[Auth Deep Link] Processing authentication...');
    console.log('[Auth Deep Link] ═══════════════════════════════════════');

    try {
      // Close the browser that was opened for OAuth
      try {
        await Browser.close();
        console.log('[Auth Deep Link] Browser closed');
      } catch (e) {
        console.log('[Auth Deep Link] Browser close skipped (may already be closed)');
      }

      // Parse the URL to extract hash parameters
      const urlObj = new URL(url);
      const hashParams = new URLSearchParams(urlObj.hash.substring(1));
      const queryParams = new URLSearchParams(urlObj.search);
      
      // Try to get tokens from hash first (implicit flow), then query (PKCE flow)
      const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
      const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
      
      console.log('[Auth Deep Link] Token extraction:');
      console.log('[Auth Deep Link]   - Access token:', accessToken ? 'FOUND' : 'NOT FOUND');
      console.log('[Auth Deep Link]   - Refresh token:', refreshToken ? 'FOUND' : 'NOT FOUND');
      console.log('[Auth Deep Link]   - Error:', errorDescription || 'NONE');

      if (errorDescription) {
        console.error('[Auth Deep Link] OAuth error:', errorDescription);
        navigate('/welcome', { replace: true });
        return true;
      }

      if (accessToken) {
        console.log('[Auth Deep Link] Setting session with tokens...');
        
        // Set the session using the tokens from the URL
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (error) {
          console.error('[Auth Deep Link] Failed to set session:', error);
          navigate('/welcome', { replace: true });
          return true;
        }

        console.log('[Auth Deep Link] Session established successfully!');
        console.log('[Auth Deep Link] User:', data.session?.user?.email);
        
        // Navigate to the callback page which will handle role detection
        navigate('/auth/google/callback', { replace: true });
        return true;
      }

      // If no access token in URL, try to get session (might already be set)
      console.log('[Auth Deep Link] No token in URL, checking existing session...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('[Auth Deep Link] Existing session found');
        navigate('/auth/google/callback', { replace: true });
        return true;
      }

      console.log('[Auth Deep Link] No session found, redirecting to welcome');
      navigate('/welcome', { replace: true });
      return true;

    } catch (error) {
      console.error('[Auth Deep Link] Error handling OAuth callback:', error);
      navigate('/welcome', { replace: true });
      return true;
    }
  }, [navigate]);

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
      
      console.log('[Deep Linking] Parsed components:', { 
        hostname, 
        pathname, 
        hash: hash ? 'present (' + hash.substring(0, 30) + '...)' : 'none', 
        search: search ? 'present' : 'none' 
      });
      
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
  const handleDeepLink = useCallback(async (url: string) => {
    console.log('[Deep Linking] ═══════════════════════════════════════');
    console.log('[Deep Linking] Received URL:', url);
    console.log('[Deep Linking] Timestamp:', new Date().toISOString());
    console.log('[Deep Linking] ═══════════════════════════════════════');
    
    // First, check if this is an OAuth callback
    const wasOAuthCallback = await handleOAuthCallback(url);
    if (wasOAuthCallback) {
      console.log('[Deep Linking] Handled as OAuth callback');
      return;
    }

    // Regular deep link handling
    const parsed = parseDeepLinkUrl(url);
    
    if (parsed) {
      // For OAuth callbacks, we need to preserve the hash fragment
      // which contains the access token and other auth data
      const fullPath = parsed.path + parsed.search + parsed.hash;
      console.log('[Deep Linking] Navigating to:', fullPath);
      
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
  }, [navigate, location.pathname, parseDeepLinkUrl, handleOAuthCallback]);

  /**
   * Initialize deep linking listeners
   */
  useEffect(() => {
    console.log('[Deep Linking] ═══════════════════════════════════════');
    console.log('[Deep Linking] Hook initialized');
    console.log('[Deep Linking] Platform:', Capacitor.getPlatform());
    console.log('[Deep Linking] Is native:', Capacitor.isNativePlatform());
    console.log('[Deep Linking] Current route:', location.pathname);
    console.log('[Deep Linking] ═══════════════════════════════════════');

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
          console.log('[Deep Linking] ═══ appUrlOpen EVENT ═══');
          console.log('[Deep Linking] Event URL:', event.url);
          console.log('[Deep Linking] Timestamp:', new Date().toISOString());
          
          handleDeepLink(event.url);
        });

        console.log('[Deep Linking] Listener registered successfully');

        // Check if app was opened with a URL (cold start)
        const launchUrl = await App.getLaunchUrl();
        if (launchUrl?.url) {
          console.log('[Deep Linking] ═══ COLD START with URL ═══');
          console.log('[Deep Linking] Launch URL:', launchUrl.url);
          handleDeepLink(launchUrl.url);
        } else {
          console.log('[Deep Linking] No launch URL detected (normal app start)');
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
      console.log('[Deep Linking] App state changed:', state.isActive ? 'ACTIVE (foreground)' : 'BACKGROUND');
    });

    return () => {
      console.log('[Deep Linking] Cleanup: removing listeners');
      stateListener.then(l => l.remove());
    };
  }, [handleDeepLink, location.pathname]);

  return {
    handleDeepLink,
    parseDeepLinkUrl,
    handleOAuthCallback,
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
