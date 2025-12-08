import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
const NOMINATIM_BASE_URL = Deno.env.get('NOMINATIM_BASE_URL') || 'https://nominatim.openstreetmap.org';

// In-memory cache with TTL
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Full normalized location with administrative hierarchy
interface AdminLevel {
  level: string;
  name: string;
  code?: string;
}

interface NormalizedLocation {
  id?: string;
  type: 'area' | 'place' | 'address';
  displayLabel: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  // Full administrative hierarchy
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
  viewport?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  source: 'google_geocoding' | 'google_places' | 'osm_nominatim' | 'manual_map_pick';
  // For places (restaurants)
  providerPlaceId?: string;
  name?: string;
  categories?: string[];
  rating?: number;
  priceLevel?: number;
  userRatingsTotal?: number;
  rawProviderResponse?: any;
}

interface ResolveRequest {
  query: string;
  lat?: number;
  lng?: number;
  includeRestaurants?: boolean;
}

// Extract full location hierarchy from Google address_components
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
function extractNominatimAddress(item: any): {
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
  const address = item.address || {};
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
  if (address.city || address.town || address.village || address.municipality) {
    result.city = address.city || address.town || address.village || address.municipality;
    hierarchy.push({ level: 'city', name: result.city });
  }
  if (address.suburb) {
    result.suburb = address.suburb;
    hierarchy.push({ level: 'suburb', name: address.suburb });
  }
  if (address.neighbourhood || address.hamlet) {
    result.neighborhood = address.neighbourhood || address.hamlet;
    hierarchy.push({ level: 'neighborhood', name: result.neighborhood });
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

  result.adminHierarchy = hierarchy;
  return result;
}

// Google Places API - fetch area suggestions
async function fetchGoogleAreaSuggestions(query: string, biasLat?: number, biasLng?: number): Promise<NormalizedLocation[]> {
  if (!GOOGLE_API_KEY) {
    console.log('Google API key not configured, skipping Google areas');
    return [];
  }

  const params = new URLSearchParams({
    input: query,
    key: GOOGLE_API_KEY,
    types: '(regions)',
    language: 'en',
  });

  if (biasLat !== undefined && biasLng !== undefined) {
    params.set('location', `${biasLat},${biasLng}`);
    params.set('radius', '50000');
  }

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
  console.log('📍 Google: Fetching area suggestions for:', query);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google area autocomplete error:', data.status, data.error_message);
      return [];
    }

    const results: NormalizedLocation[] = [];

    for (const prediction of (data.predictions || []).slice(0, 5)) {
      const detailsParams = new URLSearchParams({
        place_id: prediction.place_id,
        key: GOOGLE_API_KEY,
        fields: 'geometry,formatted_address,address_components,name,types',
      });

      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?${detailsParams}`;
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      if (detailsData.status === 'OK' && detailsData.result) {
        const place = detailsData.result;
        const components = extractGoogleAddressComponents(place.address_components);

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
          source: 'google_geocoding',
          adminHierarchy: components.adminHierarchy,
          ...components,
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Google area fetch error:', error);
    return [];
  }
}

// Google Places API - fetch restaurant/POI suggestions
async function fetchGooglePlaceSuggestions(query: string, biasLat?: number, biasLng?: number): Promise<NormalizedLocation[]> {
  if (!GOOGLE_API_KEY) {
    console.log('Google API key not configured, skipping Google places');
    return [];
  }

  const params = new URLSearchParams({
    input: query,
    key: GOOGLE_API_KEY,
    types: 'establishment',
    language: 'en',
  });

  if (biasLat !== undefined && biasLng !== undefined) {
    params.set('location', `${biasLat},${biasLng}`);
    params.set('radius', '25000');
  }

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
  console.log('📍 Google: Fetching place suggestions for:', query);

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google place autocomplete error:', data.status, data.error_message);
      return [];
    }

    const results: NormalizedLocation[] = [];

    for (const prediction of (data.predictions || []).slice(0, 5)) {
      const detailsParams = new URLSearchParams({
        place_id: prediction.place_id,
        key: GOOGLE_API_KEY,
        fields: 'geometry,formatted_address,address_components,name,types,rating,price_level,user_ratings_total',
      });

      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?${detailsParams}`;
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      if (detailsData.status === 'OK' && detailsData.result) {
        const place = detailsData.result;
        const types = place.types || [];
        
        const foodTypes = ['restaurant', 'cafe', 'bakery', 'bar', 'food', 'meal_takeaway', 'meal_delivery', 'night_club', 'food_court'];
        const isFoodPlace = types.some((t: string) => foodTypes.some(ft => t.includes(ft)));
        
        if (isFoodPlace || types.includes('establishment')) {
          const components = extractGoogleAddressComponents(place.address_components);

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
            userRatingsTotal: place.user_ratings_total,
            source: 'google_places',
            adminHierarchy: components.adminHierarchy,
            ...components,
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Google place fetch error:', error);
    return [];
  }
}

// Nominatim/OSM fallback - fetch area suggestions
async function fetchNominatimSuggestions(query: string, biasLat?: number, biasLng?: number): Promise<NormalizedLocation[]> {
  console.log('📍 Nominatim: Fetching suggestions for:', query);

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: '8',
      'accept-language': 'en',
    });

    // Add location bias if provided
    if (biasLat !== undefined && biasLng !== undefined) {
      params.set('viewbox', `${biasLng - 1},${biasLat + 1},${biasLng + 1},${biasLat - 1}`);
      params.set('bounded', '0');
    }

    const url = `${NOMINATIM_BASE_URL}/search?${params}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CravlrApp/1.0',
      }
    });

    if (!response.ok) {
      console.error('Nominatim request failed:', response.status);
      return [];
    }

    const data = await response.json();
    const results: NormalizedLocation[] = [];

    for (const item of data.slice(0, 5)) {
      const components = extractNominatimAddress(item);
      const osmType = item.osm_type;
      const isPlace = item.class === 'amenity' || item.class === 'shop' || item.class === 'tourism';

      results.push({
        type: isPlace ? 'place' : 'area',
        displayLabel: item.display_name?.split(',')[0] || item.name || 'Unknown',
        formattedAddress: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        providerPlaceId: `osm:${osmType}:${item.osm_id}`,
        name: item.name,
        categories: item.type ? [item.type] : [],
        source: 'osm_nominatim',
        adminHierarchy: components.adminHierarchy,
        viewport: item.boundingbox ? {
          northeast: { lat: parseFloat(item.boundingbox[1]), lng: parseFloat(item.boundingbox[3]) },
          southwest: { lat: parseFloat(item.boundingbox[0]), lng: parseFloat(item.boundingbox[2]) },
        } : undefined,
        ...components,
      });
    }

    return results;
  } catch (error) {
    console.error('Nominatim fetch error:', error);
    return [];
  }
}

// Persist location to database
async function persistLocation(supabaseAdmin: any, location: NormalizedLocation): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('locations')
      .upsert({
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
        raw_provider_response: location.rawProviderResponse,
      }, {
        onConflict: 'lat,lng',
        ignoreDuplicates: false,
      })
      .select('id')
      .single();

    if (error) {
      console.log('Location persist note:', error.message);
      return null;
    }
    return data?.id;
  } catch (err) {
    console.error('Location persist error:', err);
    return null;
  }
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

    // Try Google first (primary provider)
    let areas: NormalizedLocation[] = [];
    let places: NormalizedLocation[] = [];
    let usedFallback = false;

    if (GOOGLE_API_KEY) {
      const [googleAreas, googlePlaces] = await Promise.all([
        fetchGoogleAreaSuggestions(query, lat, lng),
        includeRestaurants ? fetchGooglePlaceSuggestions(query, lat, lng) : Promise.resolve([]),
      ]);
      areas = googleAreas;
      places = googlePlaces;
    }

    // If Google failed or returned no results, try Nominatim fallback
    if (areas.length === 0 && places.length === 0) {
      console.log('⚠️ Google returned no results, trying Nominatim fallback');
      const nominatimResults = await fetchNominatimSuggestions(query, lat, lng);
      areas = nominatimResults.filter(r => r.type === 'area');
      places = nominatimResults.filter(r => r.type === 'place');
      usedFallback = true;
    }

    // Combine results: areas first, then places
    const suggestions = [...areas, ...places];

    const responseData = {
      data: suggestions,
      error: null,
      meta: {
        total: suggestions.length,
        areaCount: areas.length,
        placeCount: places.length,
        provider: usedFallback ? 'nominatim' : 'google',
      }
    };

    // Cache results
    cache.set(cacheKey, { data: responseData, timestamp: Date.now() });

    console.log(`✅ Returning ${suggestions.length} suggestions (${areas.length} areas, ${places.length} places, provider: ${usedFallback ? 'nominatim' : 'google'})`);

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