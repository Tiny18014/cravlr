import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

// In-memory cache with TTL
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface NormalizedLocation {
  type: 'area' | 'place';
  displayLabel: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  countryName?: string;
  countryCode?: string;
  stateOrRegion?: string;
  cityOrLocality?: string;
  postalCode?: string;
  viewport?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  // For places (restaurants)
  providerPlaceId?: string;
  name?: string;
  categories?: string[];
  rating?: number;
  priceLevel?: number;
}

interface ResolveRequest {
  query: string;
  lat?: number;
  lng?: number;
  includeRestaurants?: boolean;
}

// Extract location components from Google address_components
function extractAddressComponents(components: any[]): {
  countryName?: string;
  countryCode?: string;
  stateOrRegion?: string;
  cityOrLocality?: string;
  postalCode?: string;
} {
  const result: any = {};
  
  for (const component of components || []) {
    const types = component.types || [];
    
    if (types.includes('country')) {
      result.countryName = component.long_name;
      result.countryCode = component.short_name;
    }
    if (types.includes('administrative_area_level_1')) {
      result.stateOrRegion = component.long_name;
    }
    if (types.includes('locality') || types.includes('sublocality') || types.includes('postal_town')) {
      if (!result.cityOrLocality) {
        result.cityOrLocality = component.long_name;
      }
    }
    if (types.includes('postal_code')) {
      result.postalCode = component.long_name;
    }
  }
  
  return result;
}

// Fetch area suggestions (cities, regions, neighborhoods)
async function fetchAreaSuggestions(query: string, biasLat?: number, biasLng?: number): Promise<NormalizedLocation[]> {
  if (!GOOGLE_API_KEY) {
    console.error('Google API key not configured');
    return [];
  }

  const params = new URLSearchParams({
    input: query,
    key: GOOGLE_API_KEY,
    types: '(regions)', // Cities, states, countries, etc.
    language: 'en',
  });

  // Add location bias if coordinates provided
  if (biasLat !== undefined && biasLng !== undefined) {
    params.set('location', `${biasLat},${biasLng}`);
    params.set('radius', '50000'); // 50km bias radius
  }

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
  console.log('Fetching area suggestions:', query);

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.error('Area autocomplete error:', data.status, data.error_message);
    return [];
  }

  const results: NormalizedLocation[] = [];

  for (const prediction of data.predictions || []) {
    // Get place details to extract full address components
    const detailsParams = new URLSearchParams({
      place_id: prediction.place_id,
      key: GOOGLE_API_KEY,
      fields: 'geometry,formatted_address,address_components,name',
    });

    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?${detailsParams}`;
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (detailsData.status === 'OK' && detailsData.result) {
      const place = detailsData.result;
      const components = extractAddressComponents(place.address_components);

      results.push({
        type: 'area',
        displayLabel: prediction.structured_formatting?.main_text || place.name,
        formattedAddress: place.formatted_address,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        viewport: place.geometry.viewport ? {
          northeast: place.geometry.viewport.northeast,
          southwest: place.geometry.viewport.southwest,
        } : undefined,
        providerPlaceId: prediction.place_id,
        ...components,
      });
    }
  }

  return results.slice(0, 5);
}

// Fetch restaurant/food place suggestions
async function fetchPlaceSuggestions(query: string, biasLat?: number, biasLng?: number): Promise<NormalizedLocation[]> {
  if (!GOOGLE_API_KEY) {
    console.error('Google API key not configured');
    return [];
  }

  const params = new URLSearchParams({
    input: query,
    key: GOOGLE_API_KEY,
    types: 'establishment',
    language: 'en',
  });

  // Add location bias if coordinates provided
  if (biasLat !== undefined && biasLng !== undefined) {
    params.set('location', `${biasLat},${biasLng}`);
    params.set('radius', '25000'); // 25km radius for restaurants
  }

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
  console.log('Fetching place suggestions:', query);

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.error('Place autocomplete error:', data.status, data.error_message);
    return [];
  }

  const results: NormalizedLocation[] = [];

  // Get details for food-related places
  for (const prediction of (data.predictions || []).slice(0, 5)) {
    const detailsParams = new URLSearchParams({
      place_id: prediction.place_id,
      key: GOOGLE_API_KEY,
      fields: 'geometry,formatted_address,address_components,name,types,rating,price_level',
    });

    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?${detailsParams}`;
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (detailsData.status === 'OK' && detailsData.result) {
      const place = detailsData.result;
      const types = place.types || [];
      
      // Filter for food-related establishments
      const foodTypes = ['restaurant', 'cafe', 'bakery', 'bar', 'food', 'meal_takeaway', 'meal_delivery'];
      const isFoodPlace = types.some((t: string) => foodTypes.some(ft => t.includes(ft)));
      
      if (isFoodPlace || types.includes('establishment')) {
        const components = extractAddressComponents(place.address_components);

        results.push({
          type: 'place',
          displayLabel: place.name,
          formattedAddress: place.formatted_address,
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          providerPlaceId: prediction.place_id,
          name: place.name,
          categories: types,
          rating: place.rating,
          priceLevel: place.price_level,
          ...components,
        });
      }
    }
  }

  return results;
}

serve(async (req) => {
  console.log('📍 Location resolve endpoint called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
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

    const body: ResolveRequest = await req.json();
    const { query, lat, lng, includeRestaurants = true } = body;

    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ data: [], error: null, meta: { total: 0 } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const normalizedQuery = query.trim().toLowerCase();

    // Check cache
    const cacheKey = `resolve:${normalizedQuery}:${lat ?? ''}:${lng ?? ''}:${includeRestaurants}`;
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      console.log('📦 Returning cached results');
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch both area and place suggestions in parallel
    const [areas, places] = await Promise.all([
      fetchAreaSuggestions(query, lat, lng),
      includeRestaurants ? fetchPlaceSuggestions(query, lat, lng) : Promise.resolve([]),
    ]);

    // Combine results: areas first, then places
    const suggestions = [...areas, ...places];

    const responseData = {
      data: suggestions,
      error: null,
      meta: {
        total: suggestions.length,
        areaCount: areas.length,
        placeCount: places.length,
      }
    };

    // Cache results
    cache.set(cacheKey, { data: responseData, timestamp: Date.now() });

    console.log(`✅ Returning ${suggestions.length} suggestions (${areas.length} areas, ${places.length} places)`);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Location resolve error:', error);
    return new Response(
      JSON.stringify({ data: [], error: error.message, meta: { total: 0 } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
