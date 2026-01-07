import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// OneSignal configuration for push notifications
const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
  requestId: z.string().uuid({ message: 'Invalid request ID format' })
});

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Send push notification via OneSignal
async function sendPushNotification(
  userIds: string[],
  title: string,
  message: string,
  data: Record<string, any>
): Promise<{ success: boolean; sentCount: number }> {
  // Validate UUID format for App ID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!ONESIGNAL_APP_ID || !uuidRegex.test(ONESIGNAL_APP_ID)) {
    console.error('❌ OneSignal skipped: Invalid or missing App ID (must be a UUID)');
    return { success: false, sentCount: 0 };
  }

  if (!ONESIGNAL_API_KEY || userIds.length === 0) {
    console.log('Push notifications skipped - missing config or no recipients');
    return { success: false, sentCount: 0 };
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_aliases: {
          external_id: userIds
        },
        target_channel: "push",
        headings: { en: title },
        contents: { en: message },
        data: data,
        ios_badgeType: 'Increase',
        ios_badgeCount: 1,
        android_channel_id: 'cravlr_requests',
        priority: 10,
        web_push_topic: 'new_request',
      }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error('OneSignal errors:', result.errors);
      return { success: false, sentCount: 0 };
    }

    console.log(`✅ Push notification sent to ${result.recipients || 0} devices`);
    return { success: true, sentCount: result.recipients || userIds.length };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, sentCount: 0 };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = requestSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid input',
          details: validationResult.error.issues.map(i => i.message)
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { requestId } = validationResult.data;

    console.log(`📍 Processing area notification for request ${requestId}`);

    // Get request details
    const { data: request, error: requestError } = await supabase
      .from('food_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      console.error('Error fetching request:', requestError);
      return new Response(
        JSON.stringify({ error: 'Request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the authenticated user owns this request
    if (request.requester_id !== user.id) {
      console.error('❌ User does not own this request');
      return new Response(
        JSON.stringify({ error: 'Forbidden: You can only send notifications for your own requests' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get requester profile
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', request.requester_id)
      .single();

    // Find users who are eligible for notifications
    const hasCoordinates = request.lat && request.lng;

    console.log(`📍 Finding users for request. Coordinates: ${hasCoordinates ? 'Yes' : 'No'}. City: ${request.location_city}`);

    // Fetch potential recommenders using a simpler query to avoid OR complexity issues
    const { data: potentialUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, display_name, notify_recommender, recommender_paused, profile_lat, profile_lng, notification_radius_km, location_city, location_state')
      .neq('id', request.requester_id);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw new Error('Failed to find users');
    }

    console.log(`📍 Found ${potentialUsers?.length || 0} total profiles (excluding requester). Filtering...`);

    const eligibleUsers = (potentialUsers || []).filter(u => {
      // 1. Check Preferences
      if (u.notify_recommender === false) return false; // Explicitly disabled
      if (u.recommender_paused === true) return false; // Explicitly paused

      // 2. If Request has coords AND User has coords -> Check Radius
      if (hasCoordinates && u.profile_lat && u.profile_lng) {
        const distance = calculateDistance(
          request.lat,
          request.lng,
          u.profile_lat,
          u.profile_lng
        );
        const radius = u.notification_radius_km || 20;
        const inRange = distance <= radius;
        if (inRange) console.log(`✅ User ${u.display_name} matched by distance (${Math.round(distance)}km)`);
        return inRange;
      }

      // 3. Fallback: Fuzzy City Matching
      const userCity = (u.location_city || '').trim().toLowerCase();
      const requestCity = (request.location_city || '').trim().toLowerCase();

      if (!userCity || !requestCity) return false;

      const match = userCity.includes(requestCity) || requestCity.includes(userCity);
      if (match) console.log(`✅ User ${u.display_name} matched by city (${userCity} ~= ${requestCity})`);
      return match;
    });

    console.log(`📍 Final Match: Found ${eligibleUsers.length} users within radius/city`);

    if (eligibleUsers.length === 0) {
      console.log('No eligible users found');
      return new Response(JSON.stringify({
        message: 'No eligible users found',
        notificationsSent: 0
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Found ${eligibleUsers.length} eligible users to notify`);

    // Get user IDs for push notifications (Targeting via External ID)
    const userIds = eligibleUsers.map(u => u.id);
    console.log(`Targeting ${userIds.length} users for push via External ID`);

    // Send push notifications
    const locationDisplay = request.location_state
      ? `${request.location_city}, ${request.location_state}`
      : request.location_city;

    const pushTitle = '🍽️ New food request nearby!';
    const pushMessage = `Someone's craving ${request.food_type} in ${locationDisplay}. Know a great spot?`;
    const pushData = {
      type: 'NEW_REQUEST_NEARBY',
      requestId: request.id,
      foodType: request.food_type,
      location: locationDisplay,
      url: `/recommend/${request.id}`
    };

    const pushResult = await sendPushNotification(userIds, pushTitle, pushMessage, pushData);

    console.log(`✅ Sent ${pushResult.sentCount} push notifications`);

    return new Response(JSON.stringify({
      success: true,
      pushNotificationsSent: pushResult.sentCount,
      totalEligibleUsers: eligibleUsers.length
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in notify-area-users function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
