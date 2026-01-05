import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// OneSignal configuration
const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Check if email was already sent to prevent duplicates
async function wasEmailAlreadySent(
  supabase: any,
  userId: string,
  eventType: string,
  entityId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("email_notification_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("event_type", eventType)
    .eq("entity_id", entityId)
    .maybeSingle();

  return !!data;
}

// Log email notification
async function logEmailNotification(
  supabase: any,
  userId: string,
  eventType: string,
  entityId: string,
  emailTo: string,
  subject: string,
  providerMessageId: string | null,
  status: "sent" | "failed",
  errorMessage?: string
): Promise<void> {
  await supabase.from("email_notification_logs").insert({
    user_id: userId,
    event_type: eventType,
    entity_id: entityId,
    email_to: emailTo,
    subject: subject,
    provider_message_id: providerMessageId,
    status: status,
    error_message: errorMessage || null,
  });
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
        android_channel_id: 'cravlr_recommendations',
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

const handler = async (req: Request): Promise<Response> => {
  console.log("send-recommendation-email: Function invoked");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("send-recommendation-email: Missing authorization header");
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("send-recommendation-email: Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { recommendationId } = await req.json();
    console.log("send-recommendation-email: Processing recommendation:", recommendationId);

    if (!recommendationId) {
      return new Response(JSON.stringify({ error: "Missing recommendationId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the recommendation with request details
    const { data: recommendation, error: recError } = await supabase
      .from("recommendations")
      .select(`
        *,
        food_requests!inner (
          id,
          food_type,
          location_city,
          location_state,
          requester_id
        )
      `)
      .eq("id", recommendationId)
      .single();

    if (recError || !recommendation) {
      console.error("send-recommendation-email: Recommendation not found:", recError);
      return new Response(JSON.stringify({ error: "Recommendation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user is the recommender
    if (recommendation.recommender_id !== user.id) {
      console.error("send-recommendation-email: User is not the recommender");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requesterId = recommendation.food_requests.requester_id;

    // Check requester's email preferences
    const { data: requesterProfile } = await supabase
      .from("profiles")
      .select("display_name, email_notifications_enabled, email_recommendations")
      .eq("id", requesterId)
      .single();

    // -- Push Notification Logic --
    // Note: Push notifications for new recommendations are now primarily handled by the
    // 'notify-new-recommendation' database webhook.
    // However, we keep this logic here as a fallback or for clients invoking this function directly,
    // but users should prefer the webhook to avoid potential duplicate notifications if both are active.

    // Target via External ID (Requester ID)
    let pushSent = false;
    if (requesterId) {
      const pushTitle = '🎉 New Recommendation!';
      const pushMessage = `Someone recommended ${recommendation.restaurant_name} for your ${recommendation.food_requests.food_type} request!`;
      const pushData = {
        type: 'RECOMMENDATION_RECEIVED',
        requestId: recommendation.food_requests.id,
        recommendationId: recommendation.id,
        url: `/requests/${recommendation.food_requests.id}/results`
      };
      // Send directly to requester UUID
      const pushResult = await sendPushNotification([requesterId], pushTitle, pushMessage, pushData);
      pushSent = pushResult.success;
    }
    // ----------------------------

    if (!requesterProfile?.email_notifications_enabled || !requesterProfile?.email_recommendations) {
      console.log("send-recommendation-email: Requester has email notifications disabled");
      return new Response(
        JSON.stringify({
          success: true,
          message: "User has email notifications disabled",
          sent: false,
          pushSent: pushSent
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get recommender display name
    const { data: recommenderProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    // Check if Resend is configured
    if (!Deno.env.get("RESEND_API_KEY")) {
      console.log("send-recommendation-email: RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: true, message: "Email service not configured", sent: false, pushSent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get requester email
    const { data: authUser } = await supabase.auth.admin.getUserById(requesterId);
    const email = authUser?.user?.email;

    if (!email) {
      console.log("send-recommendation-email: Requester has no email");
      return new Response(
        JSON.stringify({ success: true, message: "User has no email", sent: false, pushSent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate
    const alreadySent = await wasEmailAlreadySent(supabase, requesterId, "new_recommendation", recommendationId);
    if (alreadySent) {
      console.log(`send-recommendation-email: Email already sent for recommendation ${recommendationId}`);
      return new Response(
        JSON.stringify({ success: true, message: "Email already sent", sent: false, pushSent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subject = `🎉 New Recommendation: ${recommendation.restaurant_name}`;
    const appUrl = Deno.env.get("SITE_URL") || "https://cravlr.com";
    const requestId = recommendation.food_requests.id;
    const recommenderName = recommenderProfile?.display_name || "A local expert";

    // Use the Purple/Pink scheme from notify-area-users
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F7F5F8; padding: 20px;">
        <div style="background: linear-gradient(135deg, #A03272 0%, #7A2156 100%); padding: 30px; text-align: center; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎉 New Recommendation!</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <p style="color: #1C1C1C; font-size: 16px; line-height: 1.6;">
            Hi ${requesterProfile?.display_name || "there"}!
          </p>
          <p style="color: #1C1C1C; font-size: 16px; line-height: 1.6;">
            <strong>${recommenderName}</strong> just sent you a recommendation for your food request!
          </p>

          <div style="background-color: #F9EFF5; padding: 20px; border-radius: 16px; margin: 24px 0; border-left: 4px solid #A03272;">
            <p style="color: #A03272; font-size: 20px; font-weight: 600; margin: 0 0 8px 0;">
              🍽️ ${recommendation.restaurant_name}
            </p>
            ${recommendation.restaurant_address ? `<p style="color: #7A2156; font-size: 14px; margin: 0 0 8px 0;">📍 ${recommendation.restaurant_address}</p>` : ""}
            ${recommendation.notes ? `<p style="color: #7A2156; font-size: 14px; margin: 8px 0 0 0; font-style: italic;">"${recommendation.notes}"</p>` : ""}
          </div>

          <p style="color: #6B6B6B; font-size: 14px; margin-bottom: 8px;">
            <strong>Your request:</strong> ${recommendation.food_requests.food_type}
          </p>
          <p style="color: #6B6B6B; font-size: 14px;">
            📍 ${recommendation.food_requests.location_city}${recommendation.food_requests.location_state ? `, ${recommendation.food_requests.location_state}` : ""}
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://cravlr.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #A03272 0%, #7A2156 100%); color: white; padding: 14px 32px; border-radius: 24px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(160, 50, 114, 0.3);">
              View All Recommendation
            </a>
          </div>

          ${recommendation.maps_url ? `
            <div style="text-align: center; margin-bottom: 20px;">
              <a href="${recommendation.maps_url}" style="color: #A03272; font-size: 14px; text-decoration: underline;">
                📍 Open in Google Maps
              </a>
            </div>
          ` : ""}
        </div>

        <div style="padding: 20px; text-align: center; background-color: #F7F5F8;">
          <p style="color: #9ca3af; font-size: 12px; margin-top: 0;">
            You received this email because you have email notifications enabled.<br>
            <a href="https://cravlr.com/settings" style="color: #A03272;">Manage your notification preferences</a>
          </p>
        </div>
      </body>
      </html>
    `;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Cravlr <notifications@cravlr.com>",
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    if (emailError) {
      console.error("send-recommendation-email: Failed to send email:", emailError);
      await logEmailNotification(
        supabase,
        requesterId,
        "new_recommendation",
        recommendationId,
        email,
        subject,
        null,
        "failed",
        emailError.message
      );
      return new Response(
        JSON.stringify({ success: false, error: emailError.message, pushSent }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("send-recommendation-email: Email sent successfully");
    await logEmailNotification(
      supabase,
      requesterId,
      "new_recommendation",
      recommendationId,
      email,
      subject,
      emailData?.id || null,
      "sent"
    );

    return new Response(
      JSON.stringify({ success: true, sent: true, pushSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-recommendation-email: Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
