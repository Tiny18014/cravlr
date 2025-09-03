import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Track the click
    const userAgent = req.headers.get('User-Agent') || '';
    const clientIP = req.headers.get('CF-Connecting-IP') || 
                     req.headers.get('X-Forwarded-For') || 
                     req.headers.get('X-Real-IP') || 
                     'unknown';

    const clickData = {
      referral_link_id: referralLink.id,
      request_id: referralLink.request_id,
      recommendation_id: referralLink.recommendation_id,
      requester_id: referralLink.food_requests?.requester_id,
      recommender_id: referralLink.recommendations?.recommender_id,
      user_agent: userAgent,
      ip_address: clientIP
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
    if (referralLink.maps_url) {
      return Response.redirect(referralLink.maps_url, 302);
    } else {
      // If no maps URL, return a success page or restaurant info
      return new Response(
        JSON.stringify({
          success: true,
          restaurant: referralLink.restaurant_name,
          message: 'Click tracked successfully'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
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