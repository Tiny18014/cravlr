import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Global notification banner that appears for logged-in users
 * who haven't subscribed to push notifications yet.
 * Shows as a fixed banner at the top of the screen.
 * Waits for OneSignal to be fully ready before determining visibility.
 */
export const GlobalNotificationBanner: React.FC = () => {
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null); // null = still checking
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Check localStorage for previous dismissal
  useEffect(() => {
    const dismissed = localStorage.getItem('global-notification-banner-dismissed');
    if (dismissed) {
      const dismissedAt = new Date(dismissed);
      const daysSinceDismissal = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
      // Show again after 3 days
      if (daysSinceDismissal < 3) {
        setIsDismissed(true);
      }
    }
  }, []);

  // Wait for OneSignal to be ready and check subscription status
  useEffect(() => {
    if (!user) {
      setIsSubscribed(null);
      return;
    }

    let isMounted = true;
    let checkCount = 0;
    const maxChecks = 10; // Try for up to 10 seconds

    const checkSubscription = async () => {
      const OS = (window as any).OneSignal;
      
      if (!OS || !OS.User?.PushSubscription) {
        checkCount++;
        if (checkCount < maxChecks && isMounted) {
          setTimeout(checkSubscription, 1000);
        } else if (isMounted) {
          // OneSignal never loaded, assume not subscribed
          console.log('🔔 GlobalBanner: OneSignal not available after timeout');
          setIsSubscribed(false);
        }
        return;
      }

      try {
        const subscriptionId = OS.User.PushSubscription.id;
        const optedIn = OS.User.PushSubscription.optedIn;
        
        console.log('🔔 GlobalBanner: Subscription check -', { subscriptionId, optedIn });
        
        if (isMounted) {
          setIsSubscribed(Boolean(subscriptionId && optedIn));
          
          // Also check if permission was denied
          if ('Notification' in window && Notification.permission === 'denied') {
            setPermissionDenied(true);
          }
        }
      } catch (error) {
        console.log('🔔 GlobalBanner: Error checking subscription:', error);
        if (isMounted) {
          setIsSubscribed(false);
        }
      }
    };

    // Start checking after a short delay to let OneSignal initialize
    const timeout = setTimeout(checkSubscription, 2000);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [user]);

  // Determine if we should show the banner
  // Only show once we've confirmed user is NOT subscribed (isSubscribed === false)
  const shouldShow = 
    user &&
    !isDismissed &&
    isSubscribed === false && // Explicitly false, not null (still loading)
    !permissionDenied &&
    'Notification' in window;

  const handleEnable = async () => {
    setIsEnabling(true);
    try {
      const OS = (window as any).OneSignal;
      if (OS?.Slidedown) {
        await OS.Slidedown.promptPush();
        
        // Wait and recheck subscription
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const subscriptionId = OS.User?.PushSubscription?.id;
        const optedIn = OS.User?.PushSubscription?.optedIn;
        
        if (subscriptionId && optedIn) {
          setIsSubscribed(true);
          setIsDismissed(true);
        }
      }
    } catch (error) {
      console.error('🔔 GlobalBanner: Error enabling notifications:', error);
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('global-notification-banner-dismissed', new Date().toISOString());
  };

  if (!shouldShow) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-lg animate-in slide-in-from-top duration-300">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="rounded-full bg-primary-foreground/20 p-2 shrink-0">
              <Bell className="h-4 w-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                🔔 Enable notifications to get alerts when someone needs your food recs!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleEnable}
              disabled={isEnabling}
              className="rounded-full text-xs"
            >
              {isEnabling ? 'Enabling...' : 'Enable'}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
