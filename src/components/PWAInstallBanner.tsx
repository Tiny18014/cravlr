import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Download, Share } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function PWAInstallBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { isInstallable, isIOSSafari, promptInstall } = usePWAInstall();

  if (dismissed || (!isInstallable && !isIOSSafari)) {
    return null;
  }

  const handleInstall = async () => {
    if (isInstallable) {
      const installed = await promptInstall();
      if (installed) {
        setDismissed(true);
      }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border border-primary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Download className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Install Cravlr</h3>
            <p className="text-xs text-muted-foreground">
              {isIOSSafari 
                ? 'Tap Share → Add to Home Screen for notifications'
                : 'Get push notifications and faster access'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isInstallable ? (
            <Button size="sm" onClick={handleInstall}>
              Install
            </Button>
          ) : isIOSSafari ? (
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Share className="h-3 w-3" />
              <span>Share</span>
            </div>
          ) : null}
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}