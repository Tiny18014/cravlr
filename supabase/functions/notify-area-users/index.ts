import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { Resend } from "npm:resend@2.0.0";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// OneSignal configuration for push notifications
const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_API_KEY");

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
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
        include_aliases: {
          external_id: userIds
        },
        target_channel: "push",
        headings: { en: title },
        contents: { en: message },
        data: data,
        ios_badgeType: 'Increase',
        ios_badgeCount: 1,
        android_channel_id: 'cravlr_requests',
        priority: 10,
        web_push_topic: 'new_request',
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
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
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

    // Find users who are eligible for notifications
    const hasCoordinates = request.lat && request.lng;

    console.log(`📍 Finding users for request. Coordinates: ${hasCoordinates ? 'Yes' : 'No'}. City: ${request.location_city}`);

    // Fetch ALL potential recommenders (users who haven't explicitly disabled notifications or paused recommending)
    // We filter in memory to handle complex "fuzzy" matching logic that is hard to do in SQL
    // Logic:
    // 1. Not the requester
    // 2. notify_recommender is TRUE or NULL (default true)
    // 3. recommender_paused is FALSE or NULL (default false)
    const { data: potentialUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, display_name, notify_recommender, recommender_paused, profile_lat, profile_lng, notification_radius_km, location_city, location_state, email_notifications_enabled, email_new_requests')
      .neq('id', request.requester_id)
      .or('notify_recommender.eq.true,notify_recommender.is.null')
      .or('recommender_paused.is.null,recommender_paused.eq.false');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw new Error('Failed to find users');
    }

    console.log(`📍 Found ${potentialUsers?.length || 0} active recommenders globally. Filtering...`);

    const eligibleUsers = (potentialUsers || []).filter(u => {
      // 1. If Request has coords AND User has coords -> Check Radius
      if (hasCoordinates && u.profile_lat && u.profile_lng) {
        const distance = calculateDistance(
          request.lat,
          request.lng,
          u.profile_lat,
          u.profile_lng
        );
        const radius = u.notification_radius_km || 20;
        const inRange = distance <= radius;
        if (inRange) console.log(`✅ User ${u.display_name} matched by distance (${Math.round(distance)}km)`);
        return inRange;
      }

      // 2. Fallback: Fuzzy City Matching
      // Matches if: User has city AND Request has city AND they partially match
      // "New York" matches "New York, NY"
      // "New York, NY" matches "New York"
      const userCity = u.location_city?.toLowerCase() || '';
      const requestCity = request.location_city?.toLowerCase() || '';

      if (!userCity || !requestCity) return false;

      const match = userCity.includes(requestCity) || requestCity.includes(userCity);
      if (match) console.log(`✅ User ${u.display_name} matched by city (${userCity} ~= ${requestCity})`);
      return match;
    });

    console.log(`📍 Final Match: Found ${eligibleUsers.length} users within radius/city`);

    if (eligibleUsers.length === 0) {
      console.log('No eligible users found');
      return new Response(JSON.stringify({
        message: 'No eligible users found',
        notificationsSent: 0
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Found ${eligibleUsers.length} eligible users to notify`);

    // Get user IDs for push notifications (Targeting via External ID)
    const userIds = eligibleUsers.map(u => u.id);
    console.log(`Targeting ${userIds.length} users for push via External ID`);

    // Send push notifications
    const locationDisplay = request.location_state
      ? `${request.location_city}, ${request.location_state}`
      : request.location_city;

    const pushTitle = '🍽️ New food request nearby!';
    const pushMessage = `Someone's craving ${request.food_type} in ${locationDisplay}. Know a great spot?`;
    const pushData = {
      type: 'NEW_REQUEST_NEARBY',
      requestId: request.id,
      foodType: request.food_type,
      location: locationDisplay,
      url: `/recommend/${request.id}`
    };

    // Use sendPushNotification targeting External IDs (mapped to user IDs)
    const pushResult = await sendPushNotification(userIds, pushTitle, pushMessage, pushData);

    // Send notification emails to eligible users who have email enabled
    const emailPromises = eligibleUsers.map(async (targetUser) => {
      // Check email preferences
      const emailEnabled = targetUser.email_notifications_enabled !== false;
      const newRequestsEnabled = targetUser.email_new_requests !== false;

      if (!emailEnabled || !newRequestsEnabled) {
        console.log(`📧 Skipping email for user ${targetUser.id} - email preferences disabled`);
        return { skipped: true, reason: 'preferences' };
      }

      // Check for duplicate email (idempotency)
      const alreadySent = await wasEmailAlreadySent(targetUser.id, 'new_request', requestId);
      if (alreadySent) {
        console.log(`📧 Skipping email for user ${targetUser.id} - already sent`);
        return { skipped: true, reason: 'duplicate' };
      }

      const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(targetUser.id);

      if (authUserError || !authUser?.user?.email) {
        console.log(`No email found for user ${targetUser.id}`);
        return { skipped: true, reason: 'no_email' };
      }

      const emailTo = authUser.user.email;
      const subject = `🍽️ New ${request.food_type} request in ${request.location_city}!`;

      try {
        const emailResponse = await resend.emails.send({
          from: "Cravlr <notifications@cravlr.com>",
          to: [emailTo],
          subject: subject,
          html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F7F5F8;">
              <div style="background: linear-gradient(135deg, #A03272 0%, #7A2156 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🍽️ New Food Request!</h1>
              </div>
              
              <div style="padding: 30px; background-color: white;">
                <p style="font-size: 16px; color: #1C1C1C;">Hi ${targetUser.display_name || 'there'}!</p>
                
                <p style="font-size: 16px; color: #1C1C1C;">Someone near you is looking for a great <strong>${request.food_type}</strong> spot in ${locationDisplay}!</p>
                
                <div style="background-color: #F9EFF5; padding: 20px; border-radius: 16px; margin: 24px 0; border-left: 4px solid #A03272;">
                  <h2 style="color: #A03272; margin-top: 0; font-size: 18px;">📍 Request Details</h2>
                  <p style="margin: 8px 0; color: #1C1C1C;"><strong>Food Type:</strong> ${request.food_type}</p>
                  <p style="margin: 8px 0; color: #1C1C1C;"><strong>Location:</strong> ${locationDisplay}</p>
                  ${request.location_address ? `<p style="margin: 8px 0; color: #1C1C1C;"><strong>Near:</strong> ${request.location_address}</p>` : ''}
                  ${request.additional_notes ? `<p style="margin: 8px 0; color: #1C1C1C;"><strong>Notes:</strong> ${request.additional_notes}</p>` : ''}
                  <p style="margin: 8px 0; color: #1C1C1C;"><strong>Requested by:</strong> ${requesterProfile?.display_name || 'A fellow foodie'}</p>
                </div>
                
                <p style="font-size: 16px; color: #1C1C1C;">Know a great spot? Share your recommendation and earn points!</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${Deno.env.get('SITE_URL') || 'https://cravlr.app'}/browse-requests" 
                     style="background: linear-gradient(135deg, #A03272 0%, #7A2156 100%); color: white; padding: 14px 28px; 
                            text-decoration: none; border-radius: 24px; display: inline-block; font-weight: 600;
                            box-shadow: 0 4px 12px rgba(160, 50, 114, 0.3);">
                    View Request & Recommend
                  </a>
                </div>
              </div>
              
              <div style="padding: 20px; text-align: center; background-color: #F7F5F8;">
                <p style="font-size: 12px; color: #6B6B6B; margin: 0;">
                  You received this because you're registered near ${locationDisplay}.<br>
                  <a href="${Deno.env.get('SITE_URL') || 'https://cravlr.app'}/profile" style="color: #A03272;">Update your notification preferences</a>
                </p>
                <p style="margin-top: 16px; font-size: 14px; color: #1C1C1C;">
                  Happy recommending! 🎉<br>
                  <strong>The Cravlr Team</strong>
                </p>
              </div>
            </div>
          `,
          text: `Hi ${targetUser.display_name || 'there'}! Someone near you is looking for a great ${request.food_type} spot in ${locationDisplay}. Know a great spot? Visit Cravlr to share your recommendation and earn points!`,
        });

        // Log successful email
        await logEmailNotification(
          targetUser.id,
          'new_request',
          requestId,
          emailTo,
          subject,
          emailResponse.data?.id || null,
          'sent'
        );

        console.log(`✅ Email sent to ${emailTo}:`, emailResponse.data?.id);
        return { success: true, emailId: emailResponse.data?.id };
      } catch (emailError: any) {
        // Log failed email
        await logEmailNotification(
          targetUser.id,
          'new_request',
          requestId,
          emailTo,
          subject,
          null,
          'failed',
          emailError.message
        );

        console.error(`❌ Error sending email to ${emailTo}:`, emailError);
        return { success: false, error: emailError.message };
      }
    });

    const emailResults = await Promise.all(emailPromises);
    const successfulEmails = emailResults.filter(r => r.success).length;
    const skippedEmails = emailResults.filter(r => r.skipped).length;

    console.log(`📧 Sent ${successfulEmails} emails, skipped ${skippedEmails}, sent ${pushResult.sentCount} push notifications`);

    return new Response(JSON.stringify({
      success: true,
      emailsSent: successfulEmails,
      emailsSkipped: skippedEmails,
      pushNotificationsSent: pushResult.sentCount,
      totalEligibleUsers: eligibleUsers.length
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in notify-area-users function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
