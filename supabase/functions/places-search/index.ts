import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
console.log('API Key Status:', GOOGLE_API_KEY ? 'LOADED' : 'MISSING');
console.log('API Key Length:', GOOGLE_API_KEY ? GOOGLE_API_KEY.length : 0);

const DEFAULT_RADIUS_KM = 5;
const MAX_RESULTS = 20;
const CACHE_TTL_MIN = 15;

// Simple in-memory cache
const cache = new Map();

interface SearchRequest {
  zip?: string;
  lat?: number;
  lng?: number;
  query?: string;
  radiusKm?: number;
}

interface AutocompleteRequest {
  input: string;
  lat?: number;
  lng?: number;
  zip?: string;
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

// Helper function to fetch and log Google API responses
async function fetchJSON(url: string) {
  const res = await fetch(url);
  const json = await res.json();
  console.log('GOOGLE RESP:', { url, http: res.status, status: json.status, err: json.error_message });
  return { ok: res.ok, json };
}

async function geocodeIfNeeded(zip?: string, lat?: number, lng?: number) {
  if (lat != null && lng != null) return { lat, lng };
  if (!zip) return undefined;
  return await geocodeZip(zip);
}

async function geocodeZip(zip: string) {
  if (!GOOGLE_API_KEY) throw new Error('Google API key not configured');

  // First try as-is, biased to US
  const base = `https://maps.googleapis.com/maps/api/geocode/json`;
  const params = new URLSearchParams({
    address: zip,
    key: GOOGLE_API_KEY!,
    components: 'country:US',
  });

  let { json } = await fetchJSON(`${base}?${params.toString()}`);

  if (json.status === 'OK' && json.results?.length) {
    const loc = json.results[0].geometry.location;
    console.log(`Successfully geocoded "${zip}" to: ${loc.lat}, ${loc.lng}`);
    return { lat: loc.lat, lng: loc.lng };
  }

  // Retry with city-only if the user passed "City, State" or "ZIP, USA"
  if (zip.includes(',')) {
    const cityOnly = zip.split(',')[0].trim();
    if (cityOnly) {
      console.log(`Retrying geocoding with city only: ${cityOnly}`);
      const retry = new URLSearchParams({ address: cityOnly, key: GOOGLE_API_KEY!, components: 'country:US' });
      ({ json } = await fetchJSON(`${base}?${retry.toString()}`));
      if (json.status === 'OK' && json.results?.length) {
        const loc = json.results[0].geometry.location;
        console.log(`Successfully geocoded city "${cityOnly}" to: ${loc.lat}, ${loc.lng}`);
        return { lat: loc.lat, lng: loc.lng };
      }
    }
  }

  console.error('Geocoding failed:', json.status, json.error_message || 'No error details');
  throw new Error(`Could not geocode location "${zip}": ${json.status || 'Unknown error'}`);
}

async function autocompletePlaces(req: AutocompleteRequest): Promise<AutocompleteResult[]> {
  const { input, lat, lng, zip, radiusKm = DEFAULT_RADIUS_KM, sessionToken } = req;
  if (!GOOGLE_API_KEY) throw new Error('Google API key not configured');
  if (!input?.trim()) return [];

  const coords = await geocodeIfNeeded(zip, lat, lng);
  const params = new URLSearchParams({
    input: input.trim(),
    key: GOOGLE_API_KEY!,
    types: 'establishment',
    components: 'country:us',
  });
  if (coords) {
    params.set('location', `${coords.lat},${coords.lng}`);
    params.set('radius', String(Math.round(radiusKm * 1000)));
  }
  if (sessionToken) params.set('sessiontoken', sessionToken);

  const { json } = await fetchJSON(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`);
  if (json.status !== 'OK') throw new Error(`Autocomplete failed: ${json.status} ${json.error_message || ''}`);

  return (json.predictions || []).slice(0, MAX_RESULTS).map((p: any) => {
    const main = p.structured_formatting?.main_text ?? p.description;
    const secondary = p.structured_formatting?.secondary_text ?? '';
    return {
      placeId: p.place_id,
      name: main,
      address: secondary,
      description: p.description,
    } as AutocompleteResult;
  });
}

async function searchPlaces(lat: number, lng: number, query: string, radiusKm: number): Promise<PlaceResult[]> {
  const radiusMeters = Math.round(radiusKm * 1000);

  // Nearby Search: prefer matching name
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

  if (json.status && json.status !== 'OK') {
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
  const R = 6371e3; // Earth's radius in meters
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

  try {
    if (path.endsWith('/autocomplete')) {
      console.log('Routing to autocomplete handler');
      const body = await req.json() as AutocompleteRequest;
      console.log('Autocomplete request:', body);
      const cacheKey = `ac:${body.input}:${body.lat ?? ''}:${body.lng ?? ''}:${body.zip ?? ''}:${body.radiusKm ?? DEFAULT_RADIUS_KM}`;
      
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
    const { zip, lat, lng, query = '', radiusKm = DEFAULT_RADIUS_KM } = body;

    // Generate cache key
    const cacheKey = `search:${lat || zip}-${lng || ''}-${query}-${radiusKm}`;
    
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MIN * 60 * 1000) {
      console.log('Returning cached search results');
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let searchLat = lat;
    let searchLng = lng;

    // Geocode ZIP if lat/lng not provided
    if (!searchLat || !searchLng) {
      if (!zip) {
        return new Response(JSON.stringify({ error: 'Either lat/lng or zip is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      try {
        const coords = await geocodeZip(zip);
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
    
    // Sort by distance (asc), then rating (desc), then reviews (desc)
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

    // Cache results
    cache.set(cacheKey, {
      data: results,
      timestamp: Date.now()
    });

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