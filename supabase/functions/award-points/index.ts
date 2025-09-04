import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AwardPointsRequest {
  recommendationId: string;
  points: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recommendationId, points }: AwardPointsRequest = await req.json();
    
    console.log(`Awarding ${points} points for recommendation ${recommendationId}`);

    // Get recommendation details
    const { data: recommendation, error: recError } = await supabase
      .from('recommendations')
      .select('*')
      .eq('id', recommendationId)
      .single();

    if (recError || !recommendation) {
      console.error('Error fetching recommendation:', recError);
      throw new Error('Recommendation not found');
    }

    // Update recommendation with awarded points
    const { error: updateError } = await supabase
      .from('recommendations')
      .update({ awarded_points: points })
      .eq('id', recommendationId);

    if (updateError) {
      console.error('Error updating recommendation:', updateError);
      throw new Error('Failed to update recommendation');
    }

    // Get current points first
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('points_total, points_this_month')
      .eq('user_id', recommendation.recommender_id)
      .single();

    if (profileError) {
      console.error('Error fetching current profile:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    // Update recommender's points
    const { error: pointsError } = await supabase
      .from('profiles')
      .update({
        points_total: (currentProfile.points_total || 0) + points,
        points_this_month: (currentProfile.points_this_month || 0) + points
      })
      .eq('user_id', recommendation.recommender_id);

    if (pointsError) {
      console.error('Error updating points:', pointsError);
      throw new Error('Failed to update user points');
    }

    console.log(`Successfully awarded ${points} points to user ${recommendation.recommender_id}`);

    return new Response(JSON.stringify({ 
      success: true,
      points: points,
      recommendationId: recommendationId
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in award-points function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);