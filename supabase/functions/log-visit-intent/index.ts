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
  console.log('[log-visit-intent] Starting...');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('[log-visit-intent] Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('[log-visit-intent] No auth header provided');
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
      console.error('[log-visit-intent] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[log-visit-intent] Authenticated user:', user.id);

    const body = await req.json();
    const { recommendationId, requestId, restaurantName, placeId } = body;
    
    console.log('[log-visit-intent] Request body:', { recommendationId, requestId, restaurantName, placeId });

    // Validate required fields
    if (!recommendationId || !requestId || !restaurantName) {
      console.error('[log-visit-intent] Missing required fields:', { recommendationId, requestId, restaurantName });
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
      console.error('[log-visit-intent] Request not found:', requestError);
      return new Response(
        JSON.stringify({ error: 'Request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (requestData.requester_id !== user.id) {
      console.error('[log-visit-intent] Forbidden - user does not own request');
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
      console.error('[log-visit-intent] Recommendation not found:', recError);
      return new Response(
        JSON.stringify({ error: 'Recommendation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[log-visit-intent] Found recommender:', recommendationData.recommender_id);

    // Get referral_link_id and commission_rate if they exist
    const { data: referralLinkData } = await supabaseAdmin
      .from('referral_links')
      .select('id, commission_rate')
      .eq('recommendation_id', recommendationId)
      .maybeSingle();

    console.log('[log-visit-intent] Referral link data:', referralLinkData);

    // Insert the visit intent (clicked_at is automatically set by default)
    console.log('[log-visit-intent] Inserting referral click...');
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

    if (insertError) {
      console.error('[log-visit-intent] DB insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to log visit intent' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[log-visit-intent] DB insert success');

    // Update recommendation status to 'accepted'
    console.log('[log-visit-intent] Updating recommendation status to accepted...');
    const { error: updateError } = await supabaseAdmin
      .from('recommendations')
      .update({ status: 'accepted' })
      .eq('id', recommendationId);

    if (updateError) {
      console.error('[log-visit-intent] DB update error:', updateError);
    } else {
      console.log('[log-visit-intent] DB update success - recommendation status set to accepted');
    }

    // Generate deep link for the notification
    const deepLinkPath = `/request-results/${requestId}`;
    const deepLinkUrl = `${APP_URL}${deepLinkPath}`;
    console.log('[log-visit-intent] Generated deep link:', deepLinkUrl);

    // Create in-app notification for the recommender FIRST
    console.log('[log-visit-intent] Creating recommender notification...');
    const { error: notifError } = await supabaseAdmin
      .from('recommender_notifications')
      .insert({
        recommender_id: recommendationData.recommender_id,
        recommendation_id: recommendationId,
        request_id: requestId,
        type: 'accepted',
        title: 'Your recommendation was accepted!',
        message: `Someone is going to ${restaurantName} based on your recommendation! 🎉`,
        restaurant_name: restaurantName,
        read: false
      });

    if (notifError) {
      console.error('[log-visit-intent] Notification insert error:', notifError);
    } else {
      console.log('[log-visit-intent] Notification insert success');
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
          headings: { en: '🎉 Recommendation Accepted!' },
          contents: { en: `Someone is visiting ${restaurantName} thanks to you!` },
          data: {
            type: 'RECOMMENDATION_ACCEPTED',
            recommendationId,
            requestId,
            restaurantName,
            deepLink: deepLinkPath,
          },
          url: deepLinkUrl,
        };

        console.log('[log-visit-intent] Sending to OneSignal:', { playerIds: playerIds.length, url: deepLinkUrl });

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
          console.log('[log-visit-intent] OneSignal response:', result);
        } catch (pushError) {
          console.error('[log-visit-intent] OneSignal error:', pushError);
        }
      } else {
        console.log('[log-visit-intent] No device tokens found for recommender');
      }

      // Send SMS to recommender if they have a phone number
      const { data: recommenderProfile } = await supabaseAdmin
        .from('profiles')
        .select('phone_number, sms_notifications_enabled, sms_recommendations')
        .eq('id', recommendationData.recommender_id)
        .single();

      if (recommenderProfile?.phone_number && 
          recommenderProfile.sms_notifications_enabled !== false &&
          recommenderProfile.sms_recommendations !== false) {
        
        const smsMessage = `🎉 Cravlr: Your recommendation for ${restaurantName} was accepted! Someone is visiting based on your tip.`;
        
        console.log('[log-visit-intent] Sending SMS to recommender:', recommenderProfile.phone_number);

        try {
          // Upsert SMS subscription
          await fetch(
            `https://onesignal.com/api/v1/apps/${ONESIGNAL_APP_ID}/users`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${ONESIGNAL_API_KEY}`,
              },
              body: JSON.stringify({
                identity: { external_id: recommendationData.recommender_id },
                subscriptions: [{ type: "SMS", token: recommenderProfile.phone_number, enabled: true }],
              }),
            }
          );

          const smsPayload = {
            app_id: ONESIGNAL_APP_ID,
            include_phone_numbers: [recommenderProfile.phone_number],
            contents: { en: smsMessage },
            sms_content: smsMessage,
            name: "Recommendation Accepted SMS",
          };

          const smsResponse = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Basic ${ONESIGNAL_API_KEY}`,
            },
            body: JSON.stringify(smsPayload),
          });

          const smsResult = await smsResponse.json();
          console.log('[log-visit-intent] SMS response:', smsResult);
        } catch (smsError) {
          console.error('[log-visit-intent] SMS error:', smsError);
        }
      }
    }

    console.log('[log-visit-intent] Completed successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[log-visit-intent] Error occurred:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
