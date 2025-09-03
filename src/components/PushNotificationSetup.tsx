import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Settings, Download } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function PushNotificationSetup() {
  const { isSupported, isSubscribed, permission, requestPermission, isLoading } = usePushNotifications();
  const { isInstallable, promptInstall } = usePWAInstall();
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    // Show setup if notifications are supported but not enabled
    if (isSupported && !isSubscribed && permission !== 'denied') {
      setShowSetup(true);
    }
  }, [isSupported, isSubscribed, permission]);

  if (!showSetup || permission === 'denied') {
    return null;
  }

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      setShowSetup(false);
    }
  };

  const handleInstallApp = async () => {
    await promptInstall();
  };

  return (
    <Card className="fixed top-4 right-4 z-50 p-4 max-w-sm bg-background/95 backdrop-blur border-primary/20">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Bell className="h-4 w-4 text-primary-foreground" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Get Notified</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Enable notifications to get alerts when people need food recommendations near you.
          </p>
          
          <div className="space-y-2">
            {isInstallable && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleInstallApp}
                className="w-full text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Install App
              </Button>
            )}
            
            <Button 
              size="sm" 
              onClick={handleEnableNotifications}
              disabled={isLoading}
              className="w-full text-xs"
            >
              <Bell className="h-3 w-3 mr-1" />
              {isLoading ? 'Setting up...' : 'Enable Notifications'}
            </Button>
            
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setShowSetup(false)}
              className="w-full text-xs"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}