import { useEffect } from 'react';
import { useDeepLinking, useCapacitorPlatform } from '@/hooks/useDeepLinking';

/**
 * Capacitor Deep Link Handler Component
 * 
 * This component initializes deep linking support for native mobile apps.
 * It should be placed inside the BrowserRouter to have access to navigation.
 * 
 * Features:
 * - Listens for incoming deep links (Universal Links / App Links)
 * - Handles cold start URLs (app opened via link when not running)
 * - Handles warm start URLs (app brought to foreground via link)
 * - Logs all deep link activity for debugging
 * 
 * Usage:
 * Place this component inside your BrowserRouter:
 * 
 * <BrowserRouter>
 *   <CapacitorDeepLinkHandler />
 *   <Routes>...</Routes>
 * </BrowserRouter>
 */
export function CapacitorDeepLinkHandler() {
  const { isNative, platform } = useCapacitorPlatform();
  const { handleDeepLink } = useDeepLinking();

  useEffect(() => {
    console.log('[CapacitorDeepLinkHandler] Mounted');
    console.log('[CapacitorDeepLinkHandler] Platform:', platform);
    console.log('[CapacitorDeepLinkHandler] Is Native:', isNative);

    if (isNative) {
      console.log('[CapacitorDeepLinkHandler] Native platform detected, deep linking active');
    } else {
      console.log('[CapacitorDeepLinkHandler] Web platform, deep linking passive');
    }

    return () => {
      console.log('[CapacitorDeepLinkHandler] Unmounted');
    };
  }, [isNative, platform]);

  // This component doesn't render anything
  // It just sets up the deep linking listeners via the hook
  return null;
}

export default CapacitorDeepLinkHandler;
