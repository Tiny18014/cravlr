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
const APP_URL = Deno.env.get('APP_URL') || 'https://cravlr.com';

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
  console.log('🔔 Send nearby notification endpoint called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const body = await req.json();
    const validationResult = notificationSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { requestId } = validationResult.data;

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
      return new Response(
        JSON.stringify({ error: 'Request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify ownership
    if (request.requester_id !== user.id) {
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

    // Find eligible recommenders
    // 1. notify_recommender = true
    // 2. recommender_paused = false
    // 3. Within radius OR same city/state
    const { data: eligibleProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name, location_city, location_state, profile_lat, profile_lng, notification_radius_km, phone_number, sms_notifications_enabled, sms_new_requests')
      .eq('notify_recommender', true)
      .neq('recommender_paused', true)
      .neq('id', user.id);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

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

    console.log(`Found ${matchedUsers.length} matched recommenders`);

    if (matchedUsers.length === 0) {
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
      console.error('Error fetching device tokens:', tokensError);
    }

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

    const notificationPayload = {
      title: `🍽️ New Craving in ${cityDisplay}`,
      body: bodyText,
      data: {
        type: 'NEW_REQUEST_NEARBY',
        requestId: request.id,
        requestCity: request.location_city,
        foodType: request.food_type,
      },
      deepLink: `/send-recommendation?requestId=${request.id}`,
    };

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
            url: `${APP_URL}/browse-requests`,
            buttons: [
              { id: 'help', text: 'Help Out' },
              { id: 'dismiss', text: 'Not Now' }
            ],
          };

          const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
            },
            body: JSON.stringify(oneSignalPayload),
          });

          const result = await response.json();
          console.log('OneSignal response:', result);
          notificationsSent = result.recipients || playerIds.length;
        } catch (pushError) {
          console.error('OneSignal push error:', pushError);
        }
      }
    }

    // Send SMS to eligible users via OneSignal
    let smsSent = 0;
    if (ONESIGNAL_APP_ID && ONESIGNAL_API_KEY && smsEligibleUsers.length > 0) {
      const smsMessage = `🍽️ Cravlr: ${requesterName} is craving ${bodyText} in ${cityDisplay}. Can you help? cravlr.com/browse-requests`;
      
      for (const smsUser of smsEligibleUsers) {
        try {
          const smsPayload = {
            app_id: ONESIGNAL_APP_ID,
            include_aliases: {
              external_id: [smsUser.id],
            },
            target_channel: "sms",
            name: "New Request SMS",
            contents: { en: smsMessage },
          };

          const smsResponse = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
            },
            body: JSON.stringify(smsPayload),
          });

          const smsResult = await smsResponse.json();
          if (!smsResult.errors) {
            smsSent++;
            console.log(`📱 SMS sent to user ${smsUser.id}`);
          } else {
            console.error(`📱 SMS error for user ${smsUser.id}:`, smsResult.errors);
          }
        } catch (smsError) {
          console.error(`📱 SMS exception for user ${smsUser.id}:`, smsError);
        }
      }
      console.log(`📱 Total SMS sent: ${smsSent}/${smsEligibleUsers.length}`);
    }
    // Create in-app notifications for matched recommenders
    // Only use columns that exist in the recommender_notifications table
    const inAppNotifications = matchedUsers.map(userId => ({
      recommender_id: userId,
      type: 'new_request_nearby',
      title: notificationPayload.title,
      message: notificationPayload.body,
      restaurant_name: `${request.location_city} | ${request.id}`, // Include request_id in restaurant_name for deduplication
      recommendation_id: null,
      read: false,
    }));

    let inAppCreated = 0;
    if (inAppNotifications.length > 0) {
      // Insert notifications - restaurant_name field includes request_id for reference
      const { data: insertedData, error: insertError } = await supabaseAdmin
        .from('recommender_notifications')
        .insert(inAppNotifications)
        .select('id');
      
      if (insertError) {
        console.log('Insert notification error:', insertError.message);
      } else {
        inAppCreated = insertedData?.length || 0;
        console.log(`Created ${inAppCreated} in-app notifications`);
      }
    }

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
    console.error('Error sending nearby notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});