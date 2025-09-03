import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Guard against double OneSignal initialization
declare global {
  interface Window {
    __onesignalInit?: boolean;
  }
}

export const OneSignalInit = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || window.__onesignalInit) return;

    console.log("🔔 Initializing OneSignal (guarded)");
    
    // Guard against double initialization
    if (window.__onesignalInit) {
      console.log("🔔 OneSignal already initialized, skipping");
      return;
    }

    try {
      // Load OneSignal SDK
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/OneSignalSDK.js';
      script.async = true;
      script.onload = () => {
        if (window.OneSignal && !window.__onesignalInit) {
          window.OneSignal.init({
            appId: '3e1c8a7e-2c8a-4b8a-9b8a-1c8a7e2c8a4b', // Replace with actual OneSignal App ID
            safari_web_id: 'web.onesignal.auto.18140b17-b554-4c1d-9282-a2e8df4b84cb',
            notifyButton: {
              enable: false,
            },
            allowLocalhostAsSecureOrigin: true,
          });
          
          window.__onesignalInit = true;
          console.log("✅ OneSignal initialized successfully");
        }
      };
      
      if (!document.querySelector(`script[src="${script.src}"]`)) {
        document.head.appendChild(script);
      }
    } catch (error) {
      console.error("❌ OneSignal initialization error:", error);
    }
  }, [user]);

  return null;
};