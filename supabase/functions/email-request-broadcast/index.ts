import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
    requestId: z.string().uuid({ message: 'Invalid request ID format' })
});

// Calculate distance between two points using Haversine formula (Fallback)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const handler = async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // 1. Parse Input
        const payload = await req.json();
        const parseResult = requestSchema.safeParse(payload);

        if (!parseResult.success) {
            // Check if it's the raw webhook payload (nested in 'record')
            if (payload.record && payload.record.id) {
                payload.requestId = payload.record.id;
            } else {
                return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
        }

        const requestId = payload.requestId || payload.record?.id;
        if (!requestId) throw new Error("No Request ID found");

        console.log(`📧 Processing email broadcast for request ${requestId}`);

        // 2. Fetch Request Details
        const { data: request, error: reqError } = await supabase
            .from('food_requests')
            .select('*, profiles(display_name)')
            .eq('id', requestId)
            .single();

        if (reqError || !request) {
            console.error('Request not found:', reqError);
            return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 3. Find Eligible Users
        // Strategy: Fetch all potential recommenders and filter in-memory for precision & hybrid matching
        // (Optimization: We fetch filtered columns to reduce data transfer)
        const { data: potentialUsers, error: usersError } = await supabase
            .from('profiles')
            .select('id, email, display_name, notify_recommender, recommender_paused, profile_lat, profile_lng, notification_radius_km, location_city, email_notifications_enabled, email_new_requests')
            .neq('id', request.requester_id) // Don't notify self
            .eq('email_notifications_enabled', true) // Must have global email enabled
            .eq('email_new_requests', true) // Must have specific email preference enabled
            .not('email', 'is', null); // Must have an email address

        if (usersError) throw usersError;

        const hasCoordinates = request.lat && request.lng;
        const requestCity = (request.location_city || '').trim().toLowerCase();

        const eligibleUsers = (potentialUsers || []).filter(u => {
            // Safety checks
            if (u.notify_recommender === false) return false;
            if (u.recommender_paused === true) return false;
            if (!u.email) return false;

            // A. Geospatial Match
            if (hasCoordinates && u.profile_lat && u.profile_lng) {
                const dist = calculateDistance(request.lat, request.lng, u.profile_lat, u.profile_lng);
                const radius = u.notification_radius_km || 20; // Default 20km
                if (dist <= radius) return true;
            }

            // B. City Match (Fallback or for non-geo users)
            const userCity = (u.location_city || '').trim().toLowerCase();
            if (userCity && requestCity && (userCity.includes(requestCity) || requestCity.includes(userCity))) {
                return true;
            }

            return false;
        });

        console.log(`📍 Found ${eligibleUsers.length} eligible users for email broadcast`);

        if (eligibleUsers.length === 0) {
            return new Response(JSON.stringify({ message: 'No eligible users found', count: 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // 4. Send Emails (Batching)
        // Resend's batch sending limit is 100. We should slice if necessary, but for MVP assuming <100 eligible per request is safe or we loop chunks.
        const CHUNK_SIZE = 90; // Safe margin
        const chunks = [];
        for (let i = 0; i < eligibleUsers.length; i += CHUNK_SIZE) {
            chunks.push(eligibleUsers.slice(i, i + CHUNK_SIZE));
        }

        let totalSent = 0;

        for (const chunk of chunks) {
            const emailBatch = chunk.map(user => ({
                from: 'Cravlr <notifications@cravlr.com>',
                to: [user.email],
                subject: `🍽️ Someone needs a recommendation in ${request.location_city}!`,
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Food Request! 🌮</h2>
            <p>Hi ${user.display_name || 'there'},</p>
            <p>Someone near you is craving <strong>${request.food_type}</strong>!</p>
            <p><strong>Location:</strong> ${request.location_city}${request.location_state ? `, ${request.location_state}` : ''}</p>
            <p>${request.additional_notes ? `<strong>Notes:</strong> "${request.additional_notes}"` : ''}</p>

            <div style="margin: 20px 0;">
              <a href="https://cravlr.com/browse-requests" style="background: #A03272; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Recommend a Place
              </a>
            </div>

            <p style="font-size: 12px; color: #666;">
              You received this because you are a recommender in this area.
              <a href="https://cravlr.com/profile">Update preferences</a>
            </p>
          </div>
        `
            }));

            try {
                const { data, error } = await resend.batch.send(emailBatch);
                if (error) {
                    console.error('Resend batch error:', error);
                } else {
                    totalSent += data?.data?.length || 0;
                    console.log(`Batch sent: ${data?.data?.length}`);
                }
            } catch (err) {
                console.error('Batch exception:', err);
            }
        }

        return new Response(JSON.stringify({ success: true, sent: totalSent }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error: any) {
        console.error("Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
};

serve(handler);
