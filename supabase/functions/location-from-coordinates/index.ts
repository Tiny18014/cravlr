import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
const NOMINATIM_BASE_URL = Deno.env.get('NOMINATIM_BASE_URL') || 'https://nominatim.openstreetmap.org';

// In-memory cache for reverse geocoding
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for coordinates

interface AdminLevel {
  level: string;
  name: string;
  code?: string;
}

interface NormalizedLocation {
  id?: string;
  type: 'area';
  lat: number;
  lng: number;
  displayLabel: string;
  formattedAddress: string;
  continent?: string;
  countryName?: string;
  countryCode?: string;
  region?: string;
  county?: string;
  city?: string;
  suburb?: string;
  neighborhood?: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  adminHierarchy: AdminLevel[];
  source: 'google_geocoding' | 'osm_nominatim' | 'manual_map_pick';
  viewport?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
}

interface ReverseGeocodeRequest {
  lat: number;
  lng: number;
  source?: 'gps' | 'map_pick';
}

// Extract full hierarchy from Google address_components
function extractGoogleAddressComponents(components: any[]): {
  adminHierarchy: AdminLevel[];
  continent?: string;
  countryName?: string;
  countryCode?: string;
  region?: string;
  county?: string;
  city?: string;
  suburb?: string;
  neighborhood?: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
} {
  const hierarchy: AdminLevel[] = [];
  const result: any = {};
  
  for (const component of components || []) {
    const types = component.types || [];
    
    if (types.includes('country')) {
      result.countryName = component.long_name;
      result.countryCode = component.short_name;
      hierarchy.push({ level: 'country', name: component.long_name, code: component.short_name });
    }
    if (types.includes('administrative_area_level_1')) {
      result.region = component.long_name;
      hierarchy.push({ level: 'region', name: component.long_name });
    }
    if (types.includes('administrative_area_level_2')) {
      result.county = component.long_name;
      hierarchy.push({ level: 'county', name: component.long_name });
    }
    if (types.includes('locality')) {
      result.city = component.long_name;
      hierarchy.push({ level: 'city', name: component.long_name });
    }
    if (types.includes('postal_town') && !result.city) {
      result.city = component.long_name;
      hierarchy.push({ level: 'city', name: component.long_name });
    }
    if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
      result.suburb = component.long_name;
      hierarchy.push({ level: 'suburb', name: component.long_name });
    }
    if (types.includes('neighborhood')) {
      result.neighborhood = component.long_name;
      hierarchy.push({ level: 'neighborhood', name: component.long_name });
    }
    if (types.includes('route')) {
      result.street = component.long_name;
      hierarchy.push({ level: 'street', name: component.long_name });
    }
    if (types.includes('street_number')) {
      result.houseNumber = component.long_name;
    }
    if (types.includes('postal_code')) {
      result.postalCode = component.long_name;
    }
  }
  
  result.adminHierarchy = hierarchy;
  return result;
}

// Extract location from Nominatim response
function extractNominatimAddress(data: any): {
  adminHierarchy: AdminLevel[];
  displayLabel: string;
  formattedAddress: string;
  continent?: string;
  countryName?: string;
  countryCode?: string;
  region?: string;
  county?: string;
  city?: string;
  suburb?: string;
  neighborhood?: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
} {
  const address = data.address || {};
  const hierarchy: AdminLevel[] = [];
  const result: any = {};

  if (address.country) {
    result.countryName = address.country;
    result.countryCode = address.country_code?.toUpperCase();
    hierarchy.push({ level: 'country', name: address.country, code: result.countryCode });
  }
  if (address.state) {
    result.region = address.state;
    hierarchy.push({ level: 'region', name: address.state });
  }
  if (address.county) {
    result.county = address.county;
    hierarchy.push({ level: 'county', name: address.county });
  }
  
  const cityValue = address.city || address.town || address.village || address.municipality || address.hamlet;
  if (cityValue) {
    result.city = cityValue;
    hierarchy.push({ level: 'city', name: cityValue });
  }
  
  if (address.suburb) {
    result.suburb = address.suburb;
    hierarchy.push({ level: 'suburb', name: address.suburb });
  }
  if (address.neighbourhood) {
    result.neighborhood = address.neighbourhood;
    hierarchy.push({ level: 'neighborhood', name: address.neighbourhood });
  }
  if (address.road) {
    result.street = address.road;
    hierarchy.push({ level: 'street', name: address.road });
  }
  if (address.house_number) {
    result.houseNumber = address.house_number;
  }
  if (address.postcode) {
    result.postalCode = address.postcode;
  }

  // Build display label - prefer most specific location
  const labelParts: string[] = [];
  if (result.neighborhood) labelParts.push(result.neighborhood);
  else if (result.suburb) labelParts.push(result.suburb);
  else if (result.city) labelParts.push(result.city);
  if (result.region && labelParts.length > 0) labelParts.push(result.region);
  if (result.countryName && labelParts.length === 0) labelParts.push(result.countryName);

  result.displayLabel = labelParts.join(', ') || 'Unknown Location';
  result.formattedAddress = data.display_name || result.displayLabel;
  result.adminHierarchy = hierarchy;
  
  return result;
}

// Build display label from components
function buildDisplayLabel(components: ReturnType<typeof extractGoogleAddressComponents>): string {
  const parts: string[] = [];
  
  // Prefer most specific to least specific
  if (components.neighborhood) {
    parts.push(components.neighborhood);
  } else if (components.suburb) {
    parts.push(components.suburb);
  }
  
  if (components.city) {
    parts.push(components.city);
  }
  
  if (components.region && parts.length > 0 && parts.length < 3) {
    parts.push(components.region);
  }
  
  if (parts.length === 0 && components.countryName) {
    parts.push(components.countryName);
  }
  
  return parts.join(', ') || 'Unknown Location';
}

// Google reverse geocoding
async function googleReverseGeocode(lat: number, lng: number): Promise<NormalizedLocation | null> {
  if (!GOOGLE_API_KEY) {
    console.log('Google API key not configured');
    return null;
  }

  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}&language=en`;
  console.log('🔍 Google: Reverse geocoding:', { lat, lng });

  try {
    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.error('Google reverse geocoding failed:', data.status, data.error_message);
      return null;
    }

    // Find the most appropriate result - prefer neighborhood/sublocality, then locality
    let bestResult = data.results[0];
    for (const result of data.results) {
      const types = result.types || [];
      if (types.includes('neighborhood') || types.includes('sublocality')) {
        bestResult = result;
        break;
      }
      if (types.includes('locality') || types.includes('postal_town')) {
        bestResult = result;
      }
    }

    const components = extractGoogleAddressComponents(bestResult.address_components);
    const displayLabel = buildDisplayLabel(components);

    return {
      type: 'area',
      lat,
      lng,
      displayLabel,
      formattedAddress: bestResult.formatted_address,
      viewport: bestResult.geometry?.viewport ? {
        northeast: bestResult.geometry.viewport.northeast,
        southwest: bestResult.geometry.viewport.southwest,
      } : undefined,
      source: 'google_geocoding',
      ...components,
    };
  } catch (error) {
    console.error('Google reverse geocode error:', error);
    return null;
  }
}

// Nominatim reverse geocoding (fallback)
async function nominatimReverseGeocode(lat: number, lng: number): Promise<NormalizedLocation | null> {
  console.log('🔍 Nominatim: Reverse geocoding:', { lat, lng });

  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      format: 'json',
      addressdetails: '1',
      zoom: '18',
      'accept-language': 'en',
    });

    const url = `${NOMINATIM_BASE_URL}/reverse?${params}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CravlrApp/1.0',
      }
    });

    if (!response.ok) {
      console.error('Nominatim request failed:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.error) {
      console.error('Nominatim error:', data.error);
      return null;
    }

    const extracted = extractNominatimAddress(data);

    return {
      type: 'area',
      lat,
      lng,
      displayLabel: extracted.displayLabel,
      formattedAddress: extracted.formattedAddress,
      source: 'osm_nominatim',
      adminHierarchy: extracted.adminHierarchy,
      countryName: extracted.countryName,
      countryCode: extracted.countryCode,
      region: extracted.region,
      county: extracted.county,
      city: extracted.city,
      suburb: extracted.suburb,
      neighborhood: extracted.neighborhood,
      street: extracted.street,
      houseNumber: extracted.houseNumber,
      postalCode: extracted.postalCode,
      viewport: data.boundingbox ? {
        northeast: { lat: parseFloat(data.boundingbox[1]), lng: parseFloat(data.boundingbox[3]) },
        southwest: { lat: parseFloat(data.boundingbox[0]), lng: parseFloat(data.boundingbox[2]) },
      } : undefined,
    };
  } catch (error) {
    console.error('Nominatim reverse geocode error:', error);
    return null;
  }
}

// Persist location to database
async function persistLocation(supabaseAdmin: any, location: NormalizedLocation, isFromGps: boolean, userId: string): Promise<string | null> {
  try {
    // Insert or update location
    const { data: locationData, error: locationError } = await supabaseAdmin
      .from('locations')
      .insert({
        lat: location.lat,
        lng: location.lng,
        formatted_address: location.formattedAddress,
        place_label: location.displayLabel,
        continent: location.continent,
        country_name: location.countryName,
        country_code: location.countryCode,
        region: location.region,
        county: location.county,
        city: location.city,
        suburb: location.suburb,
        neighborhood: location.neighborhood,
        street: location.street,
        house_number: location.houseNumber,
        postal_code: location.postalCode,
        admin_hierarchy: location.adminHierarchy,
        source: location.source,
      })
      .select('id')
      .single();

    if (locationError) {
      console.log('Location insert note:', locationError.message);
      return null;
    }

    const locationId = locationData?.id;
    if (!locationId) return null;

    // Update user's current location
    await supabaseAdmin
      .from('user_current_locations')
      .upsert({
        user_id: userId,
        location_id: locationId,
        is_from_gps: isFromGps,
      }, {
        onConflict: 'user_id',
      });

    return locationId;
  } catch (err) {
    console.error('Location persist error:', err);
    return null;
  }
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
    const { lat, lng, source = 'gps' } = body;

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

    // Round coordinates for caching (6 decimal places = ~10cm precision)
    const latRounded = Math.round(lat * 1000000) / 1000000;
    const lngRounded = Math.round(lng * 1000000) / 1000000;
    const cacheKey = `reverse:${latRounded}:${lngRounded}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      console.log('📦 Returning cached reverse geocode result');
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Try Google first
    let location = await googleReverseGeocode(lat, lng);
    let usedFallback = false;

    // Fallback to Nominatim if Google fails
    if (!location) {
      console.log('⚠️ Google failed, trying Nominatim fallback');
      location = await nominatimReverseGeocode(lat, lng);
      usedFallback = true;
    }

    if (!location) {
      return new Response(
        JSON.stringify({ 
          error: 'Could not determine location from coordinates',
          data: null,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Override source if map pick
    if (source === 'map_pick') {
      location.source = 'manual_map_pick';
    }

    // Persist location (non-blocking)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    persistLocation(supabaseAdmin, location, source === 'gps', user.id).catch(err => {
      console.error('Background persist error:', err);
    });

    const responseData = {
      data: location,
      error: null,
      meta: {
        provider: usedFallback ? 'nominatim' : 'google',
      }
    };

    // Cache result
    cache.set(cacheKey, { data: responseData, timestamp: Date.now() });

    console.log('✅ Reverse geocoding successful:', location.displayLabel, `(provider: ${usedFallback ? 'nominatim' : 'google'})`);

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