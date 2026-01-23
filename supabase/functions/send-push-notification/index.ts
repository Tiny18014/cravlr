import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const pushNotificationSchema = z.object({
  requestId: z.string().uuid('Invalid request ID'),
  foodType: z.string().trim().min(1).max(100, 'Food type must be 1-100 characters'),
  locationCity: z.string().trim().min(1).max(100, 'City name must be 1-100 characters'),
  locationState: z.string().trim().length(2, 'State must be 2-letter code').toUpperCase(),
  urgency: z.enum(['low', 'medium', 'high'], {
    errorMap: () => ({ message: 'Urgency must be low, medium, or high' })
  })
});

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

    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input
    const body = await req.json();
    const validationResult = pushNotificationSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.error('❌ Validation failed:', validationResult.error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validationResult.error.issues.map(i => i.message) 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { requestId, foodType, locationCity, locationState, urgency } = validationResult.data;

    // Get the food request details
    const { data: request, error: requestError } = await supabase
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

    // Verify the authenticated user owns this request
    if (request.requester_id !== user.id) {
      console.error('❌ User does not own this request');
      return new Response(
        JSON.stringify({ error: 'Forbidden: You can only send push notifications for your own requests' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get eligible users for push notifications
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, notify_recommender, location_city, location_state')
      .eq('notify_recommender', true)
      .neq('id', request.requester_id);

    if (profilesError) {
      throw new Error('Failed to fetch profiles');
    }

    const eligibleUsers = profiles?.filter(profile => {
      // Same city and state
      return profile.location_city === request.location_city && 
             profile.location_state === request.location_state;
    }) || [];

    console.log(`Found ${eligibleUsers.length} eligible users for push notification`);

    // Get OneSignal player IDs for eligible users
    const userIds = eligibleUsers.map(u => u.id);
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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
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