import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Zod validation schema for input
const clickDataSchema = z.object({
  referral_code: z.string().min(1).max(50),
  user_agent: z.string().max(500),
  ip_address: z.string().max(100),
  screen_resolution: z.string().max(20).optional(),
  timezone: z.string().max(50).optional(),
  language: z.string().max(10).optional(),
  referrer: z.string().max(2000).optional(),
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
  session_id: z.string().max(100).optional(),
  device_fingerprint: z.string().max(100).optional()
});

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Parse and validate input
    const rawData = await req.json();
    const validationResult = clickDataSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      console.error('❌ Invalid input data:', validationResult.error.issues);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input data',
          details: validationResult.error.issues
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const clickData: EnhancedClickData = validationResult.data;
    
    console.log('📊 Enhanced attribution tracking for:', clickData.referral_code);

    // Get referral link details
    const { data: referralLink, error: linkError } = await supabase
      .from('referral_links')
      .select(`
        *,
        recommendations!referral_links_recommendation_id_fkey(
          recommender_id,
          restaurant_name,
          place_id
        ),
        food_requests!referral_links_request_id_fkey(
          requester_id,
          food_type,
          location_city,
          location_state
        )
      `)
      .eq('referral_code', clickData.referral_code)
      .single();

    if (linkError || !referralLink) {
      console.error('❌ Referral link not found:', linkError);
      return new Response(
        JSON.stringify({ error: 'Referral link not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if link has expired
    const now = new Date();
    const expiresAt = new Date(referralLink.expires_at);
    if (now > expiresAt) {
      console.log('⏰ Referral link has expired');
      return new Response(
        JSON.stringify({ error: 'Referral link has expired' }),
        { 
          status: 410, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract enhanced attribution data
    const deviceInfo = parseUserAgent(clickData.user_agent);
    const geoInfo = await getGeoLocation(clickData.ip_address);
    
    // Calculate conversion probability based on various signals
    const conversionSignals = calculateConversionSignals({
      ...clickData,
      deviceInfo,
      geoInfo,
      requestLocation: {
        city: referralLink.food_requests?.location_city,
        state: referralLink.food_requests?.location_state
      }
    });

    // Enhanced click tracking data
    const enhancedClickRecord = {
      referral_link_id: referralLink.id,
      request_id: referralLink.request_id,
      recommendation_id: referralLink.recommendation_id,
      requester_id: referralLink.food_requests?.requester_id,
      recommender_id: referralLink.recommendations?.recommender_id,
      restaurant_name: referralLink.recommendations?.restaurant_name || referralLink.restaurant_name,
      place_id: referralLink.recommendations?.place_id || referralLink.place_id,
      
      // Basic tracking
      user_agent: clickData.user_agent,
      ip_address: clickData.ip_address,
      click_source: 'enhanced_link',
      
      // Enhanced attribution data
      device_type: deviceInfo.device_type,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      screen_resolution: clickData.screen_resolution,
      timezone: clickData.timezone,
      language: clickData.language,
      referrer_url: clickData.referrer,
      
      // UTM parameters for campaign tracking
      utm_source: clickData.utm_source,
      utm_medium: clickData.utm_medium,
      utm_campaign: clickData.utm_campaign,
      
      // Session and fingerprinting
      session_id: clickData.session_id,
      device_fingerprint: clickData.device_fingerprint,
      
      // Geographic data
      country: geoInfo.country,
      city: geoInfo.city,
      region: geoInfo.region,
      
      // Conversion prediction
      conversion_probability: conversionSignals.probability,
      conversion_signals: JSON.stringify(conversionSignals.signals),
      
      // Additional metadata
      local_time: new Date().toISOString(),
      weekend_click: isWeekend(),
      business_hours: isBusinessHours(clickData.timezone)
    };

    // Insert enhanced click record
    const { data: clickRecord, error: clickError } = await supabase
      .from('referral_clicks')
      .insert(enhancedClickRecord)
      .select()
      .single();

    if (clickError) {
      console.error('❌ Error inserting enhanced click:', clickError);
      throw clickError;
    }

    console.log('✅ Enhanced click tracked with ID:', clickRecord.id);

    // If conversion probability is high, flag for early attention
    if (conversionSignals.probability > 0.8) {
      console.log('🎯 High conversion probability detected:', conversionSignals.probability);
      
      // Could trigger real-time notification to business owner
      await supabase
        .from('notifications')
        .insert({
          requester_id: referralLink.recommendations?.recommender_id,
          request_id: referralLink.request_id,
          type: 'high_intent_click',
          payload: {
            restaurant_name: referralLink.restaurant_name,
            probability: conversionSignals.probability,
            signals: conversionSignals.signals
          }
        });
    }

    // Return enhanced attribution data for client use
    return new Response(
      JSON.stringify({
        success: true,
        click_id: clickRecord.id,
        attribution: {
          conversion_probability: conversionSignals.probability,
          device_info: deviceInfo,
          geo_info: geoInfo,
          signals: conversionSignals.signals
        },
        redirect_url: referralLink.maps_url
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Error in enhanced-click-attribution:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Attribution tracking failed',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

// Parse user agent for device information
function parseUserAgent(userAgent: string) {
  const mobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(userAgent);
  const tablet = /iPad|Android.*Tablet|Kindle|Silk/i.test(userAgent);
  
  let device_type = 'desktop';
  if (mobile && !tablet) device_type = 'mobile';
  if (tablet) device_type = 'tablet';
  
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
  else if (userAgent.includes('Linux')) os = 'linux';
  
  return { device_type, browser, os };
}

// Get geographic information from IP (simplified - in production use a real service)
async function getGeoLocation(ipAddress: string) {
  try {
    // In production, integrate with IP geolocation service like MaxMind, IPStack, etc.
    // For now, return basic info
    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      latitude: null,
      longitude: null
    };
  } catch (error) {
    console.error('Geo location lookup failed:', error);
    return {
      country: 'Unknown',
      region: 'Unknown', 
      city: 'Unknown',
      latitude: null,
      longitude: null
    };
  }
}

// Calculate conversion probability based on multiple signals
function calculateConversionSignals(data: any) {
  const signals: Record<string, any> = {};
  let probability = 0.3; // Base probability

  // Device type signal
  if (data.deviceInfo.device_type === 'mobile') {
    probability += 0.1; // Mobile users more likely to convert
    signals.mobile_boost = true;
  }

  // Local vs distant clicks
  if (data.geoInfo.city === data.requestLocation?.city) {
    probability += 0.2; // Local users more likely to visit
    signals.local_user = true;
  }

  // Business hours
  if (data.business_hours) {
    probability += 0.15; // Clicks during business hours
    signals.business_hours = true;
  }

  // Weekend effect for restaurants
  if (isWeekend()) {
    probability += 0.1; // Weekend dining
    signals.weekend_click = true;
  }

  // Repeat clicks (session-based)
  if (data.session_id) {
    signals.has_session = true;
    probability += 0.05;
  }

  // Direct vs referred traffic
  if (!data.referrer || data.referrer.includes('direct')) {
    probability += 0.1; // Direct clicks show higher intent
    signals.direct_traffic = true;
  }

  // Time-based patterns
  const hour = new Date().getHours();
  if (hour >= 11 && hour <= 14) { // Lunch hours
    probability += 0.1;
    signals.lunch_hours = true;
  } else if (hour >= 17 && hour <= 21) { // Dinner hours
    probability += 0.15;
    signals.dinner_hours = true;
  }

  // Cap probability at 0.95
  probability = Math.min(probability, 0.95);

  return {
    probability: Math.round(probability * 100) / 100,
    signals
  };
}

// Utility functions
function isWeekend(): boolean {
  const day = new Date().getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

function isBusinessHours(timezone?: string): boolean {
  const now = new Date();
  const hour = now.getHours(); // Simplified - should use timezone
  return hour >= 8 && hour <= 22; // 8 AM to 10 PM
}

serve(handler);