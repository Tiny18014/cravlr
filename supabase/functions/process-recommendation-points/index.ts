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

    const { recommendationId, action } = await req.json();

    if (!recommendationId || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing recommendationId or action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recommendation details
    const { data: recommendation, error: recError } = await supabase
      .from('recommendations')
      .select('recommender_id, request_id, status')
      .eq('id', recommendationId)
      .single();

    if (recError || !recommendation) {
      return new Response(
        JSON.stringify({ error: 'Recommendation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let pointsToAward = 0;

    if (action === 'create') {
      // Award +5 points for creating a recommendation
      pointsToAward = 5;

      // Schedule a visit reminder for 1 minute later (testing)
      const oneMinuteLater = new Date(Date.now() + 1 * 60 * 1000);
      await supabase.from('visit_reminders').insert({
        recommendation_id: recommendationId,
        scheduled_for: oneMinuteLater.toISOString(),
      });
    }

    if (pointsToAward > 0) {
      // Update recommender's total points
      const { data: profile } = await supabase
        .from('profiles')
        .select('points_total')
        .eq('id', recommendation.recommender_id)
        .single();

      const newTotal = (profile?.points_total || 0) + pointsToAward;

      await supabase
        .from('profiles')
        .update({ points_total: newTotal })
        .eq('id', recommendation.recommender_id);

      // Create points event
      await supabase.from('points_events').insert({
        user_id: recommendation.recommender_id,
        points: pointsToAward,
        event_type: action === 'create' ? 'recommendation_created' : 'feedback_received',
      });
    }

    return new Response(
      JSON.stringify({ success: true, pointsAwarded: pointsToAward }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing points:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});