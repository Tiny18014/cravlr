import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🗺️ Geocoding service endpoint called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!GOOGLE_API_KEY) {
      console.error('❌ Google Places API key not configured');
      return new Response(
        JSON.stringify({ error: 'Geocoding service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { address, city, state, zip, lat, lng } = body;
    
    console.log('📍 Geocoding request:', { address, city, state, zip, lat, lng });

    // If lat/lng provided, do reverse geocoding
    if (lat !== undefined && lng !== undefined) {
      console.log('🔄 Performing reverse geocoding');
      
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}&language=en`;
      const response = await fetch(geocodeUrl);
      const data = await response.json();

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        console.error('❌ Reverse geocoding failed:', data.status, data.error_message);
        return new Response(
          JSON.stringify({ 
            error: 'Could not reverse geocode coordinates',
            details: data.error_message || 'No results found'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Extract city, state/region, country from address components
      const result = data.results[0];
      let cityName = '';
      let stateName = '';
      let countryName = '';
      let countryCode = '';
      let postalCode = '';

      for (const component of result.address_components || []) {
        const types = component.types || [];
        if (types.includes('locality') || types.includes('postal_town')) {
          cityName = component.long_name;
        }
        if (types.includes('administrative_area_level_1')) {
          stateName = component.short_name; // Use short for backward compatibility
        }
        if (types.includes('country')) {
          countryName = component.long_name;
          countryCode = component.short_name;
        }
        if (types.includes('postal_code')) {
          postalCode = component.long_name;
        }
      }

      console.log('✅ Reverse geocoding successful:', { cityName, stateName, countryName });

      return new Response(
        JSON.stringify({
          lat,
          lng,
          city: cityName,
          state: stateName,
          country: countryName,
          countryCode,
          postalCode,
          formatted_address: result.formatted_address,
          place_id: result.place_id
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Forward geocoding - build the address string
    let addressQuery = '';
    if (address) {
      addressQuery = address;
    } else if (city && state) {
      addressQuery = `${city}, ${state}`;
    } else if (city) {
      addressQuery = city;
    } else if (zip) {
      addressQuery = zip;
    } else {
      return new Response(
        JSON.stringify({ error: 'Need at least city, zip, or full address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Forward geocoding address:', addressQuery);

    // Call Google Geocoding API (no country restriction for global support)
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressQuery)}&key=${GOOGLE_API_KEY}&language=en`;
    
    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.error('❌ Geocoding failed:', data.status, data.error_message);
      return new Response(
        JSON.stringify({ 
          error: 'Could not geocode address',
          details: data.error_message || 'No results found'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = data.results[0];
    const location = result.geometry.location;

    // Extract additional info from address components
    let cityName = '';
    let stateName = '';
    let countryName = '';
    let countryCode = '';

    for (const component of result.address_components || []) {
      const types = component.types || [];
      if (types.includes('locality') || types.includes('postal_town')) {
        cityName = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        stateName = component.short_name;
      }
      if (types.includes('country')) {
        countryName = component.long_name;
        countryCode = component.short_name;
      }
    }
    
    console.log('✅ Geocoding successful:', {
      lat: location.lat,
      lng: location.lng,
      formatted_address: result.formatted_address
    });

    return new Response(
      JSON.stringify({
        lat: location.lat,
        lng: location.lng,
        city: cityName,
        state: stateName,
        country: countryName,
        countryCode,
        formatted_address: result.formatted_address,
        place_id: result.place_id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Geocoding error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
