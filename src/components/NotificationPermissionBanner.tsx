import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, X } from 'lucide-react';
import { useDeviceToken } from '@/hooks/useDeviceToken';
import { cn } from '@/lib/utils';

interface NotificationPermissionBannerProps {
  className?: string;
  onDismiss?: () => void;
}

export const NotificationPermissionBanner: React.FC<NotificationPermissionBannerProps> = ({
  className,
  onDismiss,
}) => {
  const { isRegistered, isLoading, permissionState, registerToken } = useDeviceToken();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  // Check if we should show the banner
  const shouldShow = 
    !isDismissed &&
    !isRegistered &&
    permissionState !== 'denied' &&
    permissionState !== 'unsupported' &&
    !isLoading;

  // Check localStorage for previous dismissal
  useEffect(() => {
    const dismissed = localStorage.getItem('notification-banner-dismissed');
    if (dismissed) {
      const dismissedAt = new Date(dismissed);
      const daysSinceDismissal = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
      // Show again after 7 days
      if (daysSinceDismissal < 7) {
        setIsDismissed(true);
      }
    }
  }, []);

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
    localStorage.setItem('notification-banner-dismissed', new Date().toISOString());
    onDismiss?.();
  };

  if (!shouldShow) return null;

  return (
    <Card className={cn("border-primary/20 bg-primary/5", className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground">
              Get notified about food requests
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Enable notifications to know when someone needs your food recommendations nearby.
            </p>
            
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleEnable}
                disabled={isEnabling}
                className="rounded-xl"
              >
                {isEnabling ? 'Enabling...' : 'Enable Notifications'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="rounded-xl text-muted-foreground"
              >
                Maybe Later
              </Button>
            </div>
          </div>

          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
