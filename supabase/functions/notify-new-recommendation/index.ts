import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// OneSignal configuration
const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
        // Use include_aliases to target by External ID (User ID)
        include_aliases: {
          external_id: userIds
        },
        target_channel: "push",
        headings: { en: title },
        contents: { en: message },
        data: data,
        ios_badgeType: 'Increase',
        ios_badgeCount: 1,
        priority: 10,
        web_push_topic: 'new_recommendation',
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("notify-new-recommendation received payload:", JSON.stringify(payload));

    // Initialize Supabase Client (Service Role needed for DB access without user session)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // --- Manual Test / Direct Invocation Handling ---
    // User requested: { "user_id": "...", "message": "..." }
    if (payload.user_id && payload.message) {
      console.log("Processing manual/test invocation");
      const { user_id, message } = payload;

      const pushResult = await sendPushNotification(
        [user_id],
        'Test Notification',
        message,
        { type: 'TEST_NOTIFICATION' }
      );

      return new Response(
        JSON.stringify({ success: true, push_result: pushResult, mode: 'manual' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Webhook Handling ---
    const { type, record, table } = payload;

    // Verify it's an INSERT on recommendations
    if (type !== 'INSERT' || table !== 'recommendations') {
      return new Response(
        JSON.stringify({ message: 'Ignored: Not an INSERT on recommendations' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!record || !record.request_id) {
      return new Response(
        JSON.stringify({ error: 'Invalid record format' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Fetch Request Details (to get requester_id and food_type)
    const { data: request, error: requestError } = await supabase
      .from('food_requests')
      .select('requester_id, food_type')
      .eq('id', record.request_id)
      .single();

    if (requestError || !request) {
      console.error("Error fetching request:", requestError);
      return new Response(
        JSON.stringify({ error: 'Request not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { requester_id, food_type } = request;

    // Don't notify if the recommender is the requester (self-recommendation?)
    const recommenderId = record.recommender_id || record.user_id;
    if (recommenderId && recommenderId === requester_id) {
      console.log("Skipping notification: Recommender is the Requester.");
      return new Response(
        JSON.stringify({ message: 'Skipped: Self-recommendation' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Send Push Notification
    console.log(`Sending push to requester ${requester_id} for recommendation on ${food_type}`);

    const pushTitle = '🎉 New Recommendation!';
    const pushMessage = 'Someone just recommended a spot! Tap to see it.';

    const pushData = {
      type: 'RECOMMENDATION_RECEIVED',
      requestId: record.request_id,
      recommendationId: record.id,
      url: `/request-results/${record.request_id}`
    };

    const pushResult = await sendPushNotification([requester_id], pushTitle, pushMessage, pushData);

    return new Response(
      JSON.stringify({
        success: true,
        push_result: pushResult,
        mode: 'webhook'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in notify-new-recommendation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});