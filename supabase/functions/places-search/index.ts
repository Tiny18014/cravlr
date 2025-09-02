import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
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

  let response = await fetch(`${base}?${params.toString()}`);
  let data = await response.json();

  if (data.status === 'OK' && data.results?.length) {
    const loc = data.results[0].geometry.location;
    console.log(`Successfully geocoded "${zip}" to: ${loc.lat}, ${loc.lng}`);
    return { lat: loc.lat, lng: loc.lng };
  }

  // Retry with city-only if the user passed "City, State" or "ZIP, USA"
  if (zip.includes(',')) {
    const cityOnly = zip.split(',')[0].trim();
    if (cityOnly) {
      console.log(`Retrying geocoding with city only: ${cityOnly}`);
      const retry = new URLSearchParams({ address: cityOnly, key: GOOGLE_API_KEY!, components: 'country:US' });
      response = await fetch(`${base}?${retry.toString()}`);
      data = await response.json();
      if (data.status === 'OK' && data.results?.length) {
        const loc = data.results[0].geometry.location;
        console.log(`Successfully geocoded city "${cityOnly}" to: ${loc.lat}, ${loc.lng}`);
        return { lat: loc.lat, lng: loc.lng };
      }
    }
  }

  console.error('Geocoding failed:', data.status, data.error_message || 'No error details');
  throw new Error(`Could not geocode location "${zip}": ${data.status || 'Unknown error'}`);
}

async function autocompletePlaces(req: AutocompleteRequest): Promise<AutocompleteResult[]> {
  const { input, lat, lng, zip, radiusKm = DEFAULT_RADIUS_KM, sessionToken } = req;
  if (!GOOGLE_API_KEY) throw new Error('Google API key not configured');
  if (!input || input.trim().length < 1) return [];

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

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;
  console.log(`Autocomplete search for: "${input}" near ${coords ? `${coords.lat},${coords.lng}` : 'no location'}`);
  
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Autocomplete API error: ${response.status}`);
  const data = await response.json();

  if (!data.predictions) {
    console.log('No autocomplete predictions returned');
    return [];
  }

  console.log(`Found ${data.predictions.length} autocomplete suggestions`);
  return data.predictions.slice(0, MAX_RESULTS).map((p: any): AutocompleteResult => {
    // Split "Olive Garden, Raleigh, NC" → name="Olive Garden", address="Raleigh, NC"
    const [name, ...rest] = (p.structured_formatting?.main_text ? 
      [p.structured_formatting.main_text, p.structured_formatting.secondary_text] : 
      p.description.split(',').map((s: string) => s.trim()));
    return {
      placeId: p.place_id,
      name: name || p.description,
      address: (rest?.filter(Boolean).join(', ') || ''),
      description: p.description,
    };
  });
}

async function searchPlaces(lat: number, lng: number, query: string, radiusKm: number): Promise<PlaceResult[]> {
  console.log(`Searching places near ${lat},${lng} for query: ${query}, radius: ${radiusKm}km`);
  
  const radiusMeters = radiusKm * 1000;
  
  // Try Nearby Search first with query as keyword
  let response = await fetch(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=restaurant&keyword=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`
  );
  let data = await response.json();
  
  // Fallback to Text Search if no results
  if (!data.results || data.results.length === 0) {
    console.log('Nearby search returned no results, trying text search');
    response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' restaurant')} near ${lat},${lng}&radius=${radiusMeters}&key=${GOOGLE_API_KEY}`
    );
    data = await response.json();
  }
  
  if (!data.results) {
    console.error('Places API error:', data);
    return [];
  }
  
  return data.results.slice(0, MAX_RESULTS).map((place: any): PlaceResult => {
    const photoToken = place.photos?.[0]?.photo_reference;
    return {
      placeId: place.place_id,
      name: place.name,
      address: place.vicinity || place.formatted_address,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      rating: place.rating,
      reviews: place.user_ratings_total,
      priceLevel: place.price_level,
      mapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
      photoToken,
      distanceMeters: place.geometry?.location ? 
        calculateDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng) : undefined
    };
  });
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    if (path.endsWith('/autocomplete')) {
      const body = await req.json() as AutocompleteRequest;
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
    const body = await req.json() as SearchRequest;
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
        return new Response(JSON.stringify({ error: 'Could not geocode location' }), {
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