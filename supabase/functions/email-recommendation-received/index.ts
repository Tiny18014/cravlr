import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type EmailLogStatus = "sent" | "skipped" | "error";

async function logEmailAttempt(params: {
  status: EmailLogStatus;
  event_type: string;
  entity_id: string;
  user_id: string;
  email_to: string;
  subject?: string | null;
  provider_message_id?: string | null;
  error_message?: string | null;
}) {
  try {
    const { error } = await supabase.from("email_notification_logs").insert({
      status: params.status,
      event_type: params.event_type,
      entity_id: params.entity_id,
      user_id: params.user_id,
      email_to: params.email_to,
      subject: params.subject ?? null,
      provider_message_id: params.provider_message_id ?? null,
      error_message: params.error_message ?? null,
      sent_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Email log insert error:", error);
    }
  } catch (err) {
    console.error("Email log insert exception:", err);
  }
}

// Send SMS via OneSignal
// NOTE: returns true if OneSignal accepted the request (not guaranteed delivered).
async function sendSmsViaOneSignal(params: {
  userId: string;
  phoneNumber: string;
  message: string;
}): Promise<boolean> {
  const appId = Deno.env.get("ONESIGNAL_APP_ID");
  const apiKey = Deno.env.get("ONESIGNAL_API_KEY");

  if (!appId || !apiKey) {
    console.log("📱 SMS: OneSignal not configured, skipping SMS");
    return false;
  }

  try {
    // 1) Ensure SMS subscription exists for this user (idempotent upsert)
    const upsertResponse = await fetch(
      `https://onesignal.com/api/v1/apps/${appId}/users`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${apiKey}`,
        },
        body: JSON.stringify({
          identity: { external_id: params.userId },
          subscriptions: [
            {
              type: "SMS",
              token: params.phoneNumber,
              enabled: true,
            },
          ],
        }),
      }
    );

    const upsertData = await upsertResponse.json().catch(() => ({}));
    console.log(
      `📱 SMS subscription upsert status=${upsertResponse.status} user=${params.userId} phone=${params.phoneNumber}`,
      upsertData
    );

    if (!upsertResponse.ok) {
      console.error("📱 SMS subscription upsert failed:", upsertData);
      return false;
    }

    // 2) Send SMS directly to the phone number
    const smsResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        include_phone_numbers: [params.phoneNumber],
        sms_from: "+18124145308",
        name: "Recommendation SMS",
        contents: { en: params.message },
      }),
    });

    const result = await smsResponse.json().catch(() => ({}));
    console.log(
      `📱 SMS send status=${smsResponse.status} user=${params.userId} phone=${params.phoneNumber}`,
      result
    );

    if (!smsResponse.ok || (result as any)?.errors) {
      console.error("📱 SMS send error:", (result as any)?.errors ?? result);
      return false;
    }

    const recipients =
      typeof (result as any)?.recipients === "number" ? (result as any).recipients : undefined;

    // Some OneSignal responses may omit recipients for SMS; treat ok response as accepted.
    if (recipients !== undefined && recipients <= 0) return false;

    console.log("📱 SMS accepted by OneSignal:", (result as any)?.id);
    return true;
  } catch (error) {
    console.error("📱 SMS send exception:", error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    // Normalize payload (Direct vs Webhook)
    let recommendationId = payload.recommendationId;
    if (!recommendationId && payload.record && payload.record.id) {
      recommendationId = payload.record.id;
    }

    if (!recommendationId) {
      return new Response(JSON.stringify({ error: "Missing recommendationId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`📧 Processing recommendation notification for ID: ${recommendationId}`);

    // 1. Fetch Recommendation & Request Details
    const { data: recommendation, error: recError } = await supabase
      .from("recommendations")
      .select(
        `
          id,
          request_id,
          restaurant_name,
          restaurant_address,
          notes,
          recommender_id,
          food_requests!inner(
            id,
            food_type,
            requester_id,
            location_city
          )
        `
      )
      .eq("id", recommendationId)
      .single();

    if (recError || !recommendation) {
      console.error("Recommendation fetch error:", recError);
      return new Response(JSON.stringify({ error: "Recommendation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const request = (recommendation as any).food_requests;
    const requesterId = request.requester_id as string;

    // Fetch requester profile preferences (including SMS preferences)
    const { data: requesterProfile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, email_notifications_enabled, email_recommendations, sms_notifications_enabled, sms_recommendations, phone_number")
      .eq("id", requesterId)
      .single();

    if (profileError || !requesterProfile) {
      console.error("Requester profile fetch error:", profileError);
      return new Response(JSON.stringify({ error: "Requester not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch requester email (from Auth)
    const { data: authUser, error: authError } = await supabase.auth.admin
      .getUserById(requesterId);

    if (authError || !authUser?.user?.email) {
      console.error("Auth user/email not found:", authError);
      return new Response(JSON.stringify({ error: "Email address not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailTo = authUser.user.email;

    // Fetch recommender display name
    let recommenderName = "A local foodie";
    if ((recommendation as any).recommender_id) {
      const { data: recommenderProfile, error: recommenderError } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", (recommendation as any).recommender_id)
        .single();

      if (!recommenderError && recommenderProfile?.display_name) {
        recommenderName = recommenderProfile.display_name;
      }
    }

    const subject = `🎉 New Recommendation for ${request.food_type}!`;
    let emailSent = false;
    let smsSent = false;

    // 2. Send Email if enabled
    if (requesterProfile.email_notifications_enabled !== false && 
        requesterProfile.email_recommendations !== false) {
      
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: "Cravlr <notifications@cravlr.com>",
        to: [emailTo],
        subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You got a recommendation! 🍽️</h2>
            <p>Hi ${requesterProfile.display_name || "there"},</p>
            <p><strong>${recommenderName}</strong> just recommended a place for your <strong>${request.food_type}</strong> request.</p>

            <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #A03272; margin: 20px 0;">
              <h3 style="margin-top: 0;">${recommendation.restaurant_name}</h3>
              ${recommendation.restaurant_address ? `<p>📍 ${recommendation.restaurant_address}</p>` : ""}
              ${recommendation.notes ? `<p><em>"${recommendation.notes}"</em></p>` : ""}
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://cravlr.lovable.app/requests/${request.id}" style="background: #A03272; color: white; padding: 12px 24px; text-decoration: none; border-radius: 24px; font-weight: bold;">
                View Recommendation
              </a>
            </div>

            <p style="font-size: 12px; color: #666; text-align: center;">
              <a href="https://cravlr.lovable.app/profile">Manage Notifications</a>
            </p>
          </div>
        `,
      });

      if (emailError) {
        console.error("Resend error:", emailError);
        await logEmailAttempt({
          status: "error",
          event_type: "recommendation_received",
          entity_id: recommendationId,
          user_id: requesterId,
          email_to: emailTo,
          subject,
          error_message: emailError.message,
        });
      } else {
        emailSent = true;
        await logEmailAttempt({
          status: "sent",
          event_type: "recommendation_received",
          entity_id: recommendationId,
          user_id: requesterId,
          email_to: emailTo,
          subject,
          provider_message_id: emailData?.id ?? null,
        });
        console.log(`✅ Email sent to ${emailTo}`);
      }
    } else {
      console.log("📧 Email skipped: User has disabled email notifications");
      await logEmailAttempt({
        status: "skipped",
        event_type: "recommendation_received",
        entity_id: recommendationId,
        user_id: requesterId,
        email_to: emailTo,
        subject: null,
        error_message: requesterProfile.email_notifications_enabled === false ? "global_disabled" : "type_disabled",
      });
    }

    // 3. Send SMS if enabled and phone number exists
    if (requesterProfile.sms_notifications_enabled !== false &&
        requesterProfile.sms_recommendations !== false &&
        requesterProfile.phone_number) {

      const smsMessage = `🍽️ Cravlr: ${recommenderName} recommended ${recommendation.restaurant_name} for your ${request.food_type} request! Check it out: https://cravlr.lovable.app/requests/${request.id}`;

      smsSent = await sendSmsViaOneSignal({
        userId: requesterId,
        phoneNumber: requesterProfile.phone_number,
        message: smsMessage,
      });
      console.log(`📱 SMS ${smsSent ? 'accepted' : 'failed'} for user ${requesterId}`);
    } else {
      console.log("📱 SMS skipped:", 
        !requesterProfile.phone_number ? "No phone number" : "SMS notifications disabled");
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        smsSent,
        emailTo,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
