import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const pointsSchema = z.object({
  recommendationId: z.string().uuid('Invalid recommendation ID format'),
  action: z.enum(['create', 'thumbs_up', 'comment', 'photo'], {
    errorMap: () => ({ message: 'Action must be one of: create, thumbs_up, comment, photo' })
  })
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate input with Zod
    const body = await req.json();
    const validationResult = pointsSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.error('Input validation failed:', validationResult.error.issues);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validationResult.error.issues.map(i => i.message) 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { recommendationId, action } = validationResult.data;

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

    // Authorization check based on action type
    if (action === 'create') {
      // For 'create' action, the recommender triggers their own points
      if (recommendation.recommender_id !== user.id) {
        console.error(`User ${user.id} attempted to award create points for recommendation ${recommendationId} owned by recommender ${recommendation.recommender_id}`);
        return new Response(
          JSON.stringify({ error: 'Not authorized to award points for this recommendation' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // For feedback actions, only the requester can trigger point awards
      const { data: request, error: requestError } = await supabase
        .from('food_requests')
        .select('requester_id')
        .eq('id', recommendation.request_id)
        .single();

      if (requestError || !request) {
        return new Response(
          JSON.stringify({ error: 'Associated request not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (request.requester_id !== user.id) {
        console.error(`User ${user.id} attempted to award feedback points for recommendation ${recommendationId} owned by requester ${request.requester_id}`);
        return new Response(
          JSON.stringify({ error: 'Not authorized to award points for this recommendation' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let pointsToAward = 0;

    if (action === 'create') {
      // Award +5 points for creating a recommendation
      pointsToAward = 5;

      // Schedule a visit reminder for 3 hours later
      const threeHoursLater = new Date(Date.now() + 3 * 60 * 60 * 1000);
      await supabase.from('visit_reminders').insert({
        recommendation_id: recommendationId,
        scheduled_for: threeHoursLater.toISOString(),
      });
    }

    if (pointsToAward > 0) {
      // Update recommender's total points and monthly points
      const { data: profile } = await supabase
        .from('profiles')
        .select('points_total, points_this_month')
        .eq('id', recommendation.recommender_id)
        .single();

      const newTotal = (profile?.points_total || 0) + pointsToAward;
      const newMonthly = (profile?.points_this_month || 0) + pointsToAward;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          points_total: newTotal,
          points_this_month: newMonthly
        })
        .eq('id', recommendation.recommender_id);

      if (updateError) {
        console.error('Error updating profile points:', updateError);
      }

      // Create points event
      const { error: eventError } = await supabase.from('points_events').insert({
        user_id: recommendation.recommender_id,
        points: pointsToAward,
        event_type: action === 'create' ? 'recommendation_created' : 'feedback_received',
      });

      if (eventError) {
        console.error('Error creating points event:', eventError);
      }
    }

    console.log(`User ${user.id} awarded ${pointsToAward} points for recommendation ${recommendationId}`);

    return new Response(
      JSON.stringify({ success: true, pointsAwarded: pointsToAward }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing points:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
