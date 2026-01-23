import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL_MIN = 15;

interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  website?: string;
  url: string;
  openingHours?: string[];
  priceLevel?: number;
  rating?: number;
  reviews?: number;
  phone?: string;
  photos?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Authenticated user:', user.id);

    const url = new URL(req.url);
    const placeId = url.pathname.split('/').pop();

    if (!placeId) {
      return new Response(JSON.stringify({ error: 'Place ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check cache
    const cached = cache.get(placeId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MIN * 60 * 1000) {
      console.log('Returning cached place details');
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Fetching details for place ID: ${placeId}`);

    const fields = [
      'place_id', 'name', 'formatted_address', 'website', 'url',
      'opening_hours', 'price_level', 'rating', 'user_ratings_total',
      'formatted_phone_number', 'photos'
    ].join(',');

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_API_KEY}`
    );

    const data = await response.json();

    if (!data.result) {
      console.error('Places Details API error:', data);
      return new Response(JSON.stringify({ error: 'Place not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const place = data.result;
    const details: PlaceDetails = {
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address,
      website: place.website,
      url: place.url,
      openingHours: place.opening_hours?.weekday_text,
      priceLevel: place.price_level,
      rating: place.rating,
      reviews: place.user_ratings_total,
      phone: place.formatted_phone_number,
      photos: place.photos?.map((photo: any) => photo.photo_reference) || []
    };

    // Cache results
    cache.set(placeId, {
      data: details,
      timestamp: Date.now()
    });

    return new Response(JSON.stringify(details), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in places-details function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});