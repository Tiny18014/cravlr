import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const APP_URL = Deno.env.get('APP_URL') || 'https://cravlr.lovable.app';

// Haversine formula to calculate distance between two points
function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const notificationSchema = z.object({
  requestId: z.string().uuid(),
});

serve(async (req) => {
  console.log('[send-nearby-notification] Starting...');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[send-nearby-notification] No auth header provided');
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

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('[send-nearby-notification] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[send-nearby-notification] Authenticated user:', user.id);

    // Parse request
    const body = await req.json();
    console.log('[send-nearby-notification] Request body:', body);
    
    const validationResult = notificationSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('[send-nearby-notification] Validation error:', validationResult.error);
      return new Response(
        JSON.stringify({ error: 'Invalid input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { requestId } = validationResult.data;
    console.log('[send-nearby-notification] Processing request ID:', requestId);

    // Get service role client for cross-user queries
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch the food request
    const { data: request, error: requestError } = await supabaseAdmin
      .from('food_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      console.error('[send-nearby-notification] Request not found:', requestError);
      return new Response(
        JSON.stringify({ error: 'Request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[send-nearby-notification] Found request:', { id: request.id, food_type: request.food_type, city: request.location_city });

    // Verify ownership
    if (request.requester_id !== user.id) {
      console.error('[send-nearby-notification] Forbidden - user does not own request');
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get requester's profile for display name
    const { data: requesterProfile } = await supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();

    const requesterName = requesterProfile?.display_name || 'Someone';
    console.log('[send-nearby-notification] Requester name:', requesterName);

    // Find eligible recommenders
    const { data: eligibleProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name, location_city, location_state, profile_lat, profile_lng, notification_radius_km, phone_number, sms_notifications_enabled, sms_new_requests')
      .eq('notify_recommender', true)
      .neq('recommender_paused', true)
      .neq('id', user.id);

    if (profilesError) {
      console.error('[send-nearby-notification] Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log('[send-nearby-notification] Total eligible profiles:', eligibleProfiles?.length || 0);

    // Filter by location
    const matchedUsers: string[] = [];
    const smsEligibleUsers: { id: string; phone_number: string }[] = [];
    const requestLat = request.lat;
    const requestLng = request.lng;

    for (const profile of eligibleProfiles || []) {
      let isMatch = false;

      // If we have precise coordinates for both
      if (requestLat && requestLng && profile.profile_lat && profile.profile_lng) {
        const distance = calculateDistanceKm(
          requestLat, requestLng,
          profile.profile_lat, profile.profile_lng
        );
        const radius = profile.notification_radius_km || 20;
        if (distance <= radius) {
          isMatch = true;
        }
      } else {
        // Fall back to city/state matching
        if (profile.location_city?.toLowerCase() === request.location_city?.toLowerCase() &&
            profile.location_state?.toLowerCase() === request.location_state?.toLowerCase()) {
          isMatch = true;
        }
      }

      if (isMatch) {
        matchedUsers.push(profile.id);
        
        // Check if user is eligible for SMS
        if (profile.phone_number && 
            profile.sms_notifications_enabled !== false && 
            profile.sms_new_requests !== false) {
          smsEligibleUsers.push({ id: profile.id, phone_number: profile.phone_number });
        }
      }
    }

    console.log('[send-nearby-notification] Matched recommenders:', matchedUsers.length);
    console.log('[send-nearby-notification] SMS eligible users:', smsEligibleUsers.length);

    if (matchedUsers.length === 0) {
      console.log('[send-nearby-notification] No nearby recommenders found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No nearby recommenders found',
          matchedUsers: 0,
          notificationsSent: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get device tokens for matched users
    const { data: deviceTokens, error: tokensError } = await supabaseAdmin
      .from('device_tokens')
      .select('user_id, onesignal_player_id, token, platform')
      .in('user_id', matchedUsers)
      .eq('is_active', true);

    if (tokensError) {
      console.error('[send-nearby-notification] Error fetching device tokens:', tokensError);
    }

    console.log('[send-nearby-notification] Device tokens found:', deviceTokens?.length || 0);

    // Build notification content
    const cityDisplay = request.location_city || 'your area';
    const foodType = request.food_type || 'food';
    
    // Parse food type for cleaner display
    const foodParts = foodType.split('|').map((p: string) => p.trim());
    const flavors = foodParts[0] || '';
    const cuisines = foodParts[1] || '';
    
    let bodyText = `Looking for ${flavors} food`;
    if (cuisines && cuisines !== 'Anything') {
      bodyText = `Craving ${cuisines} (${flavors})`;
    }

    // Generate deep link URL
    const deepLinkPath = `/send-recommendation?requestId=${request.id}`;
    const deepLinkUrl = `${APP_URL}${deepLinkPath}`;
    console.log('[send-nearby-notification] Generated deep link:', deepLinkUrl);

    const notificationPayload = {
      title: `🍽️ New Craving in ${cityDisplay}`,
      body: bodyText,
      data: {
        type: 'NEW_REQUEST_NEARBY',
        requestId: request.id,
        requestCity: request.location_city,
        foodType: request.food_type,
        deepLink: deepLinkPath,
      },
    };

    // Create in-app notifications FIRST (before sending push/SMS)
    console.log('[send-nearby-notification] Creating in-app notifications...');
    const inAppNotifications = matchedUsers.map(userId => ({
      recommender_id: userId,
      request_id: request.id,
      type: 'new_request_nearby',
      title: notificationPayload.title,
      message: notificationPayload.body,
      restaurant_name: `${request.location_city} | ${request.food_type}`,
      recommendation_id: null,
      read: false,
    }));

    let inAppCreated = 0;
    if (inAppNotifications.length > 0) {
      const { data: insertedData, error: insertError } = await supabaseAdmin
        .from('recommender_notifications')
        .upsert(inAppNotifications, { 
          onConflict: 'recommender_id,request_id,type',
          ignoreDuplicates: true 
        })
        .select('id');
      
      if (insertError) {
        console.error('[send-nearby-notification] DB insert error:', insertError);
      } else {
        inAppCreated = insertedData?.length || 0;
        console.log('[send-nearby-notification] DB insert success - created:', inAppCreated);
      }
    }

    let notificationsSent = 0;

    // Send via OneSignal if configured
    if (ONESIGNAL_APP_ID && ONESIGNAL_API_KEY && deviceTokens?.length) {
      const playerIds = deviceTokens
        .filter(t => t.onesignal_player_id)
        .map(t => t.onesignal_player_id);

      if (playerIds.length > 0) {
        try {
          const oneSignalPayload = {
            app_id: ONESIGNAL_APP_ID,
            include_player_ids: playerIds,
            headings: { en: notificationPayload.title },
            contents: { en: notificationPayload.body },
            data: notificationPayload.data,
            url: deepLinkUrl,
            buttons: [
              { id: 'help', text: 'Help Out' },
              { id: 'dismiss', text: 'Not Now' }
            ],
          };

          console.log('[send-nearby-notification] Sending to OneSignal:', { playerIds: playerIds.length, url: deepLinkUrl });

          const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
            },
            body: JSON.stringify(oneSignalPayload),
          });

          const result = await response.json();
          console.log('[send-nearby-notification] OneSignal response:', result);
          notificationsSent = result.recipients || playerIds.length;
        } catch (pushError) {
          console.error('[send-nearby-notification] OneSignal push error:', pushError);
        }
      }
    }

    // Send SMS to eligible users via OneSignal
    let smsSent = 0;
    if (ONESIGNAL_APP_ID && ONESIGNAL_API_KEY && smsEligibleUsers.length > 0) {
      // SMS with deep link
      const smsMessage = `🍽️ Cravlr: ${requesterName} is craving ${bodyText} in ${cityDisplay}. Help them out: ${deepLinkUrl}`;

      console.log('[send-nearby-notification] SMS message:', smsMessage);

      for (const smsUser of smsEligibleUsers) {
        try {
          // Step 1: Ensure OneSignal knows this user's SMS subscription
          const upsertPayload = {
            identity: { external_id: smsUser.id },
            subscriptions: [
              {
                type: "SMS",
                token: smsUser.phone_number,
                enabled: true,
              },
            ],
          };
          
          console.log('[send-nearby-notification] Upserting SMS subscription for user:', smsUser.id);

          const upsertResponse = await fetch(
            `https://onesignal.com/api/v1/apps/${ONESIGNAL_APP_ID}/users`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${ONESIGNAL_API_KEY}`,
              },
              body: JSON.stringify(upsertPayload),
            }
          );

          const upsertData = await upsertResponse.json().catch(() => ({}));
          console.log('[send-nearby-notification] SMS subscription upsert response:', { userId: smsUser.id, status: upsertResponse.status });

          if (!upsertResponse.ok) {
            console.error('[send-nearby-notification] SMS subscription upsert failed:', upsertData);
            continue;
          }

          // Step 2: Send the SMS
          const smsPayload = {
            app_id: ONESIGNAL_APP_ID,
            include_phone_numbers: [smsUser.phone_number],
            contents: { en: smsMessage },
            sms_content: smsMessage, // Explicit SMS content field
            name: "New Request SMS",
          };

          console.log('[send-nearby-notification] Sending SMS to:', smsUser.phone_number);

          const smsResponse = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Basic ${ONESIGNAL_API_KEY}`,
            },
            body: JSON.stringify(smsPayload),
          });

          const smsResult = await smsResponse.json().catch(() => ({}));
          console.log('[send-nearby-notification] SMS send response:', { phone: smsUser.phone_number, status: smsResponse.status, result: smsResult });

          const recipients = typeof smsResult?.recipients === "number" ? smsResult.recipients : undefined;

          if (smsResponse.ok && !smsResult?.errors && (recipients === undefined || recipients > 0)) {
            smsSent++;
          } else if (smsResult?.errors) {
            console.error('[send-nearby-notification] SMS error:', smsResult.errors);
          }
        } catch (smsError) {
          console.error('[send-nearby-notification] SMS exception for user:', smsUser.id, smsError);
        }
      }

      console.log('[send-nearby-notification] Total SMS accepted:', smsSent, '/', smsEligibleUsers.length);
    }

    console.log('[send-nearby-notification] Completed successfully:', {
      matchedUsers: matchedUsers.length,
      notificationsSent,
      smsSent,
      inAppCreated,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        matchedUsers: matchedUsers.length,
        notificationsSent,
        smsSent,
        inAppCreated,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-nearby-notification] Error occurred:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
