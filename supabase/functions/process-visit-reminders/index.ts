import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

// Check if email was already sent (idempotency)
async function wasEmailAlreadySent(
  supabase: any,
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
  supabase: any,
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  // Check for cron secret (for scheduled jobs processing ALL reminders)
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');
  const isCronJob = expectedSecret && cronSecret === expectedSecret;

  // Check for user JWT (for client polling - processes only that user's reminders)
  const authHeader = req.headers.get('Authorization');
  let authenticatedUserId: string | null = null;

  if (!isCronJob && authHeader) {
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (!userError && user) {
      authenticatedUserId = user.id;
    }
  }

  // Require either cron secret or valid user JWT
  if (!isCronJob && !authenticatedUserId) {
    console.error('❌ Unauthorized: No valid cron secret or user JWT');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    console.log(isCronJob 
      ? '🔔 Processing ALL visit reminders (cron job)...' 
      : `🔔 Processing visit reminders for user ${authenticatedUserId}...`
    );

    // Build query - filter by user if authenticated via JWT
    let query = supabase
      .from('visit_reminders')
      .select(`
        id,
        recommendation_id,
        scheduled_for,
        recommendations!inner(
          id,
          request_id,
          restaurant_name,
          food_requests!inner(
            id,
            requester_id,
            food_type,
            location_city
          )
        )
      `)
      .eq('sent', false)
      .lte('scheduled_for', new Date().toISOString());

    const { data: reminders, error: reminderError } = await query;

    if (reminderError) {
      console.error('Error fetching reminders:', reminderError);
      throw reminderError;
    }

    // Filter to user's reminders if authenticated via JWT (not cron)
    const filteredReminders = !isCronJob && authenticatedUserId
      ? (reminders || []).filter((r: any) => r.recommendations?.food_requests?.requester_id === authenticatedUserId)
      : (reminders || []);

    console.log(`📋 Found ${filteredReminders.length} due reminders`);

    const results = [];
    for (const reminder of filteredReminders) {
      try {
        const recommendation = reminder.recommendations as any;
        const foodRequest = recommendation.food_requests;
        const requesterId = foodRequest.requester_id;
        const requestId = foodRequest.id;

        console.log(`📨 Creating notification for requester ${requesterId}, request ${requestId}`);

        // Create in-app notification
        const { error: notifError } = await supabase.from('notifications').insert({
          requester_id: requesterId,
          request_id: requestId,
          type: 'visit_reminder',
          title: 'Did you visit the restaurant?',
          message: `Did you visit ${recommendation.restaurant_name} for ${foodRequest.food_type}?`,
          read: false,
        });

        if (notifError) {
          console.error('Error creating notification:', notifError);
          throw notifError;
        }

        // Send email notification if Resend is configured
        if (resend) {
          // Get user profile and check email preferences
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('display_name, email_notifications_enabled, email_visit_reminders')
            .eq('id', requesterId)
            .single();

          const emailEnabled = userProfile?.email_notifications_enabled !== false;
          const visitRemindersEnabled = userProfile?.email_visit_reminders !== false;

          if (emailEnabled && visitRemindersEnabled) {
            // Check for duplicate email
            const alreadySent = await wasEmailAlreadySent(supabase, requesterId, 'visit_reminder', reminder.recommendation_id);
            
            if (!alreadySent) {
              // Get user email
              const { data: authUser } = await supabase.auth.admin.getUserById(requesterId);
              const emailTo = authUser?.user?.email;

              if (emailTo) {
                const subject = `🍽️ Did you visit ${recommendation.restaurant_name}?`;

                try {
                  const emailResponse = await resend.emails.send({
                    from: "Cravlr <notifications@cravlr.app>",
                    to: [emailTo],
                    subject: subject,
                    html: `
                      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F7F5F8;">
                        <div style="background: linear-gradient(135deg, #A03272 0%, #7A2156 100%); padding: 30px; text-align: center;">
                          <h1 style="color: white; margin: 0; font-size: 28px;">🍽️ Quick Check-in!</h1>
                        </div>
                        
                        <div style="padding: 30px; background-color: white;">
                          <p style="font-size: 16px; color: #1C1C1C;">Hi ${userProfile?.display_name || 'there'}!</p>
                          
                          <p style="font-size: 16px; color: #1C1C1C;">We noticed you were looking for <strong>${foodRequest.food_type}</strong> in ${foodRequest.location_city}.</p>
                          
                          <div style="background-color: #F9EFF5; padding: 20px; border-radius: 16px; margin: 24px 0; border-left: 4px solid #A03272;">
                            <h2 style="color: #A03272; margin-top: 0; font-size: 18px;">Did you visit ${recommendation.restaurant_name}?</h2>
                            <p style="color: #6B6B6B; margin: 0;">Let us know if you tried this recommendation! Your feedback helps improve recommendations for everyone.</p>
                          </div>
                          
                          <div style="text-align: center; margin: 30px 0;">
                            <a href="${Deno.env.get('SITE_URL') || 'https://cravlr.app'}/dashboard" 
                               style="background: linear-gradient(135deg, #A03272 0%, #7A2156 100%); color: white; padding: 14px 28px; 
                                      text-decoration: none; border-radius: 24px; display: inline-block; font-weight: 600;
                                      box-shadow: 0 4px 12px rgba(160, 50, 114, 0.3);">
                              Share Your Feedback
                            </a>
                          </div>
                        </div>
                        
                        <div style="padding: 20px; text-align: center; background-color: #F7F5F8;">
                          <p style="font-size: 12px; color: #6B6B6B; margin: 0;">
                            <a href="${Deno.env.get('SITE_URL') || 'https://cravlr.app'}/profile" style="color: #A03272;">Update your notification preferences</a>
                          </p>
                          <p style="margin-top: 16px; font-size: 14px; color: #1C1C1C;">
                            <strong>The Cravlr Team</strong>
                          </p>
                        </div>
                      </div>
                    `,
                    text: `Hi ${userProfile?.display_name || 'there'}! Did you visit ${recommendation.restaurant_name}? Let us know if you tried this recommendation! Visit Cravlr to share your feedback.`,
                  });

                  await logEmailNotification(
                    supabase,
                    requesterId,
                    'visit_reminder',
                    reminder.recommendation_id,
                    emailTo,
                    subject,
                    emailResponse.data?.id || null,
                    'sent'
                  );

                  console.log(`✅ Visit reminder email sent to ${emailTo}`);
                } catch (emailError: any) {
                  await logEmailNotification(
                    supabase,
                    requesterId,
                    'visit_reminder',
                    reminder.recommendation_id,
                    emailTo,
                    subject,
                    null,
                    'failed',
                    emailError.message
                  );
                  console.error(`❌ Error sending visit reminder email:`, emailError);
                }
              }
            } else {
              console.log(`📧 Skipping email - already sent for reminder ${reminder.id}`);
            }
          } else {
            console.log(`📧 Skipping email - user preferences disabled for reminder ${reminder.id}`);
          }
        }

        // Mark reminder as sent
        await supabase
          .from('visit_reminders')
          .update({ sent: true })
          .eq('id', reminder.id);

        console.log(`✅ Reminder ${reminder.id} processed successfully`);
        results.push({ success: true, reminderId: reminder.id });
      } catch (error: any) {
        console.error(`❌ Error processing reminder ${reminder.id}:`, error);
        results.push({ success: false, reminderId: reminder.id, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        processed: results.length,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Error processing visit reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
