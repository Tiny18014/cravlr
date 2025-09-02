import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const url = new URL(req.url);
    const photoReference = url.searchParams.get('ref');
    const maxWidth = url.searchParams.get('w') || '800';

    if (!photoReference) {
      return new Response('Photo reference is required', {
        status: 400,
        headers: corsHeaders
      });
    }

    console.log(`Fetching photo: ${photoReference}, width: ${maxWidth}`);

    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`;
    
    const response = await fetch(photoUrl);
    
    if (!response.ok) {
      console.error('Google Photos API error:', response.status, response.statusText);
      return new Response('Failed to fetch photo', {
        status: response.status,
        headers: corsHeaders
      });
    }

    // Get the image data
    const imageData = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
      }
    });

  } catch (error) {
    console.error('Error in places-photo function:', error);
    return new Response('Internal server error', {
      status: 500,
      headers: corsHeaders
    });
  }
});