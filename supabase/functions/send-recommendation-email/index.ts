import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { Twilio } from "npm:twilio@4.23.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Twilio configuration
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

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

// Send SMS via Twilio
async function sendSMS(
  to: string,
  body: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.log('SMS skipped - missing Twilio config');
    return { success: false, error: 'Missing configuration' };
  }

  try {
    const client = new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const message = await client.messages.create({
      body: body,
      from: TWILIO_PHONE_NUMBER,
      to: to,
    });
    console.log(`✅ SMS sent to ${to}: ${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return { success: false, error: error.message };
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

    // Check requester's notification preferences
    const { data: requesterProfile } = await supabase
      .from("profiles")
      .select("display_name, email_notifications_enabled, email_recommendations, phone_number")
      .eq("id", requesterId)
      .single();

    const appUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") || "https://ioqogdxfmapcijmqjcpb.lovable.app";
    const requestId = recommendation.food_requests.id;

    // Send SMS if phone number is available
    let smsSent = false;
    if (requesterProfile?.phone_number) {
      const smsBody = `Great news! You have a new recommendation for ${recommendation.food_requests.food_type} at ${recommendation.restaurant_name}. View it here: ${appUrl}/requests/${requestId}/results`;
      const smsResult = await sendSMS(requesterProfile.phone_number, smsBody);
      smsSent = smsResult.success;
    }

    // Handle Email Notifications
    if (!requesterProfile?.email_notifications_enabled || !requesterProfile?.email_recommendations) {
      console.log("send-recommendation-email: Requester has email notifications disabled");
      // Return success if SMS was sent, or "skipped" message
      return new Response(
        JSON.stringify({
          success: true,
          message: smsSent ? "SMS sent, email disabled" : "User has notifications disabled",
          smsSent
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
        JSON.stringify({ success: true, message: "Email service not configured", smsSent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get requester email
    const { data: authUser } = await supabase.auth.admin.getUserById(requesterId);
    const email = authUser?.user?.email;

    if (!email) {
      console.log("send-recommendation-email: Requester has no email");
      return new Response(
        JSON.stringify({ success: true, message: "User has no email", smsSent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate
    const alreadySent = await wasEmailAlreadySent(supabase, requesterId, "new_recommendation", recommendationId);
    if (alreadySent) {
      console.log(`send-recommendation-email: Email already sent for recommendation ${recommendationId}`);
      return new Response(
        JSON.stringify({ success: true, message: "Email already sent", smsSent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subject = `🎉 New Recommendation: ${recommendation.restaurant_name}`;
    const recommenderName = recommenderProfile?.display_name || "A local expert";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎉 New Recommendation!</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Hi ${requesterProfile?.display_name || "there"}!
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            <strong>${recommenderName}</strong> just sent you a recommendation for your food request!
          </p>
          <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="color: #166534; font-size: 20px; font-weight: 600; margin: 0 0 8px 0;">
              🍽️ ${recommendation.restaurant_name}
            </p>
            ${recommendation.restaurant_address ? `<p style="color: #15803d; font-size: 14px; margin: 0 0 8px 0;">📍 ${recommendation.restaurant_address}</p>` : ""}
            ${recommendation.notes ? `<p style="color: #166534; font-size: 14px; margin: 8px 0 0 0; font-style: italic;">"${recommendation.notes}"</p>` : ""}
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">
            <strong>Your request:</strong> ${recommendation.food_requests.food_type}
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            📍 ${recommendation.food_requests.location_city}${recommendation.food_requests.location_state ? `, ${recommendation.food_requests.location_state}` : ""}
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/requests/${requestId}/results" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              View All Recommendations
            </a>
          </div>
          ${recommendation.maps_url ? `
            <div style="text-align: center; margin-bottom: 20px;">
              <a href="${recommendation.maps_url}" style="color: #22c55e; font-size: 14px; text-decoration: underline;">
                📍 Open in Google Maps
              </a>
            </div>
          ` : ""}
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
          You received this email because you have email notifications enabled.<br>
          <a href="${appUrl}/settings" style="color: #22c55e;">Manage your notification preferences</a>
        </p>
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
        JSON.stringify({ success: false, error: emailError.message, smsSent }),
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
      JSON.stringify({ success: true, emailSent: true, smsSent }),
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
