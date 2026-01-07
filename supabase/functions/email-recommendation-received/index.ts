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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const recommendationSchema = z.object({
    recommendationId: z.string().uuid()
});

const handler = async (req: Request): Promise<Response> => {
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
            return new Response(JSON.stringify({ error: 'Missing recommendationId' }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        console.log(`📧 Processing recommendation email for ID: ${recommendationId}`);

        // 1. Fetch Recommendation & Request Details
        const { data: recommendation, error: recError } = await supabase
            .from('recommendations')
            .select(`
        *,
        food_requests (
          id,
          food_type,
          requester_id,
          location_city
        ),
        profiles:recommender_id (
          display_name
        )
      `)
            .eq('id', recommendationId)
            .single();

        if (recError || !recommendation) {
            console.error('Recommendation fetch error:', recError);
            return new Response(JSON.stringify({ error: 'Recommendation not found' }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const { food_requests: request, profiles: recommender } = recommendation;
        const requesterId = request.requester_id;

        // 2. Fetch Requester Profile & Email Prefs
        const { data: requesterProfile, error: profileError } = await supabase
            .from('profiles')
            .select('display_name, email_notifications_enabled, email_recommendations')
            .eq('id', requesterId)
            .single();

        if (profileError || !requesterProfile) {
            console.error('Requester profile not found');
            return new Response(JSON.stringify({ error: 'Requester not found' }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 3. Check Preferences
        if (!requesterProfile.email_notifications_enabled) {
            console.log('Skipping: User has globally disabled email notifications');
            return new Response(JSON.stringify({ skipped: true, reason: 'global_disabled' }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (requesterProfile.email_recommendations === false) {
            console.log('Skipping: User has disabled recommendation emails');
            return new Response(JSON.stringify({ skipped: true, reason: 'type_disabled' }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 4. Get Requester Email (from Auth)
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(requesterId);
        if (authError || !authUser?.user?.email) {
            console.error('Auth user/email not found');
            return new Response(JSON.stringify({ error: 'Email address not found' }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const emailTo = authUser.user.email;
        const recommenderName = recommender?.display_name || 'A local foodie';

        // 5. Send Email
        const { data: emailData, error: emailError } = await resend.emails.send({
            from: 'Cravlr <notifications@cravlr.com>',
            to: [emailTo],
            subject: `🎉 New Recommendation for ${request.food_type}!`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You got a recommendation! 🍽️</h2>
          <p>Hi ${requesterProfile.display_name || 'there'},</p>
          <p><strong>${recommenderName}</strong> just recommended a place for your <strong>${request.food_type}</strong> request.</p>

          <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #A03272; margin: 20px 0;">
            <h3 style="margin-top: 0;">${recommendation.restaurant_name}</h3>
            ${recommendation.restaurant_address ? `<p>📍 ${recommendation.restaurant_address}</p>` : ''}
            ${recommendation.notes ? `<p><em>"${recommendation.notes}"</em></p>` : ''}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://cravlr.com/dashboard" style="background: #A03272; color: white; padding: 12px 24px; text-decoration: none; border-radius: 24px; font-weight: bold;">
              View Recommendation
            </a>
          </div>

          <p style="font-size: 12px; color: #666; text-align: center;">
            <a href="https://cravlr.com/profile">Manage Notifications</a>
          </p>
        </div>
      `
        });

        if (emailError) {
            console.error('Resend error:', emailError);
            throw emailError;
        }

        console.log(`✅ Email sent to ${emailTo}`);

        return new Response(JSON.stringify({ success: true, id: emailData?.id }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error: any) {
        console.error("Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
};

serve(handler);
