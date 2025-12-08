import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('📍 User location endpoint called:', req.method);

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

    // GET: Retrieve user's current location
    if (req.method === 'GET') {
      const { data: userLocation, error: fetchError } = await supabaseClient
        .from('user_current_locations')
        .select(`
          id,
          is_from_gps,
          created_at,
          updated_at,
          location:locations(*)
        `)
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('Error fetching user location:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch location', data: null }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!userLocation) {
        return new Response(
          JSON.stringify({ data: null, error: null, meta: { hasLocation: false } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          data: {
            ...userLocation.location,
            isFromGps: userLocation.is_from_gps,
          },
          error: null,
          meta: { hasLocation: true }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST: Save/update user's location
    if (req.method === 'POST') {
      const body = await req.json();
      const { location, isFromGps = false } = body;

      if (!location) {
        return new Response(
          JSON.stringify({ error: 'location is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Insert or get existing location
      let locationId: string | null = null;

      // First try to find existing location by coordinates
      const { data: existingLocation } = await supabaseAdmin
        .from('locations')
        .select('id')
        .eq('lat', location.lat)
        .eq('lng', location.lng)
        .single();

      if (existingLocation) {
        locationId = existingLocation.id;
      } else {
        // Insert new location
        const { data: newLocation, error: insertError } = await supabaseAdmin
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
            admin_hierarchy: location.adminHierarchy || [],
            source: location.source || 'google_geocoding',
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error inserting location:', insertError);
          return new Response(
            JSON.stringify({ error: 'Failed to save location' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        locationId = newLocation?.id;
      }

      if (!locationId) {
        return new Response(
          JSON.stringify({ error: 'Failed to get location ID' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Upsert user's current location
      const { error: upsertError } = await supabaseAdmin
        .from('user_current_locations')
        .upsert({
          user_id: user.id,
          location_id: locationId,
          is_from_gps: isFromGps,
        }, {
          onConflict: 'user_id',
        });

      if (upsertError) {
        console.error('Error upserting user location:', upsertError);
        return new Response(
          JSON.stringify({ error: 'Failed to save user location' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ User location saved:', location.displayLabel);

      return new Response(
        JSON.stringify({ 
          data: { locationId, ...location },
          error: null,
          meta: { saved: true }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE: Remove user's saved location
    if (req.method === 'DELETE') {
      const { error: deleteError } = await supabaseClient
        .from('user_current_locations')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error deleting user location:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to delete location' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ User location deleted');

      return new Response(
        JSON.stringify({ data: null, error: null, meta: { deleted: true } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  } catch (error) {
    console.error('❌ User location error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', data: null }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});