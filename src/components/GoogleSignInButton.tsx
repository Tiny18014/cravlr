import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

interface GoogleSignInButtonProps {
  className?: string;
}

// Published app URL for deep linking (Universal Links / App Links)
const PUBLISHED_APP_URL = 'https://cravlr.lovable.app';

/**
 * Google Sign-In Button with Mobile App Support
 * 
 * Flow for Mobile (Capacitor):
 * 1. User taps "Sign in with Google"
 * 2. Opens in-app browser for Google authentication
 * 3. After auth, redirects to published URL with tokens in hash
 * 4. App Links/Universal Links intercept and bring user back to app
 * 5. Deep link handler extracts tokens and completes auth
 * 
 * Flow for Web:
 * 1. Standard OAuth redirect flow
 * 2. Returns to current origin with tokens
 */
export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ className }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  /**
   * Get the appropriate redirect URL based on platform
   */
  const getRedirectUrl = (): string => {
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    
    console.log('[Auth] Platform detection:', { platform, isNative });
    
    if (isNative) {
      // For mobile apps, use the published URL so App Links / Universal Links
      // can intercept the redirect and bring user back to the app
      const url = `${PUBLISHED_APP_URL}/auth/google/callback`;
      console.log('[Auth] Mobile redirect URL:', url);
      return url;
    } else {
      // For web, use current origin
      const url = `${window.location.origin}/auth/google/callback`;
      console.log('[Auth] Web redirect URL:', url);
      return url;
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    
    console.log('[Auth] ═══════════════════════════════════════');
    console.log('[Auth] Starting Google OAuth sign-in');
    console.log('[Auth] Platform:', platform);
    console.log('[Auth] Is Native App:', isNative);
    console.log('[Auth] Timestamp:', new Date().toISOString());
    console.log('[Auth] ═══════════════════════════════════════');
    
    try {
      const redirectUrl = getRedirectUrl();
      
      console.log('[Auth] OAuth Configuration:');
      console.log('[Auth]   - Redirect URL:', redirectUrl);
      console.log('[Auth]   - Skip Browser Redirect:', isNative);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: isNative, // Critical: Don't auto-redirect on mobile
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('[Auth] OAuth initiation error:', error);
        toast({
          title: "Sign-in Failed",
          description: error.message || "Unable to sign in with Google. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      console.log('[Auth] OAuth response received');
      console.log('[Auth] Auth URL:', data?.url ? 'Present' : 'Missing');

      // For native apps, we need to manually open the OAuth URL
      // and handle the redirect ourselves
      if (isNative && data?.url) {
        console.log('[Auth] Opening OAuth URL in browser for native app');
        console.log('[Auth] OAuth URL (truncated):', data.url.substring(0, 100) + '...');
        
        try {
          // Open the OAuth URL in the system browser
          // When auth completes, it will redirect to our published URL
          // which App Links / Universal Links will intercept
          await Browser.open({ 
            url: data.url,
            presentationStyle: 'popover', // iOS specific - shows as overlay
            windowName: '_blank'
          });
          
          console.log('[Auth] Browser opened successfully');
          console.log('[Auth] Waiting for OAuth redirect...');
          
          // Don't reset loading here - the app will handle it when returning via deep link
          // The loading state will be cleared when the user returns to the app
          
        } catch (browserError) {
          console.error('[Auth] Failed to open browser:', browserError);
          toast({
            title: "Browser Error",
            description: "Unable to open browser for sign-in. Please try again.",
            variant: "destructive",
          });
          setLoading(false);
        }
      } else if (!isNative) {
        // Web flow - browser will redirect automatically
        console.log('[Auth] Web flow - browser will redirect');
      }
      
    } catch (error) {
      console.error('[Auth] Unexpected error during sign-in:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className={`w-full flex items-center justify-center gap-3 ${className}`}
      onClick={handleGoogleSignIn}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      )}
      <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
    </Button>
  );
};
