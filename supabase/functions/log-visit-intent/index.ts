import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 log-visit-intent called');
    
    const authHeader = req.headers.get('Authorization');
    console.log('🔍 Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('❌ No auth header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      recommendationId, 
      requestId, 
      restaurantName, 
      placeId 
    } = await req.json();
    
    console.log('🔍 Request body:', { recommendationId, requestId, restaurantName, placeId });

    // Validate required fields
    if (!recommendationId || !requestId || !restaurantName) {
      console.error('❌ Missing required fields:', { recommendationId, requestId, restaurantName });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for secure operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the request belongs to the user
    const { data: requestData, error: requestError } = await supabaseAdmin
      .from('food_requests')
      .select('requester_id')
      .eq('id', requestId)
      .single();

    if (requestError || !requestData) {
      return new Response(
        JSON.stringify({ error: 'Request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (requestData.requester_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to log intent for this request' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recommender_id from the recommendation
    const { data: recommendationData, error: recError } = await supabaseAdmin
      .from('recommendations')
      .select('recommender_id')
      .eq('id', recommendationId)
      .single();

    if (recError || !recommendationData) {
      return new Response(
        JSON.stringify({ error: 'Recommendation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get referral_link_id and commission_rate if they exist
    const { data: referralLinkData } = await supabaseAdmin
      .from('referral_links')
      .select('id, commission_rate')
      .eq('recommendation_id', recommendationId)
      .maybeSingle();

    console.log('📊 Referral link data:', referralLinkData);

    // Insert the visit intent (clicked_at is automatically set by default)
    const { error: insertError } = await supabaseAdmin
      .from('referral_clicks')
      .insert({
        recommendation_id: recommendationId,
        request_id: requestId,
        requester_id: user.id,
        recommender_id: recommendationData.recommender_id,
        referral_link_id: referralLinkData?.id || null,
        restaurant_name: restaurantName,
        commission_rate: referralLinkData?.commission_rate || 10.00,
        converted: false,
        commission_paid: false
      });

    console.log('✅ Insert result:', insertError ? 'ERROR' : 'SUCCESS');
    if (insertError) {
      console.error('❌ Insert error details:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to log visit intent' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
