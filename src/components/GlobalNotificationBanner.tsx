import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { useDeviceToken } from '@/hooks/useDeviceToken';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

/**
 * Global notification banner that appears for logged-in users
 * who haven't subscribed to push notifications yet.
 * Shows as a fixed banner at the top of the screen.
 */
export const GlobalNotificationBanner: React.FC = () => {
  const { user } = useAuth();
  const { isRegistered, isLoading, permissionState, registerToken } = useDeviceToken();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

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
    setHasChecked(true);
  }, []);

  // Determine if we should show the banner
  const shouldShow = 
    hasChecked &&
    user &&
    !isDismissed &&
    !isRegistered &&
    permissionState !== 'denied' &&
    permissionState !== 'unsupported' &&
    !isLoading;

  const handleEnable = async () => {
    setIsEnabling(true);
    try {
      const success = await registerToken();
      if (success) {
        setIsDismissed(true);
      }
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
