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

    // Get due reminders
    const { data: reminders, error: reminderError } = await supabase
      .from('visit_reminders')
      .select(`
        id,
        recommendation_id,
        recommendations!inner(
          id,
          restaurant_name,
          food_requests!inner(
            requester_id,
            food_type,
            location_city
          )
        )
      `)
      .eq('sent', false)
      .lte('scheduled_for', new Date().toISOString());

    if (reminderError) {
      throw reminderError;
    }

    console.log(`Processing ${reminders?.length || 0} due reminders`);

    const results = [];
    for (const reminder of reminders || []) {
      try {
        const recommendation = reminder.recommendations as any;
        const requesterId = recommendation.food_requests.requester_id;

        // Create notification
        await supabase.from('notifications').insert({
          requester_id: requesterId,
          request_id: recommendation.food_requests.id,
          type: 'visit_reminder',
          title: 'Did you visit the restaurant?',
          message: `Did you visit ${recommendation.restaurant_name} for ${recommendation.food_requests.food_type}?`,
          read: false,
        });

        // Mark reminder as sent
        await supabase
          .from('visit_reminders')
          .update({ sent: true })
          .eq('id', reminder.id);

        results.push({ success: true, reminderId: reminder.id });
      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
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
    console.error('Error processing visit reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});