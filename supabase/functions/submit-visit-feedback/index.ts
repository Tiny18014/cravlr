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

    // Verify user
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
    const { recommendationId, thumbsUp, comment, photoUrls, visited } = await req.json();

    if (!recommendationId) {
      return new Response(
        JSON.stringify({ error: 'Missing recommendationId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recommendation details
    const { data: recommendation, error: recError } = await supabase
      .from('recommendations')
      .select('recommender_id, request_id')
      .eq('id', recommendationId)
      .single();

    if (recError || !recommendation) {
      return new Response(
        JSON.stringify({ error: 'Recommendation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is the requester
    const { data: request } = await supabase
      .from('food_requests')
      .select('requester_id')
      .eq('id', recommendation.request_id)
      .single();

    if (request?.requester_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to submit feedback for this recommendation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate points
    let pointsAwarded = 0;
    if (thumbsUp === true) pointsAwarded += 5;
    if (comment && comment.trim().length > 0) pointsAwarded += 5;
    if (photoUrls && photoUrls.length > 0) pointsAwarded += 5;

    // Create feedback record
    const { error: feedbackError } = await supabase
      .from('recommendation_feedback')
      .insert({
        recommendation_id: recommendationId,
        user_id: user.id,
        thumbs_up: thumbsUp,
        comment: comment || null,
        photo_urls: photoUrls || [],
        points_awarded: pointsAwarded,
        feedback_type: thumbsUp ? 'thumbs_up' : 'thumbs_down',
      });

    if (feedbackError) {
      throw feedbackError;
    }

    // Update recommendation status
    const newStatus = visited ? 'visited' : 'not_visited';
    await supabase
      .from('recommendations')
      .update({ 
        status: newStatus,
        visit_checked_at: new Date().toISOString()
      })
      .eq('id', recommendationId);

    // Award points to recommender
    if (pointsAwarded > 0 && visited) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('points_total')
        .eq('id', recommendation.recommender_id)
        .single();

      const newTotal = (profile?.points_total || 0) + pointsAwarded;

      await supabase
        .from('profiles')
        .update({ points_total: newTotal })
        .eq('id', recommendation.recommender_id);

      // Create points event
      await supabase.from('points_events').insert({
        user_id: recommendation.recommender_id,
        points: pointsAwarded,
        event_type: 'feedback_received',
      });
    }

    return new Response(
      JSON.stringify({ success: true, pointsAwarded }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});