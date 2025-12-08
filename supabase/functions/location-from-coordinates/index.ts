import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

// In-memory cache for reverse geocoding
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour (coordinates don't change)

interface NormalizedLocation {
  lat: number;
  lng: number;
  displayLabel: string;
  formattedAddress: string;
  countryName?: string;
  countryCode?: string;
  stateOrRegion?: string;
  cityOrLocality?: string;
  postalCode?: string;
  viewport?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
}

interface ReverseGeocodeRequest {
  lat: number;
  lng: number;
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

// Build a display label from components
function buildDisplayLabel(components: ReturnType<typeof extractAddressComponents>): string {
  const parts: string[] = [];
  
  if (components.cityOrLocality) {
    parts.push(components.cityOrLocality);
  }
  if (components.stateOrRegion) {
    parts.push(components.stateOrRegion);
  }
  if (components.countryName && parts.length === 0) {
    parts.push(components.countryName);
  }
  
  return parts.join(', ') || 'Unknown Location';
}

serve(async (req) => {
  console.log('📍 Location from coordinates endpoint called');

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

    const body: ReverseGeocodeRequest = await req.json();
    const { lat, lng } = body;

    // Validate coordinates
    if (lat === undefined || lng === undefined) {
      return new Response(
        JSON.stringify({ error: 'lat and lng are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Round coordinates for caching (5 decimal places = ~1m precision)
    const latRounded = Math.round(lat * 100000) / 100000;
    const lngRounded = Math.round(lng * 100000) / 100000;
    const cacheKey = `reverse:${latRounded}:${lngRounded}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      console.log('📦 Returning cached reverse geocode result');
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!GOOGLE_API_KEY) {
      console.error('❌ Google Places API key not configured');
      return new Response(
        JSON.stringify({ error: 'Geocoding service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Google Reverse Geocoding API
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}&language=en`;
    
    console.log('🔍 Reverse geocoding:', { lat, lng });

    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.error('❌ Reverse geocoding failed:', data.status, data.error_message);
      return new Response(
        JSON.stringify({ 
          error: 'Could not determine location from coordinates',
          details: data.error_message || 'No results found'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the most appropriate result (prefer locality/city level)
    let bestResult = data.results[0];
    for (const result of data.results) {
      const types = result.types || [];
      if (types.includes('locality') || types.includes('postal_town')) {
        bestResult = result;
        break;
      }
      if (types.includes('sublocality') || types.includes('neighborhood')) {
        bestResult = result;
      }
    }

    const components = extractAddressComponents(bestResult.address_components);
    const displayLabel = buildDisplayLabel(components);

    const location: NormalizedLocation = {
      lat,
      lng,
      displayLabel,
      formattedAddress: bestResult.formatted_address,
      viewport: bestResult.geometry?.viewport ? {
        northeast: bestResult.geometry.viewport.northeast,
        southwest: bestResult.geometry.viewport.southwest,
      } : undefined,
      ...components,
    };

    const responseData = {
      data: location,
      error: null,
    };

    // Cache result
    cache.set(cacheKey, { data: responseData, timestamp: Date.now() });

    console.log('✅ Reverse geocoding successful:', displayLabel);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Reverse geocoding error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', data: null }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
