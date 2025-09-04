import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

interface PlaceDetails {
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  photos?: Array<{ photo_reference: string }>;
  url?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

// In-memory cache for place details
const placeCache = new Map<string, { data: PlaceDetails; timestamp: number }>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-');
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // Return in meters
}

async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  // Check cache first
  const cached = placeCache.get(placeId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total,price_level,photos,url,geometry&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.result) {
      // Cache the result
      placeCache.set(placeId, {
        data: data.result,
        timestamp: Date.now()
      });
      return data.result;
    }
  } catch (error) {
    console.error('Error fetching place details:', error);
  }

  return null;
}

function getDisplayName(recommenderEmail: string): string {
  return '@' + recommenderEmail.split('@')[0];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    let requestId: string;
    
    if (req.method === 'POST') {
      const body = await req.json();
      requestId = body.requestId;
    } else {
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      requestId = pathParts[pathParts.length - 1];
    }

    if (!requestId) {
      return new Response('Request ID is required', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Get the food request details
    const { data: request, error: requestError } = await supabase
      .from('food_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return new Response('Request not found', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Get all recommendations for this request with recommender info
    const { data: recommendations, error: recError } = await supabase
      .from('recommendations')
      .select(`
        *,
        profiles!inner(email, display_name)
      `)
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    if (recError) {
      console.error('Error fetching recommendations:', recError);
      return new Response('Error fetching recommendations', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    if (!recommendations || recommendations.length === 0) {
      return new Response(JSON.stringify({ 
        requestId, 
        status: request.status,
        expiresAt: request.expires_at,
        totalRecommendations: 0, 
        groups: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Group recommendations by placeId or restaurant slug
    const groups = new Map();

    for (const rec of recommendations) {
      const key = rec.place_id || slugify(rec.restaurant_name);
      
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          name: rec.restaurant_name,
          placeId: rec.place_id,
          mapsUrl: rec.maps_url,
          count: 0,
          firstSubmittedAt: rec.created_at,
          lastSubmittedAt: rec.created_at,
          notes: [],
          recommenderNames: [], // Track unique recommenders
          // These will be filled from place details if available
          rating: rec.rating,
          priceLevel: rec.price_level,
          photoToken: rec.photo_token,
          distanceMeters: null,
          reviews: null
        });
      }

      const group = groups.get(key);
      group.count++;
      group.lastSubmittedAt = rec.created_at;
      
      // Track unique recommenders
      const displayName = rec.profiles?.display_name || getDisplayName(rec.profiles?.email || '');
      if (!group.recommenderNames.includes(displayName)) {
        group.recommenderNames.push(displayName);
      }
      
      // Add note if it exists
      if (rec.notes && rec.notes.trim()) {
        group.notes.push({
          by: displayName,
          text: rec.notes.slice(0, 140) // Trim to 140 chars
        });
      }
    }

    // Fetch place details for places with placeId and calculate distances
    for (const [key, group] of groups) {
      if (group.placeId) {
        const placeDetails = await fetchPlaceDetails(group.placeId);
        if (placeDetails) {
          group.rating = placeDetails.rating || group.rating;
          group.reviews = placeDetails.user_ratings_total;
          group.priceLevel = placeDetails.price_level;
          
          if (placeDetails.photos && placeDetails.photos.length > 0) {
            group.photoToken = placeDetails.photos[0].photo_reference;
          }
          
          if (placeDetails.url) {
            group.mapsUrl = placeDetails.url;
          }

          // Calculate distance if request has coordinates
          if (placeDetails.geometry?.location && request.location_lat && request.location_lng) {
            group.distanceMeters = Math.round(calculateDistance(
              parseFloat(request.location_lat),
              parseFloat(request.location_lng),
              placeDetails.geometry.location.lat,
              placeDetails.geometry.location.lng
            ));
          }
        }
      }
    }

    // Enhanced scoring algorithm for better aggregation during time interval
    console.log('📊 Applying intelligent ranking algorithm...');
    
    const scoredGroups = Array.from(groups.values()).map(group => {
      let score = 0;
      
      // Base score from recommendation count (heavily weighted)
      score += group.count * 100;
      console.log(`🏪 ${group.name}: Base score from ${group.count} recommendations: +${group.count * 100}`);
      
      // Boost for high ratings (Google Places data)
      if (group.rating && group.rating > 3) {
        const ratingBonus = (group.rating - 3) * 30;
        score += ratingBonus;
        console.log(`⭐ ${group.name}: Rating bonus (${group.rating}/5): +${ratingBonus}`);
      }
      
      // Boost for restaurants with many reviews (indicates popularity)
      if (group.reviews && group.reviews > 50) {
        const reviewBonus = Math.min(group.reviews / 100, 20);
        score += reviewBonus;
        console.log(`📝 ${group.name}: Review count bonus (${group.reviews} reviews): +${reviewBonus}`);
      }
      
      // Distance penalty (closer is better)
      if (group.distanceMeters) {
        const distanceKm = group.distanceMeters / 1000;
        const distancePenalty = Math.min(distanceKm * 5, 25);
        score -= distancePenalty;
        console.log(`📍 ${group.name}: Distance penalty (${distanceKm.toFixed(1)}km): -${distancePenalty}`);
      }
      
      // Diversity bonus (multiple different recommenders)
      const uniqueRecommenders = group.recommenderNames.length;
      if (uniqueRecommenders > 1) {
        const diversityBonus = (uniqueRecommenders - 1) * 15;
        score += diversityBonus;
        console.log(`👥 ${group.name}: Diversity bonus (${uniqueRecommenders} unique users): +${diversityBonus}`);
      }
      
      // Notes engagement bonus
      if (group.notes.length > 0) {
        const notesBonus = Math.min(group.notes.length * 8, 25);
        score += notesBonus;
        console.log(`💬 ${group.name}: Notes engagement bonus (${group.notes.length} notes): +${notesBonus}`);
      }
      
      const finalScore = Math.round(score);
      console.log(`🎯 ${group.name}: Final aggregated score: ${finalScore}`);
      
      return { ...group, aggregatedScore: finalScore };
    });
    
    // Sort by aggregated score (desc), then by name for consistency
    const sortedGroups = scoredGroups.sort((a, b) => {
      if (b.aggregatedScore !== a.aggregatedScore) {
        return b.aggregatedScore - a.aggregatedScore;
      }
      return a.name.localeCompare(b.name);
    });
    
    console.log('🏆 Final ranking order:', sortedGroups.map(g => `${g.name} (${g.aggregatedScore}pts)`));

    // Reverse notes to show latest first, limit to 3
    sortedGroups.forEach(group => {
      group.notes = group.notes.reverse().slice(0, 3);
    });

    // For results endpoint, limit to top 10 by default
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const paginatedGroups = sortedGroups.slice(offset, offset + limit);

    return new Response(JSON.stringify({
      requestId,
      status: request.status,
      expiresAt: request.expires_at,
      totalRecommendations: recommendations.length,
      groups: paginatedGroups,
      hasMore: sortedGroups.length > offset + limit
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in request-results function:', error);
    return new Response('Internal server error', {
      status: 500,
      headers: corsHeaders
    });
  }
});