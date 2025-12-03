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

const requestSchema = z.object({
  requestId: z.string().uuid({ message: 'Invalid request ID format' })
});

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = requestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validationResult.error.issues.map(i => i.message) 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { requestId } = validationResult.data;
    
    console.log(`📍 Processing area notification for request ${requestId}`);

    // Get request details
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

    // Verify the authenticated user owns this request
    if (request.requester_id !== user.id) {
      console.error('❌ User does not own this request');
      return new Response(
        JSON.stringify({ error: 'Forbidden: You can only send notifications for your own requests' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get requester profile
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', request.requester_id)
      .single();

    // Find users in the same geographic area who are eligible for notifications
    // Exclude users who have paused recommender mode or disabled notifications
    const { data: nearbyUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, display_name, notify_recommender, recommender_paused')
      .eq('location_city', request.location_city)
      .eq('location_state', request.location_state)
      .neq('id', request.requester_id) // Don't notify the requester
      .eq('notify_recommender', true) // Only get users who want recommender notifications
      .or('recommender_paused.is.null,recommender_paused.eq.false'); // Exclude paused recommenders

    if (usersError) {
      console.error('Error fetching nearby users:', usersError);
      throw new Error('Failed to find nearby users');
    }

    if (!nearbyUsers || nearbyUsers.length === 0) {
      console.log('No nearby users found in the area');
      return new Response(JSON.stringify({ 
        message: 'No nearby users found',
        notificationsSent: 0 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Found ${nearbyUsers.length} eligible users to notify`);

    // Send notification emails to all eligible users
    const emailPromises = nearbyUsers.map(async (user) => {
      // Get user's email from auth.users using service role key
      const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(user.id);
      
      if (authUserError || !authUser?.user?.email) {
        console.log(`No email found for user ${user.id}`);
        return null;
      }
      
      const emailTo = authUser.user.email;

      try {
        const emailResponse = await resend.emails.send({
          from: "Cravlr <noreply@resend.dev>",
          to: [emailTo],
          subject: `🍽️ New ${request.food_type} request in ${request.location_city}!`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #2563eb;">🍽️ New Food Request in Your Area!</h1>
              
              <p>Hi ${user.display_name || 'there'}!</p>
              
              <p>Someone near you is looking for a great <strong>${request.food_type}</strong> spot in ${request.location_city}, ${request.location_state}!</p>
              
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #1e40af; margin-top: 0;">📍 Request Details</h2>
                <p><strong>Food Type:</strong> ${request.food_type}</p>
                <p><strong>Location:</strong> ${request.location_city}, ${request.location_state}</p>
                ${request.location_address ? `<p><strong>Near:</strong> ${request.location_address}</p>` : ''}
                ${request.additional_notes ? `<p><strong>Notes:</strong> ${request.additional_notes}</p>` : ''}
                <p><strong>Requested by:</strong> ${requesterProfile?.display_name || 'A fellow foodie'}</p>
              </div>
              
              <p>Know a great spot? Head over to Cravlr to share your recommendation and earn points!</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get('SITE_URL') || 'https://nibblr.app'}/browse-requests" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; display: inline-block;">
                  View Request & Recommend
                </a>
              </div>
              
              <p style="margin-top: 30px; font-size: 12px; color: #666;">
                You received this because you're registered in the ${request.location_city}, ${request.location_state} area. 
                Update your notification preferences in your profile settings.
              </p>
              
              <p style="margin-top: 20px;">
                Happy recommending! 🎉<br>
                <strong>The Cravlr Team</strong>
              </p>
            </div>
          `,
        });

        console.log(`Email sent to ${emailTo}:`, emailResponse.data?.id);
        return emailResponse.data?.id;
      } catch (emailError) {
        console.error(`Error sending email to ${emailTo}:`, emailError);
        return null;
      }
    });

    const emailResults = await Promise.all(emailPromises);
    const successfulEmails = emailResults.filter(id => id !== null).length;

    console.log(`Successfully sent ${successfulEmails} area notifications`);

    return new Response(JSON.stringify({ 
      success: true,
      notificationsSent: successfulEmails,
      totalEligibleUsers: nearbyUsers.length
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in notify-area-users function:", error);
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