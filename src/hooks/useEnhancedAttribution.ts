import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AttributionInsights {
  device_type: string;
  browser: string;
  os: string;
  local_time: string;
  is_meal_time: boolean;
  is_weekend: boolean;
  is_business_hours: boolean;
  session_id: string;
  timezone: string;
}

interface EnhancedClickData {
  referral_code: string;
  user_agent: string;
  ip_address: string;
  screen_resolution?: string;
  timezone?: string;
  language?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  session_id?: string;
  device_fingerprint?: string;
}

export const useEnhancedAttribution = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate device fingerprint for session tracking
  const generateDeviceFingerprint = useCallback((): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('fingerprint', 2, 2);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }, []);

  // Get session ID from localStorage or generate new one
  const getSessionId = useCallback((): string => {
    const existing = localStorage.getItem('cravlr_session_id');
    if (existing) {
      return existing;
    }
    
    const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('cravlr_session_id', sessionId);
    return sessionId;
  }, []);

  // Enhanced click tracking with attribution data
  const trackEnhancedClick = useCallback(async (referralCode: string): Promise<any> => {
    setLoading(true);
    setError(null);

    try {
      // Collect enhanced attribution data
      const enhancedData: EnhancedClickData = {
        referral_code: referralCode,
        user_agent: navigator.userAgent,
        ip_address: 'client_side', // IP will be detected server-side
        screen_resolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        referrer: document.referrer,
        session_id: getSessionId(),
        device_fingerprint: generateDeviceFingerprint(),
        
        // UTM parameters from URL if present
        utm_source: new URLSearchParams(window.location.search).get('utm_source') || undefined,
        utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
        utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined,
      };

      // Call enhanced attribution edge function
      const { data, error } = await supabase.functions.invoke('enhanced-click-attribution', {
        body: enhancedData
      });

      if (error) {
        console.error('❌ Enhanced attribution error:', error);
        setError(error.message);
        return null;
      }

      console.log('✅ Enhanced attribution tracked:', data);
      return data;

    } catch (err: any) {
      console.error('❌ Enhanced attribution failed:', err);
      setError(err.message || 'Attribution tracking failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getSessionId, generateDeviceFingerprint]);

  // Predict conversion probability based on current context
  const predictConversion = useCallback((referralCode?: string): number => {
    let probability = 0.3; // Base probability
    
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    // Device type boost
    if (/Mobile|Android|iPhone|iPad/.test(navigator.userAgent)) {
      probability += 0.1; // Mobile users more likely to act quickly
    }
    
    // Time-based signals
    if (hour >= 11 && hour <= 14) { // Lunch hours
      probability += 0.15;
    } else if (hour >= 17 && hour <= 21) { // Dinner hours
      probability += 0.2;
    }
    
    // Weekend boost for restaurants
    if (day === 0 || day === 6) {
      probability += 0.1;
    }
    
    // Business hours
    if (hour >= 8 && hour <= 22) {
      probability += 0.1;
    }
    
    // Session signals
    const sessionAge = Date.now() - (parseInt(getSessionId().split('_')[1]) || Date.now());
    if (sessionAge < 30 * 60 * 1000) { // Fresh session (< 30 mins)
      probability += 0.05;
    }
    
    // Repeat visitor
    if (localStorage.getItem('cravlr_return_visitor')) {
      probability += 0.1;
    } else {
      localStorage.setItem('cravlr_return_visitor', 'true');
    }
    
    return Math.min(probability, 0.95);
  }, [getSessionId]);

  // Get current attribution insights
  const getAttributionInsights = useCallback((): AttributionInsights => {
    const userAgent = navigator.userAgent;
    const now = new Date();
    const hour = now.getHours();
    
    // Parse device info
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    const isTablet = /iPad|Android.*Tablet/.test(userAgent);
    
    let device_type = 'desktop';
    if (isMobile && !isTablet) device_type = 'mobile';
    if (isTablet) device_type = 'tablet';
    
    let browser = 'other';
    if (userAgent.includes('Chrome')) browser = 'chrome';
    else if (userAgent.includes('Firefox')) browser = 'firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'safari';
    else if (userAgent.includes('Edge')) browser = 'edge';
    
    let os = 'other';
    if (userAgent.includes('Windows')) os = 'windows';
    else if (userAgent.includes('Mac OS')) os = 'macos';
    else if (userAgent.includes('Android')) os = 'android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'ios';
    
    return {
      device_type,
      browser,
      os,
      local_time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      is_meal_time: (hour >= 11 && hour <= 14) || (hour >= 17 && hour <= 21),
      is_weekend: now.getDay() === 0 || now.getDay() === 6,
      is_business_hours: hour >= 8 && hour <= 22,
      session_id: getSessionId(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }, [getSessionId]);

  // Track page view with attribution context
  const trackPageView = useCallback(async (page: string, context?: Record<string, any>) => {
    try {
      const insights = getAttributionInsights();
      
      // This could be expanded to track page views in your analytics
      console.log('📄 Page view tracked:', {
        page,
        ...insights,
        ...context,
        timestamp: new Date().toISOString()
      });
      
      // In a full implementation, you might send this to your analytics service
      
    } catch (error) {
      console.error('❌ Page view tracking failed:', error);
    }
  }, [getAttributionInsights]);

  return {
    trackEnhancedClick,
    predictConversion,
    getAttributionInsights,
    trackPageView,
    generateDeviceFingerprint,
    getSessionId,
    loading,
    error
  };
};