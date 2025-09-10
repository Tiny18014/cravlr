import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

if (!GOOGLE_API_KEY) {
  console.error('GOOGLE_PLACES_API_KEY is not configured');
}

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL_MIN = 30;

interface AutocompleteResult {
  description: string;
  placeId: string;
  city: string;
  state: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const { input } = await req.json();

    if (!GOOGLE_API_KEY) {
      console.error('Google Places API key not configured');
      return new Response(JSON.stringify({ error: 'Places API not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!input || input.length < 2) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check cache
    const cacheKey = `autocomplete_${input.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MIN * 60 * 1000) {
      console.log('Returning cached autocomplete results');
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Fetching autocomplete for: ${input}`);

    // Use Google Places Autocomplete API with US restriction and city/locality types
    const autocompleteUrl = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    autocompleteUrl.searchParams.set('input', input);
    autocompleteUrl.searchParams.set('key', GOOGLE_API_KEY!);
    autocompleteUrl.searchParams.set('components', 'country:us'); // Restrict to US only
    autocompleteUrl.searchParams.set('types', '(cities)'); // Only cities
    autocompleteUrl.searchParams.set('language', 'en');

    const response = await fetch(autocompleteUrl.toString());
    
    if (!response.ok) {
      console.error('Google Places API HTTP error:', response.status, response.statusText);
      return new Response(JSON.stringify({ error: 'Places API request failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const data = await response.json();

    if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message);
      return new Response(JSON.stringify({ error: `Places API error: ${data.status}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!data.predictions) {
      console.log('No predictions returned from Places API');
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Process results to extract city and state
    const results: AutocompleteResult[] = data.predictions.map((prediction: any) => {
      const terms = prediction.terms || [];
      const description = prediction.description;
      
      // Extract city and state from the description
      // Format is usually "City, State, Country" or "City, State"
      const parts = description.split(', ');
      let city = '';
      let state = '';
      
      if (parts.length >= 2) {
        city = parts[0];
        state = parts[1];
        
        // Handle state abbreviations and full names
        if (state.includes('USA')) {
          state = parts[parts.length - 2]; // Get the state before "USA"
        }
      }

      return {
        description,
        placeId: prediction.place_id,
        city: city.trim(),
        state: state.trim()
      };
    }).filter((result: AutocompleteResult) => 
      result.city && result.state && !result.state.includes('USA')
    );

    // Cache results
    cache.set(cacheKey, {
      data: results,
      timestamp: Date.now()
    });

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in places-autocomplete function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});