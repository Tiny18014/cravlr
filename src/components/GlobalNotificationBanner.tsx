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

    // If the browser doesn't support notifications, don't show a banner.
    if (!('Notification' in window)) {
      setIsSubscribed(true);
      return;
    }

    const denied = Notification.permission === 'denied';
    setPermissionDenied(denied);
    if (denied) {
      setIsSubscribed(true);
      return;
    }

    let isMounted = true;
    let listenerAttached = false;
    let timeoutId: number | undefined;
    let OSRef: any = null;

    let checkCount = 0;
    const maxChecks = 15; // give OneSignal time to init + login

    const readSubscription = async () => {
      const OS = (window as any).OneSignal;
      if (!OS?.User?.PushSubscription) return null;

      // OneSignal SDK properties can be sync or promise-like depending on wrapper.
      const subscriptionId = await Promise.resolve(OS.User.PushSubscription.id);
      const optedIn = await Promise.resolve(OS.User.PushSubscription.optedIn);

      return { OS, subscriptionId, optedIn };
    };

    const onSubscriptionChange = (event: any) => {
      const current = event?.current;
      // Treat having an id as "subscribed" (optedIn can be undefined during init/login)
      const subscribed = Boolean(current?.id);
      console.log('🔔 GlobalBanner: Subscription changed -', { id: current?.id, optedIn: current?.optedIn });
      if (isMounted) setIsSubscribed(subscribed);
    };

    const check = async () => {
      checkCount++;

      try {
        const result = await readSubscription();
        if (!isMounted) return;

        if (result) {
          const { OS, subscriptionId, optedIn } = result;

          // Attach listener once (helps avoid false negatives right after refresh)
          if (!listenerAttached && OS?.User?.PushSubscription?.addEventListener) {
            listenerAttached = true;
            OSRef = OS;
            OS.User.PushSubscription.addEventListener('change', onSubscriptionChange);
          }

          console.log('🔔 GlobalBanner: Subscription check -', { subscriptionId, optedIn, checkCount });

          // If we have a subscription id, treat as subscribed (even if optedIn hasn't settled yet)
          if (subscriptionId) {
            setIsSubscribed(true);
            return;
          }
        }

        if (checkCount >= maxChecks) {
          console.log('🔔 GlobalBanner: Subscription not detected after timeout; showing banner');
          setIsSubscribed(false);
          return;
        }

        timeoutId = window.setTimeout(check, 1000);
      } catch (error) {
        console.log('🔔 GlobalBanner: Error checking subscription:', error);
        if (checkCount >= maxChecks && isMounted) {
          setIsSubscribed(false);
          return;
        }
        timeoutId = window.setTimeout(check, 1000);
      }
    };

    // Start shortly after render to let OneSignalInit run
    timeoutId = window.setTimeout(check, 1500);

    return () => {
      isMounted = false;
      if (timeoutId) window.clearTimeout(timeoutId);

      // Best-effort cleanup
      try {
        if (listenerAttached && OSRef?.User?.PushSubscription?.removeEventListener) {
          OSRef.User.PushSubscription.removeEventListener('change', onSubscriptionChange);
        }
      } catch {
        // ignore
      }
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

    const OS = (window as any).OneSignal;
    if (!OS?.Slidedown?.promptPush) {
      console.warn('🔔 GlobalBanner: OneSignal prompt not available');
      setIsEnabling(false);
      return;
    }

    try {
      // Protect against hanging promises
      await Promise.race([
        OS.Slidedown.promptPush(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Push prompt timed out')), 10000)),
      ]);

      // Re-check subscription (give it a moment to settle)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const subscriptionId = await Promise.resolve(OS.User?.PushSubscription?.id);
      const optedIn = await Promise.resolve(OS.User?.PushSubscription?.optedIn);

      console.log('🔔 GlobalBanner: Post-enable check -', { subscriptionId, optedIn });

      if (subscriptionId) {
        setIsSubscribed(true);
        setIsDismissed(true);
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
