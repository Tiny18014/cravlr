import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL_MIN = 30;

interface AutocompleteResult {
  description: string;
  placeId: string;
  city: string;
  state: string; // For backward compatibility - now contains region/state
  country?: string;
  countryCode?: string;
}

serve(async (req) => {
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

    const { input } = await req.json();

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

    // Use Google Places Autocomplete API - NO country restriction for global support
    const autocompleteUrl = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    autocompleteUrl.searchParams.set('input', input);
    autocompleteUrl.searchParams.set('key', GOOGLE_API_KEY!);
    autocompleteUrl.searchParams.set('types', '(regions)'); // Cities, regions, countries
    autocompleteUrl.searchParams.set('language', 'en');

    const response = await fetch(autocompleteUrl.toString());
    const data = await response.json();

    if (!data.predictions) {
      console.error('Places Autocomplete API error:', data);
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Process results to extract city, state/region, and country
    const results: AutocompleteResult[] = data.predictions.map((prediction: any) => {
      const description = prediction.description;
      const terms = prediction.terms || [];
      
      // Extract components from terms
      // Terms are ordered from most specific to least specific
      // e.g., ["Kathmandu", "Bagmati Province", "Nepal"]
      let city = '';
      let state = '';
      let country = '';
      
      if (terms.length >= 1) {
        city = terms[0].value;
      }
      if (terms.length >= 2) {
        // Could be state/region or country
        state = terms[1].value;
      }
      if (terms.length >= 3) {
        country = terms[terms.length - 1].value;
      } else if (terms.length === 2) {
        // Two terms: city, country
        country = terms[1].value;
        state = ''; // No state for small countries
      }

      return {
        description,
        placeId: prediction.place_id,
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
      };
    }).filter((result: AutocompleteResult) => result.city);

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
