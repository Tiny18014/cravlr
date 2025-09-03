import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  requestId: string;
  foodType: string;
  locationCity: string;
  locationState: string;
  urgency: 'low' | 'medium' | 'high';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { requestId, foodType, locationCity, locationState, urgency }: PushNotificationRequest = await req.json();

    // Get the food request details
    const { data: request, error: requestError } = await supabase
      .from('food_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      throw new Error('Request not found');
    }

    // Get eligible users for push notifications
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, notify_recommender, location_city, location_state, location_lat, location_lng, timezone, quiet_hours_start, quiet_hours_end')
      .eq('notify_recommender', true)
      .eq('is_active', true)
      .neq('user_id', request.requester_id);

    if (profilesError) {
      throw new Error('Failed to fetch profiles');
    }

    const eligibleUsers = profiles?.filter(profile => {
      // Same city and state
      if (profile.location_city !== request.location_city || 
          profile.location_state !== request.location_state) {
        return false;
      }

      // Check quiet hours if set
      if (profile.quiet_hours_start && profile.quiet_hours_end) {
        const now = new Date();
        const userTimezone = profile.timezone || 'America/New_York';
        
        // Simple quiet hours check (could be enhanced with proper timezone handling)
        const currentHour = now.getHours();
        const quietStart = parseInt(profile.quiet_hours_start.split(':')[0]);
        const quietEnd = parseInt(profile.quiet_hours_end.split(':')[0]);
        
        if (currentHour >= quietStart && currentHour < quietEnd) {
          return false;
        }
      }

      // Check radius if coordinates available
      if (profile.location_lat && profile.location_lng && 
          request.location_lat && request.location_lng) {
        const distance = calculateDistance(
          Number(profile.location_lat), Number(profile.location_lng),
          Number(request.location_lat), Number(request.location_lng)
        );
        return distance <= 15; // 15km radius
      }

      return true;
    }) || [];

    console.log(`Found ${eligibleUsers.length} eligible users for push notification`);

    // Get OneSignal player IDs for eligible users
    const userIds = eligibleUsers.map(u => u.user_id);
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('player_id')
      .in('user_id', userIds);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No push subscriptions found', eligible_users: eligibleUsers.length }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send push notifications via OneSignal API
    const playerIds = subscriptions.map(s => s.player_id);
    const oneSignalPayload = {
      app_id: Deno.env.get('ONESIGNAL_APP_ID'),
      include_player_ids: playerIds,
      headings: { en: '🍽️ Someone needs food help!' },
      contents: { 
        en: `Looking for ${foodType} in ${locationCity}, ${locationState}` 
      },
      data: {
        requestId,
        foodType,
        locationCity,
        locationState,
        urgency
      },
      buttons: [
        { id: 'open', text: 'Help Out' },
        { id: 'dismiss', text: 'Not Now' }
      ],
      url: `https://cb92860e-6c58-406c-a5fe-a11539c7bcb3.lovableproject.com/recommend/${requestId}`
    };

    const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Deno.env.get('ONESIGNAL_API_KEY')}`
      },
      body: JSON.stringify(oneSignalPayload)
    });

    const oneSignalResult = await oneSignalResponse.json();

    return new Response(
      JSON.stringify({ 
        success: true, 
        eligible_users: eligibleUsers.length,
        notifications_sent: playerIds.length,
        onesignal_result: oneSignalResult
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending push notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in kilometers
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI/180);
}

serve(handler);