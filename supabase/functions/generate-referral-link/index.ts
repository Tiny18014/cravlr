import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateReferralRequest {
  recommendationId: string;
  requestId: string;
  restaurantName: string;
  placeId?: string;
  mapsUrl?: string;
}

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

    // Parse request body
    const { 
      recommendationId, 
      requestId, 
      restaurantName, 
      placeId, 
      mapsUrl 
    }: GenerateReferralRequest = await req.json();

    console.log('🔗 Generating referral link for recommendation:', recommendationId);

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