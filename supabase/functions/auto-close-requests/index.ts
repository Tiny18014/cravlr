import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate cron secret for authentication
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');
  
  if (!expectedSecret || cronSecret !== expectedSecret) {
    console.error('❌ Unauthorized: Invalid or missing cron secret');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    console.log('Running auto-close expired requests job...');

    // Close expired requests
    const { data: expiredRequests, error: selectError } = await supabase
      .from('food_requests')
      .select('id')
      .eq('status', 'active')
      .lt('expire_at', new Date().toISOString());

    if (selectError) {
      console.error('Error fetching expired requests:', selectError);
      throw selectError;
    }

    if (!expiredRequests || expiredRequests.length === 0) {
      console.log('No expired requests found');
      return new Response(JSON.stringify({ 
        message: 'No expired requests found',
        closedCount: 0
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Found ${expiredRequests.length} expired requests to update:`, expiredRequests.map(r => r.id));

    // Update expired requests to expired status (this will trigger the notification)
    const { error: updateError } = await supabase
      .from('food_requests')
      .update({
        status: 'expired'
      })
      .in('id', expiredRequests.map(req => req.id));

    if (updateError) {
      console.error('Error closing expired requests:', updateError);
      console.error('Full error details:', JSON.stringify(updateError, null, 2));
      throw updateError;
    }

    console.log('Successfully updated request statuses to expired');

    // Award points for recommendations in closed requests
    let totalPointsAwarded = 0;
    for (const request of expiredRequests) {
      try {
        console.log(`Awarding points for expired request: ${request.id}`);
        
        // Call the database function to award points for this request
        const { data: pointsData, error: pointsError } = await supabase
          .rpc('award_points_for_request', { 
            request_id_param: request.id 
          });

        if (pointsError) {
          console.error(`Error awarding points for request ${request.id}:`, pointsError);
        } else {
          totalPointsAwarded += (pointsData || 0);
          console.log(`Awarded ${pointsData || 0} total points for request ${request.id}`);
        }
      } catch (error) {
        console.error(`Unexpected error awarding points for request ${request.id}:`, error);
      }
    }

    console.log(`Successfully closed ${expiredRequests.length} expired requests and awarded ${totalPointsAwarded} total points`);

    return new Response(JSON.stringify({ 
      message: 'Successfully closed expired requests and awarded points',
      closedCount: expiredRequests.length,
      totalPointsAwarded: totalPointsAwarded
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in auto-close-requests function:", error);
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
