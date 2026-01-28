import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HTML escape function to prevent XSS attacks
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Sanitize User-Agent header to prevent log injection and data corruption
function sanitizeUserAgent(userAgent: string | null): string {
  if (!userAgent) return '';
  
  // Remove control characters (CRLF injection prevention)
  let sanitized = userAgent.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Truncate to max 500 characters
  sanitized = sanitized.slice(0, 500);
  
  return sanitized;
}

// Validate and sanitize IP address
function sanitizeIpAddress(ip: string | null): string {
  if (!ip) return 'unknown';
  
  // Remove control characters
  let sanitized = ip.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Truncate to reasonable length (max 45 chars for IPv6)
  sanitized = sanitized.slice(0, 45);
  
  // Basic validation - should contain only valid IP characters
  // IPv4: digits and dots, IPv6: hex digits, colons, and dots
  const ipPattern = /^[0-9a-fA-F.:]+$/;
  
  // Handle X-Forwarded-For which may contain multiple IPs
  const firstIp = sanitized.split(',')[0].trim();
  
  if (!ipPattern.test(firstIp)) {
    return 'unknown';
  }
  
  return firstIp;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Extract referral code from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const referralCode = pathParts[pathParts.length - 1];

    if (!referralCode) {
      return new Response('Missing referral code', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Validate referral code format
    const referralCodeSchema = z.string()
      .regex(/^[A-Z0-9]{8}$/, 'Invalid referral code format')
      .length(8, 'Referral code must be 8 characters');

    try {
      referralCodeSchema.parse(referralCode);
    } catch (error: any) {
      console.error('❌ Invalid referral code format:', referralCode);
      return new Response(
        JSON.stringify({ error: 'Invalid referral code format' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('📊 Tracking referral click for code:', referralCode);

    // Get referral link details
    const { data: referralLink, error: linkError } = await supabase
      .from('referral_links')
      .select(`
        *,
        recommendations!referral_links_recommendation_id_fkey(
          recommender_id
        ),
        food_requests!referral_links_request_id_fkey(
          requester_id
        )
      `)
      .eq('referral_code', referralCode)
      .single();

    if (linkError || !referralLink) {
      console.error('❌ Referral link not found:', linkError);
      return new Response('Referral link not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Check if link has expired
    const now = new Date();
    const expiresAt = new Date(referralLink.expires_at);
    if (now > expiresAt) {
      console.log('⏰ Referral link has expired');
      // Still redirect but don't track
      if (referralLink.maps_url) {
        return Response.redirect(referralLink.maps_url, 302);
      } else {
        return new Response('Referral link has expired', { 
          status: 410, 
          headers: corsHeaders 
        });
      }
    }

    // Get user info (if available)
    const authHeader = req.headers.get('Authorization');
    let userId = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Track the click with rate limiting and duplicate detection
    // Sanitize headers to prevent log injection and data corruption
    const userAgent = sanitizeUserAgent(req.headers.get('User-Agent'));
    const clientIP = sanitizeIpAddress(
      req.headers.get('CF-Connecting-IP') || 
      req.headers.get('X-Forwarded-For') || 
      req.headers.get('X-Real-IP')
    );

    // Rate limiting: Check for recent clicks from same IP (10 per hour)
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { data: recentClicks } = await supabase
      .from('referral_clicks')
      .select('id')
      .eq('ip_address', clientIP)
      .gte('clicked_at', oneHourAgo);

    if (recentClicks && recentClicks.length >= 10) {
      console.log('⚠️ Rate limit exceeded for IP:', clientIP);
      // Still redirect but don't track
      if (referralLink.maps_url) {
        return new Response(null, {
          status: 302,
          headers: {
            'Location': referralLink.maps_url,
            ...corsHeaders
          }
        });
      }
      return new Response(
        JSON.stringify({ error: 'Too many requests' }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Duplicate detection: Check for same IP + referral code within 24h
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const { data: duplicateClick } = await supabase
      .from('referral_clicks')
      .select('id')
      .eq('referral_link_id', referralLink.id)
      .eq('ip_address', clientIP)
      .gte('clicked_at', oneDayAgo)
      .limit(1);

    if (duplicateClick && duplicateClick.length > 0) {
      console.log('⚠️ Duplicate click detected - not tracking');
      // Redirect without tracking
      if (referralLink.maps_url) {
        return new Response(null, {
          status: 302,
          headers: {
            'Location': referralLink.maps_url,
            ...corsHeaders
          }
        });
      }
    }

    const clickData = {
      referral_link_id: referralLink.id,
      request_id: referralLink.request_id,
      recommendation_id: referralLink.recommendation_id,
      requester_id: referralLink.food_requests?.requester_id,
      recommender_id: referralLink.recommendations?.recommender_id,
      user_agent: userAgent,
      ip_address: clientIP,
      restaurant_name: referralLink.restaurant_name,
      place_id: referralLink.place_id
    };

    const { error: clickError } = await supabase
      .from('referral_clicks')
      .insert(clickData);

    if (clickError) {
      console.error('❌ Error tracking click:', clickError);
      // Continue with redirect even if tracking fails
    } else {
      console.log('✅ Tracked referral click');
    }

    // Redirect to the original destination
    let redirectUrl = referralLink.maps_url;
    
    // Fix old URL format if necessary
    if (redirectUrl && redirectUrl.includes('maps/place/?q=place_id:')) {
      // Convert old format to new working format
      const placeIdMatch = redirectUrl.match(/place_id:([^&]+)/);
      if (placeIdMatch && referralLink.restaurant_name) {
        redirectUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(referralLink.restaurant_name)}&query_place_id=${placeIdMatch[1]}`;
        console.log('🔧 Fixed old URL format to:', redirectUrl);
      }
    }
    
    if (redirectUrl) {
      console.log('🔗 Redirecting to:', redirectUrl);
      
      // Return a proper redirect response
      return new Response(null, {
        status: 302,
        headers: {
          'Location': redirectUrl,
          ...corsHeaders
        }
      });
    } else {
      // If no maps URL, return a success page or restaurant info
      // Escape restaurant name to prevent XSS attacks
      const safeRestaurantName = escapeHtml(referralLink.restaurant_name || 'Restaurant');
      
      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Restaurant Recommendation</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 500px; margin: 0 auto; }
            .restaurant { font-size: 24px; font-weight: bold; color: #2563eb; }
            .message { color: #666; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📍 Restaurant Recommendation</h1>
            <div class="restaurant">${safeRestaurantName}</div>
            <div class="message">Thank you for checking out this recommendation!</div>
            <div class="message">Visit them and enjoy your meal! 🍽️</div>
          </div>
        </body>
        </html>
        `,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html', ...corsHeaders },
        }
      );
    }

  } catch (error: any) {
    console.error('❌ Error in track-referral-click function:', error);
    
    // Try to redirect to a fallback URL if available
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
