import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🎯 Request Accept/Ignore endpoint called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: authHeader ? { Authorization: authHeader } : {},
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { requestId, action } = await req.json();
    console.log(`📝 User ${user.id} wants to ${action} request ${requestId}`);

    if (!requestId || !action || !['accept', 'ignore'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the request exists and get requester info
    const { data: request, error: requestError } = await supabase
      .from('food_requests')
      .select('id, status, expires_at, requester_id')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      console.error('❌ Request not found:', requestError);
      return new Response(
        JSON.stringify({ error: 'Request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For "accept" actions on expired/closed requests, this means the user is viewing results
    // For their own expired requests, we allow this (it's just tracking the "view results" action)
    if (action === 'accept' && (request.status === 'expired' || request.status === 'closed')) {
      // Only allow viewing results for own requests
      if (request.requester_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Cannot view results for others\' requests' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // For viewing results, we just record that they viewed it and return success
      console.log(`✅ User ${user.id} viewed results for their expired/closed request ${requestId}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'view_results',
          requestId,
          message: 'Results viewed' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // For all other cases, request must be active
    if (request.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Request is no longer active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if request has expired (for active requests)
    if (new Date(request.expires_at) <= new Date()) {
      return new Response(
        JSON.stringify({ error: 'Request has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has a state for this request
    const { data: existingState } = await supabase
      .from('request_user_state')
      .select('id, state')
      .eq('user_id', user.id)
      .eq('request_id', requestId)
      .single();

    // If already has the same state, just return success (idempotent)
    if (existingState && existingState.state === (action === 'accept' ? 'accepted' : 'ignored')) {
      console.log(`✅ User ${user.id} already has state ${existingState.state} for request ${requestId}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          action,
          requestId,
          data: existingState,
          message: 'State already set'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Upsert the user's state for this request
    const { data, error } = await supabase
      .from('request_user_state')
      .upsert({
        user_id: user.id,
        request_id: requestId,
        state: action === 'accept' ? 'accepted' : 'ignored'
      })
      .select()
      .single();

    if (error) {
      // Handle duplicate key errors gracefully
      if (error.code === '23505') {
        console.log(`✅ User ${user.id} already processed request ${requestId} (duplicate key)`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            action,
            requestId,
            message: 'Already processed'
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      console.error('❌ Error updating request state:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to update request state' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Successfully ${action}ed request ${requestId} for user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        action,
        requestId,
        data 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});