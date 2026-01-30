import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

interface GeocodeResult {
  lat: number;
  lng: number;
  city: string;
  state: string;
  country: string;
  countryCode: string;
}

/**
 * Normalize location string by trimming and applying title case
 */
function normalizeLocationString(str: string | null): string {
  if (!str) return '';
  
  return str
    .trim()
    .replace(/[,\s]+$/, '')
    .replace(/^[,\s]+/, '')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => {
      if (word.length === 0) return '';
      if (word.length <= 2 && word === word.toUpperCase()) return word;
      if (word.includes('-')) {
        return word.split('-')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join('-');
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Geocode an address using Google Geocoding API
 */
async function geocodeAddress(city: string, state: string): Promise<GeocodeResult | null> {
  if (!GOOGLE_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY not configured');
    return null;
  }

  const address = `${city}, ${state}`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;
  
  console.log(`📍 Geocoding: ${address}`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.log(`⚠️ No results for: ${address} (status: ${data.status})`);
      return null;
    }
    
    const result = data.results[0];
    const location = result.geometry.location;
    
    // Extract address components
    let extractedCity = city;
    let extractedState = state;
    let country = '';
    let countryCode = '';
    
    for (const component of result.address_components || []) {
      const types = component.types || [];
      
      if (types.includes('locality')) {
        extractedCity = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        extractedState = component.long_name;
      }
      if (types.includes('country')) {
        country = component.long_name;
        countryCode = component.short_name;
      }
    }
    
    return {
      lat: location.lat,
      lng: location.lng,
      city: normalizeLocationString(extractedCity),
      state: normalizeLocationString(extractedState),
      country: normalizeLocationString(country),
      countryCode: countryCode.toUpperCase(),
    };
  } catch (error) {
    console.error(`❌ Geocoding error for ${address}:`, error);
    return null;
  }
}

serve(async (req) => {
  console.log('📍 Backfill coordinates endpoint called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    // Verify admin authentication
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

    // Check if user is admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: adminCheck } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!adminCheck) {
      console.error('❌ User is not admin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Authenticated admin user:', user.id);

    // Parse request body for options
    const body = await req.json().catch(() => ({}));
    const { dryRun = false, limit = 50 } = body;

    // Get users without coordinates but with city/state
    const { data: users, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, location_city, location_state, profile_lat, profile_lng')
      .is('profile_lat', null)
      .not('location_city', 'is', null)
      .limit(limit);

    if (fetchError) {
      console.error('❌ Failed to fetch users:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Found ${users?.length || 0} users to backfill`);

    const results = {
      total: users?.length || 0,
      success: 0,
      failed: 0,
      skipped: 0,
      dryRun,
      details: [] as Array<{
        userId: string;
        city: string;
        state: string;
        status: 'success' | 'failed' | 'skipped';
        coordinates?: { lat: number; lng: number };
        error?: string;
      }>,
    };

    for (const profile of users || []) {
      const city = profile.location_city;
      const state = profile.location_state || '';

      // Skip if city is empty
      if (!city || city.trim().length === 0) {
        results.skipped++;
        results.details.push({
          userId: profile.id,
          city: city || '',
          state: state,
          status: 'skipped',
          error: 'Empty city name',
        });
        continue;
      }

      // Geocode the address
      const geocoded = await geocodeAddress(city, state);

      if (!geocoded) {
        results.failed++;
        results.details.push({
          userId: profile.id,
          city,
          state,
          status: 'failed',
          error: 'Geocoding failed',
        });
        continue;
      }

      // Update the profile if not a dry run
      if (!dryRun) {
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            profile_lat: geocoded.lat,
            profile_lng: geocoded.lng,
            location_city: geocoded.city, // Normalized
            location_state: geocoded.state, // Normalized
            profile_country: geocoded.countryCode,
          })
          .eq('id', profile.id);

        if (updateError) {
          results.failed++;
          results.details.push({
            userId: profile.id,
            city,
            state,
            status: 'failed',
            error: `Update failed: ${updateError.message}`,
          });
          continue;
        }
      }

      results.success++;
      results.details.push({
        userId: profile.id,
        city,
        state,
        status: 'success',
        coordinates: { lat: geocoded.lat, lng: geocoded.lng },
      });

      // Rate limit to avoid hitting API quota
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    console.log('📊 Backfill complete:', {
      total: results.total,
      success: results.success,
      failed: results.failed,
      skipped: results.skipped,
      dryRun: results.dryRun,
    });

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Backfill error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
