import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  recommendationId: z.string().uuid({ message: 'Invalid recommendation ID format' }),
  requestId: z.string().uuid({ message: 'Invalid request ID format' }),
  restaurantName: z.string().min(1).max(200, { message: 'Restaurant name must be 1-200 characters' }),
  placeId: z.string().max(500).optional(),
  mapsUrl: z.string().url({ message: 'Invalid maps URL format' }).optional()
});

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key for full access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = requestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validationResult.error.issues.map(i => i.message) 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const { 
      recommendationId, 
      requestId, 
      restaurantName, 
      placeId, 
      mapsUrl 
    } = validationResult.data;

    console.log('🔗 Generating referral link for recommendation:', recommendationId);

    // Verify recommendation exists
    const { data: recommendation, error: recError } = await supabase
      .from('recommendations')
      .select('recommender_id')
      .eq('id', recommendationId)
      .single();

    if (recError || !recommendation) {
      console.error('❌ Recommendation not found:', recError);
      return new Response(
        JSON.stringify({ error: 'Recommendation not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get the request to verify requester
    const { data: request, error: requestError } = await supabase
      .from('food_requests')
      .select('requester_id')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      console.error('❌ Request not found:', requestError);
      return new Response(
        JSON.stringify({ error: 'Request not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Allow both recommender and requester to generate referral links
    const isRecommender = recommendation.recommender_id === user.id;
    const isRequester = request.requester_id === user.id;

    console.log('🔐 Permission check:', { 
      userId: user.id, 
      recommenderId: recommendation.recommender_id,
      requesterId: request.requester_id,
      isRecommender, 
      isRequester 
    });

    if (!isRecommender && !isRequester) {
      console.error('❌ User is neither recommender nor requester');
      return new Response(
        JSON.stringify({ error: 'You do not have permission to create a referral link for this recommendation' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check if referral link already exists
    const { data: existingLink } = await supabase
      .from('referral_links')
      .select('*')
      .eq('recommendation_id', recommendationId)
      .single();

    if (existingLink) {
      console.log('🔗 Found existing referral link:', existingLink.referral_code);
      return new Response(
        JSON.stringify({
          success: true,
          referralCode: existingLink.referral_code,
          referralUrl: `https://edazolwepxbdeniluamf.supabase.co/functions/v1/track-referral-click/${existingLink.referral_code}`
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Generate unique referral code
    const { data: codeData, error: codeError } = await supabase
      .rpc('generate_referral_code');

    if (codeError) {
      console.error('❌ Error generating referral code:', codeError);
      throw codeError;
    }

    const referralCode = codeData;

    // Create referral link record
    const { data: referralLink, error: linkError } = await supabase
      .from('referral_links')
      .insert({
        recommendation_id: recommendationId,
        request_id: requestId,
        restaurant_name: restaurantName,
        place_id: placeId,
        maps_url: mapsUrl,
        referral_code: referralCode
      })
      .select()
      .single();

    if (linkError) {
      console.error('❌ Error creating referral link:', linkError);
      throw linkError;
    }

    console.log('✅ Created referral link:', referralCode);

    // Return the referral URL
    const referralUrl = `https://edazolwepxbdeniluamf.supabase.co/functions/v1/track-referral-click/${referralCode}`;

    return new Response(
      JSON.stringify({
        success: true,
        referralCode,
        referralUrl
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('❌ Error in generate-referral-link function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);