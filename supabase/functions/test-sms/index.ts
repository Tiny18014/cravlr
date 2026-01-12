import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber } = await req.json();

    if (!phoneNumber) {
      return new Response(JSON.stringify({ error: "Phone number required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
    const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_API_KEY");

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
      return new Response(JSON.stringify({ error: "OneSignal not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`📱 Testing SMS to ${phoneNumber}`);

    // Step 1: First create/update the SMS subscription in OneSignal
    console.log("Step 1: Creating SMS subscription...");
    const subscriptionResponse = await fetch(`https://onesignal.com/api/v1/apps/${ONESIGNAL_APP_ID}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify({
        identity: {
          external_id: `test_user_${Date.now()}`
        },
        subscriptions: [{
          type: "SMS",
          token: phoneNumber,
          enabled: true
        }]
      }),
    });

    const subscriptionData = await subscriptionResponse.json();
    console.log("Subscription response:", JSON.stringify(subscriptionData));

    if (!subscriptionResponse.ok) {
      return new Response(JSON.stringify({ 
        error: "Failed to create subscription", 
        details: subscriptionData 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Now send the SMS using the subscription
    console.log("Step 2: Sending SMS...");
    const smsResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_phone_numbers: [phoneNumber],
        contents: { en: "🍽️ Cravlr Test: Your SMS notifications are working! You'll receive alerts about food requests near you." },
        name: "Test SMS",
      }),
    });

    const responseData = await smsResponse.json();
    console.log("SMS response:", JSON.stringify(responseData));

    if (!smsResponse.ok) {
      return new Response(JSON.stringify({ 
        error: "SMS send failed", 
        details: responseData 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Test SMS sent!",
      response: responseData 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
