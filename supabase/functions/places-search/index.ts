import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
console.log('API Key Status:', GOOGLE_API_KEY ? 'LOADED' : 'MISSING');

const DEFAULT_RADIUS_KM = 10;
const MAX_RESULTS = 20;
const CACHE_TTL_MIN = 15;

// Simple in-memory cache
const cache = new Map();

// Rate limiting cache
const rateLimitCache = new Map<string, number>();
const RATE_LIMIT_REQUESTS_PER_MINUTE = 20;

interface SearchRequest {
  location?: string; // Can be city name, postal code, or address (global)
  lat?: number;
  lng?: number;
  query?: string;
  radiusKm?: number;
}

interface AutocompleteRequest {
  input: string;
  lat?: number;
  lng?: number;
  location?: string;
  radiusKm?: number;
  sessionToken?: string;
}

interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  reviews?: number;
  priceLevel?: number;
  mapsUrl: string;
  photoToken?: string;
  distanceMeters?: number;
}

interface AutocompleteResult {
  placeId: string;
  name: string;
  address: string;
  description: string;
}

async function fetchJSON(url: string) {
  const res = await fetch(url);
  const json = await res.json();
  console.log('GOOGLE RESP:', { url: url.split('?')[0], http: res.status, status: json.status, err: json.error_message });
  return { ok: res.ok, json };
}

async function geocodeIfNeeded(location?: string, lat?: number, lng?: number) {
  if (lat != null && lng != null) return { lat, lng };
  if (!location) return undefined;
  return await geocodeLocation(location);
}

// Global geocoding - no country restriction
async function geocodeLocation(location: string) {
  if (!GOOGLE_API_KEY) throw new Error('Google API key not configured');

  const base = `https://maps.googleapis.com/maps/api/geocode/json`;
  const params = new URLSearchParams({
    address: location,
    key: GOOGLE_API_KEY!,
    language: 'en',
  });

  let { json } = await fetchJSON(`${base}?${params.toString()}`);

  if (json.status === 'OK' && json.results?.length) {
    const loc = json.results[0].geometry.location;
    console.log(`Successfully geocoded "${location}" to: ${loc.lat}, ${loc.lng}`);
    return { lat: loc.lat, lng: loc.lng };
  }

  // Retry with just the first part if location contains comma
  if (location.includes(',')) {
    const firstPart = location.split(',')[0].trim();
    if (firstPart) {
      console.log(`Retrying geocoding with: ${firstPart}`);
      const retry = new URLSearchParams({ address: firstPart, key: GOOGLE_API_KEY!, language: 'en' });
      ({ json } = await fetchJSON(`${base}?${retry.toString()}`));
      if (json.status === 'OK' && json.results?.length) {
        const loc = json.results[0].geometry.location;
        console.log(`Successfully geocoded "${firstPart}" to: ${loc.lat}, ${loc.lng}`);
        return { lat: loc.lat, lng: loc.lng };
      }
    }
  }

  console.error('Geocoding failed:', json.status, json.error_message || 'No error details');
  throw new Error(`Could not geocode location "${location}": ${json.status || 'Unknown error'}`);
}

// Extract location components from address string
function parseLocationFromAddress(address: string): { city: string | null; state: string | null } {
  if (!address) return { city: null, state: null };
  
  // Parse addresses like "123 Main St, Concord, NC 28025" or "Concord, NC"
  const parts = address.split(',').map(p => p.trim());
  
  let city: string | null = null;
  let state: string | null = null;
  
  // Look for state code (2 uppercase letters, possibly followed by ZIP)
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    // Match state code like "NC" or "NC 28025" or "North Carolina"
    const stateMatch = part.match(/^([A-Z]{2})(?:\s+\d{5})?$/);
    if (stateMatch) {
      state = stateMatch[1];
      // City is typically the part before the state
      if (i > 0) {
        city = parts[i - 1];
      }
      break;
    }
    // Try full state names
    const fullStateMatch = part.match(/^(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)/i);
    if (fullStateMatch) {
      state = fullStateMatch[1];
      if (i > 0) {
        city = parts[i - 1];
      }
      break;
    }
  }
  
  return { city, state };
}

// Calculate distance between two coordinates in kilometers
function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lng2-lng1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// Global autocomplete - with strict location filtering
async function autocompletePlaces(req: AutocompleteRequest): Promise<AutocompleteResult[]> {
  const { input, lat, lng, location, radiusKm = DEFAULT_RADIUS_KM, sessionToken } = req;
  if (!GOOGLE_API_KEY) throw new Error('Google API key not configured');
  if (!input?.trim()) return [];

  const coords = await geocodeIfNeeded(location, lat, lng);
  
  // Parse the target location to get city/state for filtering
  const targetLocation = location ? parseLocationFromAddress(location) : null;
  console.log('[Autocomplete] Target location:', location, '-> Parsed:', targetLocation);
  console.log('[Autocomplete] Coordinates:', coords);
  console.log('[Autocomplete] Radius km:', radiusKm);
  
  const params = new URLSearchParams({
    input: input.trim(),
    key: GOOGLE_API_KEY!,
    types: 'establishment',
    language: 'en',
  });
  
  if (coords) {
    params.set('location', `${coords.lat},${coords.lng}`);
    params.set('radius', String(Math.round(radiusKm * 1000)));
    // Use strictbounds to limit results to the specified radius
    params.set('strictbounds', 'true');
  }
  if (sessionToken) params.set('sessiontoken', sessionToken);

  const { json } = await fetchJSON(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`);
  
  if (json.status === 'ZERO_RESULTS') {
    console.log('[Autocomplete] Zero results for:', input);
    
    // If strictbounds returned no results, try without it but filter manually
    if (coords) {
      console.log('[Autocomplete] Retrying without strictbounds...');
      params.delete('strictbounds');
      const { json: retryJson } = await fetchJSON(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`);
      
      if (retryJson.status === 'OK' && retryJson.predictions?.length) {
        // Filter and sort results by location relevance
        const results = filterAndSortByLocation(retryJson.predictions, targetLocation, coords, radiusKm);
        console.log(`[Autocomplete] After filtering: ${results.length} results`);
        return results;
      }
    }
    return [];
  }
  
  if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
    throw new Error(`Autocomplete failed: ${json.status} ${json.error_message || ''}`);
  }

  // Filter and sort results by location relevance
  const results = filterAndSortByLocation(json.predictions || [], targetLocation, coords, radiusKm);
  console.log(`[Autocomplete] Returning ${results.length} filtered/sorted results`);
  
  return results;
}

// Filter and sort autocomplete results by location relevance
function filterAndSortByLocation(
  predictions: any[], 
  targetLocation: { city: string | null; state: string | null } | null,
  coords: { lat: number; lng: number } | undefined,
  radiusKm: number
): AutocompleteResult[] {
  
  const scoredResults = predictions.map((p: any) => {
    const main = p.structured_formatting?.main_text ?? p.description;
    const secondary = p.structured_formatting?.secondary_text ?? '';
    const fullAddress = p.description || '';
    
    // Parse the result's location
    const resultLocation = parseLocationFromAddress(fullAddress);
    
    let priorityScore = 1000; // Default: low priority
    let matchType = 'other';
    
    if (targetLocation?.city && targetLocation?.state) {
      const targetCity = targetLocation.city.toLowerCase().trim();
      const targetState = targetLocation.state.toLowerCase().trim();
      const resultCity = resultLocation.city?.toLowerCase().trim() || '';
      const resultState = resultLocation.state?.toLowerCase().trim() || '';
      
      // Check for same city and state (highest priority)
      if (resultCity === targetCity && resultState === targetState) {
        priorityScore = 0;
        matchType = 'same_city';
      }
      // Same state, different city
      else if (resultState === targetState) {
        priorityScore = 100;
        matchType = 'same_state';
      }
      // Different state (lowest priority)
      else if (resultState && resultState !== targetState) {
        priorityScore = 1000;
        matchType = 'different_state';
      }
    }
    
    console.log(`[Sort] ${main}: ${fullAddress} -> ${matchType} (score: ${priorityScore})`);
    
    return {
      placeId: p.place_id,
      name: main,
      address: secondary,
      description: fullAddress,
      priorityScore,
      matchType,
    };
  });
  
  // Sort by priority score (lower is better)
  scoredResults.sort((a, b) => a.priorityScore - b.priorityScore);
  
  // Log the sorting results
  const sameCityCount = scoredResults.filter(r => r.matchType === 'same_city').length;
  const sameStateCount = scoredResults.filter(r => r.matchType === 'same_state').length;
  const otherCount = scoredResults.filter(r => r.matchType === 'different_state' || r.matchType === 'other').length;
  console.log(`[Sort] Results: ${sameCityCount} same city, ${sameStateCount} same state, ${otherCount} other`);
  
  // Return results, limiting to MAX_RESULTS
  return scoredResults.slice(0, MAX_RESULTS).map(r => ({
    placeId: r.placeId,
    name: r.name,
    address: r.address,
    description: r.description,
  } as AutocompleteResult));
}

async function searchPlaces(lat: number, lng: number, query: string, radiusKm: number): Promise<PlaceResult[]> {
  const radiusMeters = Math.round(radiusKm * 1000);

  // Nearby Search
  const nearbyUrl =
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}` +
    `&radius=${radiusMeters}&type=restaurant&name=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
  let { json } = await fetchJSON(nearbyUrl);

  // Fallback to Text Search
  if (!json.results?.length) {
    console.log('Nearby search returned no results, trying text search');
    const textUrl =
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' restaurant')}` +
      `&location=${lat},${lng}&radius=${radiusMeters}&key=${GOOGLE_API_KEY}`;
    ({ json } = await fetchJSON(textUrl));
  }

  // Handle ZERO_RESULTS gracefully
  if (json.status === 'ZERO_RESULTS') {
    console.log('Search returned zero results for:', query);
    return [];
  }

  if (json.status && json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
    throw new Error(`Places search failed: ${json.status} ${json.error_message || ''}`);
  }
  
  const results = (json.results || []).slice(0, MAX_RESULTS).map((place: any): PlaceResult => ({
    placeId: place.place_id,
    name: place.name,
    address: place.vicinity || place.formatted_address,
    lat: place.geometry.location.lat,
    lng: place.geometry.location.lng,
    rating: place.rating,
    reviews: place.user_ratings_total,
    priceLevel: place.price_level,
    mapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
    photoToken: place.photos?.[0]?.photo_reference,
    distanceMeters: calculateDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng),
  }));
  
  console.log(`Search completed: found ${results.length} places for "${query}"`);
  return results;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lng2-lng1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;
  console.log('HIT PATH:', path);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  // Authenticate user
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.error('Missing Authorization header');
    return new Response(JSON.stringify({ error: 'Unauthorized - Missing authentication' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  
  if (authError || !user) {
    console.error('Authentication failed:', authError?.message);
    return new Response(JSON.stringify({ error: 'Unauthorized - Invalid token' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  console.log('Authenticated user:', user.id);

  // Rate limiting
  const currentMinute = Math.floor(Date.now() / 60000);
  const rateLimitKey = `${user.id}:${currentMinute}`;
  const requestCount = rateLimitCache.get(rateLimitKey) || 0;

  if (requestCount >= RATE_LIMIT_REQUESTS_PER_MINUTE) {
    console.warn(`Rate limit exceeded for user ${user.id}`);
    return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a minute.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  rateLimitCache.set(rateLimitKey, requestCount + 1);

  // Clean old rate limit entries
  const twoMinutesAgo = currentMinute - 2;
  for (const key of rateLimitCache.keys()) {
    const keyMinute = parseInt(key.split(':')[1]);
    if (keyMinute < twoMinutesAgo) {
      rateLimitCache.delete(key);
    }
  }

  try {
    if (path.endsWith('/autocomplete')) {
      console.log('Routing to autocomplete handler');
      const body = await req.json() as AutocompleteRequest;
      console.log('Autocomplete request:', body);
      const cacheKey = `ac:${body.input}:${body.lat ?? ''}:${body.lng ?? ''}:${body.location ?? ''}:${body.radiusKm ?? DEFAULT_RADIUS_KM}`;
      
      const cached = cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MIN * 60 * 1000) {
        console.log('Returning cached autocomplete results');
        return new Response(JSON.stringify(cached.data), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      
      const predictions = await autocompletePlaces(body);
      cache.set(cacheKey, { data: predictions, timestamp: Date.now() });
      
      console.log(`Returning ${predictions.length} autocomplete predictions`);
      return new Response(JSON.stringify(predictions), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Default: search route
    console.log('Routing to search handler');
    const body = await req.json() as SearchRequest;
    console.log('Search request:', body);
    const { location, lat, lng, query = '', radiusKm = DEFAULT_RADIUS_KM } = body;

    const cacheKey = `search:${lat || location}-${lng || ''}-${query}-${radiusKm}`;
    
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MIN * 60 * 1000) {
      console.log('Returning cached search results');
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let searchLat = lat;
    let searchLng = lng;

    // Geocode location if lat/lng not provided
    if (!searchLat || !searchLng) {
      if (!location) {
        return new Response(JSON.stringify({ error: 'Either lat/lng or location is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      try {
        const coords = await geocodeLocation(location);
        searchLat = coords.lat;
        searchLng = coords.lng;
      } catch (error: any) {
        console.error('Geocoding error:', error);
        return new Response(JSON.stringify({ error: `Geocoding failed: ${error.message}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const results = await searchPlaces(searchLat!, searchLng!, query, radiusKm);
    
    // Sort by distance, rating, reviews
    results.sort((a, b) => {
      if (a.distanceMeters && b.distanceMeters) {
        if (a.distanceMeters !== b.distanceMeters) {
          return a.distanceMeters - b.distanceMeters;
        }
      }
      if (a.rating && b.rating && a.rating !== b.rating) {
        return b.rating - a.rating;
      }
      if (a.reviews && b.reviews) {
        return b.reviews - a.reviews;
      }
      return 0;
    });

    cache.set(cacheKey, { data: results, timestamp: Date.now() });

    console.log(`Found ${results.length} restaurants`);
    
    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in places-search function:', error);
    const errorMessage = error?.message ?? 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
