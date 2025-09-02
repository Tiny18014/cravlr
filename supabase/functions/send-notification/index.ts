import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  requestId: string;
  recommendationId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requestId, recommendationId }: NotificationRequest = await req.json();
    
    console.log(`Processing notification for request ${requestId}, recommendation ${recommendationId}`);

    // Get request details and requester info
    const { data: request, error: requestError } = await supabase
      .from('food_requests')
      .select(`
        *,
        profiles!food_requests_requester_id_fkey (
          email,
          display_name,
          notification_email
        )
      `)
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      console.error('Error fetching request:', requestError);
      throw new Error('Request not found');
    }

    // Get recommendation details
    const { data: recommendation, error: recError } = await supabase
      .from('recommendations')
      .select(`
        *,
        profiles!recommendations_recommender_id_fkey (
          display_name,
          email
        )
      `)
      .eq('id', recommendationId)
      .single();

    if (recError || !recommendation) {
      console.error('Error fetching recommendation:', recError);
      throw new Error('Recommendation not found');
    }

    const requesterProfile = request.profiles;
    const recommenderProfile = recommendation.profiles;
    const emailTo = requesterProfile.notification_email || requesterProfile.email;

    if (!emailTo) {
      console.log('No email address found for requester');
      return new Response(JSON.stringify({ message: 'No email address found' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Send notification email
    const emailResponse = await resend.emails.send({
      from: "Nibblr <noreply@resend.dev>",
      to: [emailTo],
      subject: `New restaurant recommendation for your ${request.food_type} request!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">🍽️ New Restaurant Recommendation!</h1>
          
          <p>Hi ${requesterProfile.display_name || 'there'}!</p>
          
          <p>Great news! Someone has recommended a restaurant for your <strong>${request.food_type}</strong> request in ${request.location_city}, ${request.location_state}.</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1e40af; margin-top: 0;">📍 ${recommendation.restaurant_name}</h2>
            ${recommendation.restaurant_address ? `<p><strong>Address:</strong> ${recommendation.restaurant_address}</p>` : ''}
            ${recommendation.restaurant_phone ? `<p><strong>Phone:</strong> ${recommendation.restaurant_phone}</p>` : ''}
            ${recommendation.notes ? `<p><strong>Note:</strong> ${recommendation.notes}</p>` : ''}
            <p><strong>Recommended by:</strong> ${recommenderProfile.display_name || recommenderProfile.email}</p>
            <p><strong>Confidence Score:</strong> ${recommendation.confidence_score}/10</p>
          </div>
          
          <p>Head over to your dashboard to see all your recommendations and award points to helpful ones!</p>
          
          <p style="margin-top: 30px;">
            Happy eating! 🎉<br>
            <strong>The Nibblr Team</strong>
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);