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
    console.log('🚫 handle-recommendation-decline called');
    
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('❌ No auth header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      recommendationId, 
      requestId, 
      restaurantName 
    } = await req.json();
    
    console.log('🔍 Request body:', { recommendationId, requestId, restaurantName });

    // Validate required fields
    if (!recommendationId || !requestId || !restaurantName) {
      console.error('❌ Missing required fields:', { recommendationId, requestId, restaurantName });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for secure operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the request belongs to the user
    const { data: requestData, error: requestError } = await supabaseAdmin
      .from('food_requests')
      .select('requester_id')
      .eq('id', requestId)
      .single();

    if (requestError || !requestData) {
      return new Response(
        JSON.stringify({ error: 'Request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (requestData.requester_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to decline this recommendation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recommender_id from the recommendation
    const { data: recommendationData, error: recError } = await supabaseAdmin
      .from('recommendations')
      .select('recommender_id')
      .eq('id', recommendationId)
      .single();

    if (recError || !recommendationData) {
      return new Response(
        JSON.stringify({ error: 'Recommendation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update recommendation status to 'declined'
    const { error: updateError } = await supabaseAdmin
      .from('recommendations')
      .update({ status: 'declined' })
      .eq('id', recommendationId);

    if (updateError) {
      console.error('❌ Error updating recommendation status:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update recommendation status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Recommendation status updated to declined');

    // Create notification for the recommender
    const { error: notifError } = await supabaseAdmin
      .from('recommender_notifications')
      .insert({
        recommender_id: recommendationData.recommender_id,
        recommendation_id: recommendationId,
        type: 'declined',
        title: 'Your recommendation was declined',
        message: `Your recommendation for ${restaurantName} wasn't selected this time.`,
        restaurant_name: restaurantName,
        read: false
      });

    if (notifError) {
      console.error('❌ Error creating recommender notification:', notifError);
    } else {
      console.log('✅ Recommender notification created for decline');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});