import { useEffect, useState } from 'react';
import { RefreshCw, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface LoadingFallbackProps {
  isLoading: boolean;
  timeout?: number;
  children: React.ReactNode;
}

export const LoadingFallback = ({ isLoading, timeout = 8000, children }: LoadingFallbackProps) => {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowFallback(false);
      return;
    }

    const timer = setTimeout(() => {
      if (isLoading) {
        setShowFallback(true);
      }
    }, timeout);

    return () => clearTimeout(timer);
  }, [isLoading, timeout]);

  if (!isLoading) {
    return <>{children}</>;
  }

  if (!showFallback) {
    return <>{children}</>;
  }

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleClearSiteData = () => {
    // Clear localStorage
    localStorage.clear();
    // Clear sessionStorage
    sessionStorage.clear();
    // Unregister service workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
    }
    // Clear caches
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }
    // Reload after clearing
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const handleOpenIncognito = () => {
    const currentUrl = window.location.href;
    // Copy URL to clipboard for user to paste in incognito
    navigator.clipboard.writeText(currentUrl).then(() => {
      alert('URL copied! Open an Incognito window (Ctrl+Shift+N or Cmd+Shift+N) and paste the URL.');
    }).catch(() => {
      alert(`Open an Incognito window and go to: ${currentUrl}`);
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Having trouble loading?</CardTitle>
          <CardDescription className="text-base mt-2">
            This might be caused by cached data or a browser extension interfering with the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            onClick={handleRefresh} 
            variant="default" 
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Page
          </Button>
          
          <Button 
            onClick={handleClearSiteData} 
            variant="outline" 
            className="w-full"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Site Data & Reload
          </Button>
          
          <Button 
            onClick={handleOpenIncognito} 
            variant="ghost" 
            className="w-full"
          >
            <Eye className="mr-2 h-4 w-4" />
            Open in Incognito
          </Button>
          
          <p className="text-xs text-muted-foreground text-center pt-2">
            If the issue persists, try disabling browser extensions or using a different browser.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
