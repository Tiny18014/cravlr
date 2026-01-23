import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const feedbackSchema = z.object({
  recommendationId: z.string().uuid('Invalid recommendation ID format'),
  thumbsUp: z.boolean().optional(),
  comment: z.string().max(1000, 'Comment must be 1000 characters or less').optional(),
  photoUrls: z.array(z.string().url('Invalid photo URL')).max(10, 'Maximum 10 photos allowed').optional(),
  visited: z.boolean().optional()
});

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

    // Parse and validate input
    const rawBody = await req.json();
    const validationResult = feedbackSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validationResult.error.errors.map(e => e.message).join(', ')
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { recommendationId, thumbsUp, comment, photoUrls, visited } = validationResult.data;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Check if feedback already exists
    const { data: existingFeedback } = await supabase
      .from('recommendation_feedback')
      .select('id, points_awarded')
      .eq('recommendation_id', recommendationId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingFeedback) {
      // Feedback already exists, return success with existing points
      return new Response(
        JSON.stringify({ success: true, pointsAwarded: existingFeedback.points_awarded, alreadySubmitted: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});