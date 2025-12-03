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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔍 Checking for users with paused recommender mode for 7+ days...");

    // Calculate 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find users who have been paused for exactly 7 days (within a 1-day window to avoid spam)
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    const { data: pausedUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, display_name, recommender_paused_at')
      .eq('recommender_paused', true)
      .lte('recommender_paused_at', sevenDaysAgo.toISOString())
      .gte('recommender_paused_at', eightDaysAgo.toISOString());

    if (usersError) {
      console.error("Error fetching paused users:", usersError);
      throw new Error("Failed to fetch paused users");
    }

    if (!pausedUsers || pausedUsers.length === 0) {
      console.log("No users found with 7-day paused recommender mode");
      return new Response(
        JSON.stringify({ message: "No users to notify", notificationsSent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${pausedUsers.length} users paused for ~7 days`);

    // Send re-engagement emails
    const emailPromises = pausedUsers.map(async (user) => {
      // Get user's email from auth.users
      const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(user.id);

      if (authUserError || !authUser?.user?.email) {
        console.log(`No email found for user ${user.id}`);
        return null;
      }

      const emailTo = authUser.user.email;
      const displayName = user.display_name || 'there';

      try {
        const emailResponse = await resend.emails.send({
          from: "Cravlr <noreply@resend.dev>",
          to: [emailTo],
          subject: "🌟 You were doing a great job! Want to start recommending again?",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #A03272;">We miss your recommendations! 🍽️</h1>
              
              <p>Hi ${displayName}!</p>
              
              <p>It's been a week since you paused your recommender mode, and we wanted to check in.</p>
              
              <p>Your food recommendations have been helping people discover amazing places to eat. 
              The community would love to hear more from you!</p>
              
              <div style="background-color: #F9EFF5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #A03272; margin-top: 0;">🎯 Ready to get back?</h2>
                <p>Just head to your profile settings and toggle your recommender mode back on. 
                There might be some hungry foodies waiting for your expert advice!</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get('SITE_URL') || 'https://cravlr.com'}/profile" 
                   style="background-color: #A03272; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; display: inline-block;">
                  Resume Recommending
                </a>
              </div>
              
              <p style="margin-top: 30px; font-size: 12px; color: #666;">
                You received this because your recommender mode has been paused for 7 days. 
                If you prefer to stay paused, no worries - we won't send this reminder again.
              </p>
              
              <p style="margin-top: 20px;">
                Happy eating! 🎉<br>
                <strong>The Cravlr Team</strong>
              </p>
            </div>
          `,
        });

        console.log(`Re-engagement email sent to ${emailTo}:`, emailResponse.data?.id);
        return emailResponse.data?.id;
      } catch (emailError) {
        console.error(`Error sending email to ${emailTo}:`, emailError);
        return null;
      }
    });

    const emailResults = await Promise.all(emailPromises);
    const successfulEmails = emailResults.filter((id) => id !== null).length;

    console.log(`Successfully sent ${successfulEmails} re-engagement notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: successfulEmails,
        totalEligibleUsers: pausedUsers.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in check-paused-recommenders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
