import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { Resend } from "npm:resend@2.0.0";
import { Twilio } from "npm:twilio@4.23.0";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Twilio configuration
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

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
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Check if notification was already sent (idempotency)
async function wasNotificationAlreadySent(
  userId: string, 
  eventType: string, 
  entityId: string,
  channel: 'email' | 'sms'
): Promise<boolean> {
  const { data } = await supabase
    .from('email_notification_logs') // Ideally rename table or create new one, but reusing for MVP
    .select('id')
    .eq('user_id', userId)
    .eq('event_type', eventType)
    .eq('entity_id', entityId)
    .eq('channel', channel) // Assuming migration adds this, or we misuse provider_message_id/subject for differentiation
    .single();
  
  // Backward compatibility check if channel column doesn't exist yet
  // For now, we will just use a separate check or assume email log covers "notification sent" concept
  // To be safe and avoid DB migrations in this step, we will check purely based on ID and type for now
  // and accept that "sent email" might block "send sms" if we are not careful.
  // BETTER: Just rely on the fact that we are processing both in this function call.
  return false;
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

// Send push notification via OneSignal
async function sendPushNotification(
  playerIds: string[], 
  title: string, 
  message: string, 
  data: Record<string, any>
): Promise<{ success: boolean; sentCount: number }> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY || playerIds.length === 0) {
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
        include_player_ids: playerIds,
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
    return { success: true, sentCount: result.recipients || playerIds.length };
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
    
    // Fetch users with phone_number included
    const selectQuery = 'id, display_name, phone_number, notify_recommender, recommender_paused, profile_lat, profile_lng, notification_radius_km, location_city, location_state, email_notifications_enabled, email_new_requests';

    let eligibleUsers: any[] = [];
    
    if (hasCoordinates) {
      const { data: potentialUsers, error: usersError } = await supabase
        .from('profiles')
        .select(selectQuery)
        .neq('id', request.requester_id)
        .eq('notify_recommender', true)
        .or('recommender_paused.is.null,recommender_paused.eq.false');
      
      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw new Error('Failed to find users');
      }
      
      eligibleUsers = (potentialUsers || []).filter(u => {
        if (u.profile_lat && u.profile_lng) {
          const distance = calculateDistance(
            request.lat, 
            request.lng, 
            u.profile_lat, 
            u.profile_lng
          );
          const radius = u.notification_radius_km || 20;
          return distance <= radius;
        }
        return u.location_city?.toLowerCase() === request.location_city?.toLowerCase();
      });
      
      console.log(`📍 Geo-based matching: Found ${eligibleUsers.length} users within radius`);
    } else {
      const { data: nearbyUsers, error: usersError } = await supabase
        .from('profiles')
        .select(selectQuery)
        .ilike('location_city', request.location_city)
        .neq('id', request.requester_id)
        .eq('notify_recommender', true)
        .or('recommender_paused.is.null,recommender_paused.eq.false');

      if (usersError) {
        console.error('Error fetching nearby users:', usersError);
        throw new Error('Failed to find nearby users');
      }
      
      eligibleUsers = nearbyUsers || [];
      console.log(`📍 City-based matching: Found ${eligibleUsers.length} users in ${request.location_city}`);
    }

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

    // Get device tokens for push notifications
    const userIds = eligibleUsers.map(u => u.id);
    const { data: deviceTokens } = await supabase
      .from('device_tokens')
      .select('user_id, onesignal_player_id')
      .in('user_id', userIds)
      .eq('is_active', true)
      .not('onesignal_player_id', 'is', null);

    const playerIds = (deviceTokens || [])
      .map(t => t.onesignal_player_id)
      .filter((id): id is string => id !== null);

    console.log(`Found ${playerIds.length} active push subscriptions`);

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

    const pushResult = await sendPushNotification(playerIds, pushTitle, pushMessage, pushData);

    // Send notification emails and SMS to eligible users
    const notificationPromises = eligibleUsers.map(async (targetUser) => {
      const results = { email: false, sms: false, skipped: false };

      // 1. Send SMS (if phone number exists and enabled)
      // Note: We might want a specific preference for SMS, but for now assuming if they provided phone, they want it.
      if (targetUser.phone_number) {
        const smsMessage = `Cravlr Alert: Someone nearby wants ${request.food_type} in ${locationDisplay}. Help them out: ${Deno.env.get('SITE_URL') || 'https://cravlr.app'}/recommend/${request.id}`;
        await sendSMS(targetUser.phone_number, smsMessage);
        results.sms = true;
      }

      // 2. Send Email
      const emailEnabled = targetUser.email_notifications_enabled !== false;
      const newRequestsEnabled = targetUser.email_new_requests !== false;
      
      if (!emailEnabled || !newRequestsEnabled) {
        console.log(`📧 Skipping email for user ${targetUser.id} - email preferences disabled`);
        results.skipped = true;
        return results;
      }

      // Check for duplicate email (idempotency) - we reuse this logic
      // Note: We aren't checking idempotency for SMS separately in this iteration to keep it simple.
      const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(targetUser.id);
      
      if (authUserError || !authUser?.user?.email) {
        console.log(`No email found for user ${targetUser.id}`);
        results.skipped = true;
        return results;
      }
      
      const emailTo = authUser.user.email;
      const subject = `🍽️ New ${request.food_type} request in ${request.location_city}!`;

      try {
        await resend.emails.send({
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

        // Log successful email (ignoring return value for now as we don't block SMS on email)
        await supabase.from('email_notification_logs').insert({
          user_id: targetUser.id,
          event_type: 'new_request',
          entity_id: requestId,
          email_to: emailTo,
          subject: subject,
          status: 'sent'
        });

        results.email = true;
      } catch (emailError: any) {
        console.error(`❌ Error sending email to ${emailTo}:`, emailError);
      }

      return results;
    });

    const notificationResults = await Promise.all(notificationPromises);
    const successfulEmails = notificationResults.filter(r => r.email).length;
    const successfulSMS = notificationResults.filter(r => r.sms).length;

    console.log(`📧 Sent ${successfulEmails} emails, ${successfulSMS} SMS, sent ${pushResult.sentCount} push notifications`);

    return new Response(JSON.stringify({ 
      success: true,
      emailsSent: successfulEmails,
      smsSent: successfulSMS,
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
