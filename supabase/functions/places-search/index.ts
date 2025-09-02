import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  cuisine?: string;
  radiusKm?: number;
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

async function geocodeZip(zip: string) {
  console.log(`Geocoding location: ${zip}`);
  
  if (!GOOGLE_API_KEY) {
    console.error('Google API key is not set');
    throw new Error('Google API key not configured');
  }
  
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zip)}&key=${GOOGLE_API_KEY}`
  );
  
  if (!response.ok) {
    console.error('Geocoding API request failed:', response.status, response.statusText);
    throw new Error(`Geocoding API error: ${response.status}`);
  }
  
  const data = await response.json();
  console.log('Geocoding response:', JSON.stringify(data, null, 2));
  
  if (data.status === 'OK' && data.results?.length > 0) {
    const location = data.results[0].geometry.location;
    console.log(`Successfully geocoded to: ${location.lat}, ${location.lng}`);
    return { lat: location.lat, lng: location.lng };
  }
  
  // Handle specific error cases
  if (data.status === 'ZERO_RESULTS') {
    // Try with just the city name if original search failed
    const cityOnly = zip.split(',')[0].trim();
    if (cityOnly !== zip) {
      console.log(`Retrying with city only: ${cityOnly}`);
      const retryResponse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cityOnly + ', NC')}&key=${GOOGLE_API_KEY}`
      );
      
      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        if (retryData.status === 'OK' && retryData.results?.length > 0) {
          const location = retryData.results[0].geometry.location;
          console.log(`Successfully geocoded city to: ${location.lat}, ${location.lng}`);
          return { lat: location.lat, lng: location.lng };
        }
      }
    }
  }
  
  console.error('Geocoding failed:', data.status, data.error_message || 'No error message');
  throw new Error(`Could not geocode location "${zip}": ${data.status || 'Unknown error'}`);
}

async function searchPlaces(lat: number, lng: number, cuisine: string, radiusKm: number): Promise<PlaceResult[]> {
  console.log(`Searching places near ${lat},${lng} for cuisine: ${cuisine}, radius: ${radiusKm}km`);
  
  const radiusMeters = radiusKm * 1000;
  
  // Try Nearby Search first
  let response = await fetch(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=restaurant&keyword=${cuisine}&key=${GOOGLE_API_KEY}`
  );
  let data = await response.json();
  
  // Fallback to Text Search if no results
  if (!data.results || data.results.length === 0) {
    console.log('Nearby search returned no results, trying text search');
    response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${cuisine} restaurant near ${lat},${lng}&radius=${radiusMeters}&key=${GOOGLE_API_KEY}`
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
      mapsUrl: `https://maps.google.com/?cid=${place.place_id}`,
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

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const body: SearchRequest = await req.json();
    const { zip, lat, lng, cuisine = '', radiusKm = DEFAULT_RADIUS_KM } = body;

    // Generate cache key
    const cacheKey = `${lat || zip}-${lng || ''}-${cuisine}-${radiusKm}`;
    
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MIN * 60 * 1000) {
      console.log('Returning cached results');
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
      } catch (error) {
        console.error('Geocoding error:', error);
        return new Response(JSON.stringify({ error: 'Could not geocode ZIP code' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const results = await searchPlaces(searchLat!, searchLng!, cuisine, radiusKm);
    
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

  } catch (error) {
    console.error('Error in places-search function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});