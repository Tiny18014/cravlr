import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔔 Processing visit reminders...');

    // Get due reminders
    const { data: reminders, error: reminderError } = await supabase
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

    if (reminderError) {
      console.error('Error fetching reminders:', reminderError);
      throw reminderError;
    }

    console.log(`📋 Found ${reminders?.length || 0} due reminders`);

    const results = [];
    for (const reminder of reminders || []) {
      try {
        const recommendation = reminder.recommendations as any;
        const foodRequest = recommendation.food_requests;
        const requesterId = foodRequest.requester_id;
        const requestId = foodRequest.id;

        console.log(`📨 Creating notification for requester ${requesterId}, request ${requestId}`);

        // Create notification
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
      } catch (error) {
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
  } catch (error) {
    console.error('❌ Error processing visit reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
