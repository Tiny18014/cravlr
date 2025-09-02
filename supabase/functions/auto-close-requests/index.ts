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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Running auto-close expired requests job...');

    // Close expired requests
    const { data: expiredRequests, error: selectError } = await supabase
      .from('food_requests')
      .select('id')
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString());

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

    // Update expired requests to closed status
    const { error: updateError } = await supabase
      .from('food_requests')
      .update({
        status: 'expired',
        closed_at: new Date().toISOString()
      })
      .in('id', expiredRequests.map(req => req.id));

    if (updateError) {
      console.error('Error closing expired requests:', updateError);
      throw updateError;
    }

    console.log(`Successfully closed ${expiredRequests.length} expired requests`);

    return new Response(JSON.stringify({ 
      message: 'Successfully closed expired requests',
      closedCount: expiredRequests.length
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