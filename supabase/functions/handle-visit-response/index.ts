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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { recommendationId, response } = await req.json();

    // response can be: 'visited', 'not_visited', 'remind_3h', 'no_reminder', 'maybe_later'
    if (!recommendationId || !response) {
      return new Response(
        JSON.stringify({ error: 'Missing recommendationId or response' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recommendation
    const { data: recommendation, error: recError } = await supabase
      .from('recommendations')
      .select('*, food_requests!inner(requester_id)')
      .eq('id', recommendationId)
      .single();

    if (recError || !recommendation) {
      return new Response(
        JSON.stringify({ error: 'Recommendation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is the requester
    if (recommendation.food_requests.requester_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Not authorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let updateData: any = {};
    let scheduleReminder = false;

    switch (response) {
      case 'visited':
        // User will provide feedback on a separate page
        updateData = { 
          visit_checked_at: new Date().toISOString()
        };
        break;

      case 'not_visited':
        updateData = { 
          status: 'not_visited',
          visit_checked_at: new Date().toISOString()
        };
        break;

      case 'remind_3h':
      case 'maybe_later':
        // Check if we've already sent 2 reminders (max limit)
        if ((recommendation.visit_reminder_count || 0) < 2) {
          scheduleReminder = true;
          updateData = {
            status: 'maybe_later',
            visit_reminder_count: (recommendation.visit_reminder_count || 0) + 1,
            last_reminder_sent_at: new Date().toISOString()
          };
        } else {
          updateData = { status: 'maybe_later' };
        }
        break;

      case 'no_reminder':
        updateData = { 
          visit_checked_at: new Date().toISOString()
        };
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid response type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Update recommendation
    await supabase
      .from('recommendations')
      .update(updateData)
      .eq('id', recommendationId);

    // Schedule new reminder if needed
    if (scheduleReminder) {
      const threeHoursLater = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours
      await supabase.from('visit_reminders').insert({
        recommendation_id: recommendationId,
        scheduled_for: threeHoursLater.toISOString(),
      });
    }

    return new Response(
      JSON.stringify({ success: true, reminderScheduled: scheduleReminder }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error handling visit response:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});