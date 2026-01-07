import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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