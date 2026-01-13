import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');
const APP_URL = Deno.env.get('APP_URL') || 'https://cravlr.lovable.app';

serve(async (req) => {
  console.log('[handle-recommendation-decline] Starting...');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('[handle-recommendation-decline] No auth header provided');
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
      console.error('[handle-recommendation-decline] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[handle-recommendation-decline] Authenticated user:', user.id);

    const body = await req.json();
    const { recommendationId, requestId, restaurantName } = body;
    
    console.log('[handle-recommendation-decline] Request body:', { recommendationId, requestId, restaurantName });

    // Validate required fields
    if (!recommendationId || !requestId || !restaurantName) {
      console.error('[handle-recommendation-decline] Missing required fields:', { recommendationId, requestId, restaurantName });
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
      console.error('[handle-recommendation-decline] Request not found:', requestError);
      return new Response(
        JSON.stringify({ error: 'Request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (requestData.requester_id !== user.id) {
      console.error('[handle-recommendation-decline] Forbidden - user does not own request');
      return new Response(
        JSON.stringify({ error: 'Not authorized to decline this recommendation' }),
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
      console.error('[handle-recommendation-decline] Recommendation not found:', recError);
      return new Response(
        JSON.stringify({ error: 'Recommendation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[handle-recommendation-decline] Found recommender:', recommendationData.recommender_id);

    // Update recommendation status to 'declined'
    console.log('[handle-recommendation-decline] Updating recommendation status to declined...');
    const { error: updateError } = await supabaseAdmin
      .from('recommendations')
      .update({ status: 'declined' })
      .eq('id', recommendationId);

    if (updateError) {
      console.error('[handle-recommendation-decline] DB update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update recommendation status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[handle-recommendation-decline] DB update success - recommendation status set to declined');

    // Generate deep link
    const deepLinkPath = `/browse-requests`;
    const deepLinkUrl = `${APP_URL}${deepLinkPath}`;
    console.log('[handle-recommendation-decline] Generated deep link:', deepLinkUrl);

    // Create in-app notification for the recommender
    console.log('[handle-recommendation-decline] Creating recommender notification...');
    const { error: notifError } = await supabaseAdmin
      .from('recommender_notifications')
      .insert({
        recommender_id: recommendationData.recommender_id,
        recommendation_id: recommendationId,
        request_id: requestId,
        type: 'declined',
        title: 'Your recommendation was declined',
        message: `Your recommendation for ${restaurantName} wasn't selected this time.`,
        restaurant_name: restaurantName,
        read: false
      });

    if (notifError) {
      console.error('[handle-recommendation-decline] Notification insert error:', notifError);
    } else {
      console.log('[handle-recommendation-decline] Notification insert success');
    }

    // Send push notification to recommender via OneSignal
    if (ONESIGNAL_APP_ID && ONESIGNAL_API_KEY) {
      // Get recommender's device tokens
      const { data: deviceTokens } = await supabaseAdmin
        .from('device_tokens')
        .select('onesignal_player_id')
        .eq('user_id', recommendationData.recommender_id)
        .eq('is_active', true);

      const playerIds = (deviceTokens || [])
        .filter(t => t.onesignal_player_id)
        .map(t => t.onesignal_player_id);

      if (playerIds.length > 0) {
        const oneSignalPayload = {
          app_id: ONESIGNAL_APP_ID,
          include_player_ids: playerIds,
          headings: { en: 'Recommendation Not Selected' },
          contents: { en: `Your tip for ${restaurantName} wasn't chosen this time. Keep helping!` },
          data: {
            type: 'RECOMMENDATION_DECLINED',
            recommendationId,
            requestId,
            restaurantName,
            deepLink: deepLinkPath,
          },
          url: deepLinkUrl,
        };

        console.log('[handle-recommendation-decline] Sending to OneSignal:', { playerIds: playerIds.length, url: deepLinkUrl });

        try {
          const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
            },
            body: JSON.stringify(oneSignalPayload),
          });

          const result = await response.json();
          console.log('[handle-recommendation-decline] OneSignal response:', result);
        } catch (pushError) {
          console.error('[handle-recommendation-decline] OneSignal error:', pushError);
        }
      } else {
        console.log('[handle-recommendation-decline] No device tokens found for recommender');
      }
    }

    console.log('[handle-recommendation-decline] Completed successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[handle-recommendation-decline] Error occurred:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
