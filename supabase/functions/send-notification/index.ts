import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { Resend } from "npm:resend@2.0.0";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const notificationSchema = z.object({
  requestId: z.string().uuid({ message: 'Invalid request ID' }),
  recommendationId: z.string().uuid({ message: 'Invalid recommendation ID' })
});

// Check if email was already sent (idempotency)
async function wasEmailAlreadySent(
  userId: string, 
  eventType: string, 
  entityId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('email_notification_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('event_type', eventType)
    .eq('entity_id', entityId)
    .single();
  
  return !!data;
}

// Log email notification
async function logEmailNotification(
  userId: string,
  eventType: string,
  entityId: string,
  emailTo: string,
  subject: string,
  providerMessageId: string | null,
  status: 'sent' | 'failed',
  errorMessage?: string
): Promise<void> {
  try {
    await supabase.from('email_notification_logs').insert({
      user_id: userId,
      event_type: eventType,
      entity_id: entityId,
      email_to: emailTo,
      subject: subject,
      provider_message_id: providerMessageId,
      status: status,
      error_message: errorMessage
    });
  } catch (error) {
    console.error('Error logging email notification:', error);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const validationResult = notificationSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validationResult.error.issues.map(i => i.message) 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { requestId, recommendationId } = validationResult.data;
    
    console.log(`📧 Processing notification for request ${requestId}, recommendation ${recommendationId}`);

    // Get request details and requester info
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

    // Get requester profile with email preferences
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('display_name, email_notifications_enabled, email_recommendations')
      .eq('id', request.requester_id)
      .single();

    // Get recommendation details
    const { data: recommendation, error: recError } = await supabase
      .from('recommendations')
      .select('*')
      .eq('id', recommendationId)
      .single();

    if (recError || !recommendation) {
      console.error('Error fetching recommendation:', recError);
      return new Response(
        JSON.stringify({ error: 'Recommendation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recommender profile
    const { data: recommenderProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', recommendation.recommender_id)
      .single();

    // Verify the authenticated user is involved in this request or recommendation
    if (request.requester_id !== user.id && recommendation.recommender_id !== user.id) {
      console.error('❌ User not involved in this request/recommendation');
      return new Response(
        JSON.stringify({ error: 'Forbidden: You must be the requester or recommender' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check email preferences
    const emailEnabled = requesterProfile?.email_notifications_enabled !== false;
    const recommendationsEnabled = requesterProfile?.email_recommendations !== false;

    if (!emailEnabled || !recommendationsEnabled) {
      console.log('📧 Email notifications disabled for requester');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Email notifications disabled by user preference',
        skipped: true 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check for duplicate email (idempotency)
    const alreadySent = await wasEmailAlreadySent(request.requester_id, 'new_recommendation', recommendationId);
    if (alreadySent) {
      console.log('📧 Email already sent for this recommendation');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Email already sent',
        skipped: true 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get requester email
    const { data: authUser } = await supabase.auth.admin.getUserById(request.requester_id);
    const emailTo = authUser?.user?.email;

    if (!emailTo) {
      console.log('No email address found for requester');
      return new Response(JSON.stringify({ message: 'No email address found' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const subject = `🍽️ New recommendation for your ${request.food_type} request!`;
    const locationDisplay = request.location_state 
      ? `${request.location_city}, ${request.location_state}`
      : request.location_city;

    try {
      // Send notification email
      const emailResponse = await resend.emails.send({
        from: "Cravlr <noreply@resend.dev>",
        to: [emailTo],
        subject: subject,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F7F5F8;">
            <div style="background: linear-gradient(135deg, #A03272 0%, #7A2156 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🍽️ New Recommendation!</h1>
            </div>
            
            <div style="padding: 30px; background-color: white;">
              <p style="font-size: 16px; color: #1C1C1C;">Hi ${requesterProfile?.display_name || 'there'}!</p>
              
              <p style="font-size: 16px; color: #1C1C1C;">Great news! Someone has recommended a restaurant for your <strong>${request.food_type}</strong> request in ${locationDisplay}.</p>
              
              <div style="background-color: #F9EFF5; padding: 20px; border-radius: 16px; margin: 24px 0; border-left: 4px solid #A03272;">
                <h2 style="color: #A03272; margin-top: 0; font-size: 20px;">📍 ${recommendation.restaurant_name}</h2>
                ${recommendation.restaurant_address ? `<p style="margin: 8px 0; color: #1C1C1C;"><strong>Address:</strong> ${recommendation.restaurant_address}</p>` : ''}
                ${recommendation.notes ? `<p style="margin: 8px 0; color: #1C1C1C;"><strong>Note:</strong> ${recommendation.notes}</p>` : ''}
                <p style="margin: 8px 0; color: #1C1C1C;"><strong>Recommended by:</strong> ${recommenderProfile?.display_name || 'A fellow foodie'}</p>
              </div>
              
              <p style="font-size: 16px; color: #1C1C1C;">Head over to your dashboard to see all your recommendations!</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get('SITE_URL') || 'https://cravlr.app'}/dashboard" 
                   style="background: linear-gradient(135deg, #A03272 0%, #7A2156 100%); color: white; padding: 14px 28px; 
                          text-decoration: none; border-radius: 24px; display: inline-block; font-weight: 600;
                          box-shadow: 0 4px 12px rgba(160, 50, 114, 0.3);">
                  View Recommendation
                </a>
              </div>
            </div>
            
            <div style="padding: 20px; text-align: center; background-color: #F7F5F8;">
              <p style="font-size: 12px; color: #6B6B6B; margin: 0;">
                <a href="${Deno.env.get('SITE_URL') || 'https://cravlr.app'}/profile" style="color: #A03272;">Update your notification preferences</a>
              </p>
              <p style="margin-top: 16px; font-size: 14px; color: #1C1C1C;">
                Happy eating! 🎉<br>
                <strong>The Cravlr Team</strong>
              </p>
            </div>
          </div>
        `,
        text: `Hi ${requesterProfile?.display_name || 'there'}! Great news! ${recommenderProfile?.display_name || 'Someone'} has recommended ${recommendation.restaurant_name} for your ${request.food_type} request. Visit Cravlr to see your recommendation!`,
      });

      // Log successful email
      await logEmailNotification(
        request.requester_id,
        'new_recommendation',
        recommendationId,
        emailTo,
        subject,
        emailResponse.data?.id || null,
        'sent'
      );

      console.log("✅ Email sent successfully:", emailResponse.data?.id);

      return new Response(JSON.stringify({ 
        success: true, 
        emailId: emailResponse.data?.id 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } catch (emailError: any) {
      // Log failed email
      await logEmailNotification(
        request.requester_id,
        'new_recommendation',
        recommendationId,
        emailTo,
        subject,
        null,
        'failed',
        emailError.message
      );

      console.error("❌ Error sending email:", emailError);
      return new Response(
        JSON.stringify({ error: emailError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
