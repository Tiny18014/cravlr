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

// Calculate distance between two points using Haversine formula
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
        
        // Accept requestId directly or from webhook record
        let requestId = payload.requestId;
        if (!requestId && payload.record?.id) {
            requestId = payload.record.id;
        }
        
        if (!requestId) {
            return new Response(JSON.stringify({ error: 'Missing requestId' }), { 
                status: 400, 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
        }

        console.log(`📧 Processing email broadcast for request ${requestId}`);

        // 2. Fetch Request Details
        const { data: request, error: reqError } = await supabase
            .from('food_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (reqError || !request) {
            console.error('Request not found:', reqError);
            return new Response(JSON.stringify({ error: 'Request not found' }), { 
                status: 404, 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
        }

        // 3. Find Eligible Users from profiles (without email filter since email is in auth.users)
        const { data: potentialUsers, error: usersError } = await supabase
            .from('profiles')
            .select('id, display_name, notify_recommender, recommender_paused, profile_lat, profile_lng, notification_radius_km, location_city, email_notifications_enabled, email_new_requests, phone_number, sms_notifications_enabled, sms_new_requests')
            .neq('id', request.requester_id); // Don't notify self

        if (usersError) {
            console.error('Error fetching users:', usersError);
            throw usersError;
        }

        const hasCoordinates = request.lat && request.lng;
        const requestCity = (request.location_city || '').trim().toLowerCase();

        // Filter by location/distance
        const eligibleUsers = (potentialUsers || []).filter(u => {
            // Safety checks
            if (u.notify_recommender === false) return false;
            if (u.recommender_paused === true) return false;

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
            return new Response(JSON.stringify({ message: 'No eligible users found', count: 0 }), { 
                status: 200, 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
        }

        // 4. Separate users for email and SMS
        const emailEligibleUsers = eligibleUsers.filter(u => 
            u.email_notifications_enabled === true && u.email_new_requests === true
        );
        const smsEligibleUsers = eligibleUsers.filter(u => 
            u.sms_notifications_enabled === true && u.sms_new_requests === true && u.phone_number
        );

        console.log(`📧 ${emailEligibleUsers.length} users eligible for email, 📱 ${smsEligibleUsers.length} for SMS`);

        // 5. Get emails from auth.users for eligible users
        const usersWithEmails: Array<{ id: string; display_name: string | null; email: string }> = [];
        
        for (const user of emailEligibleUsers) {
            try {
                const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.id);
                if (!authError && authUser?.user?.email) {
                    usersWithEmails.push({
                        id: user.id,
                        display_name: user.display_name,
                        email: authUser.user.email
                    });
                }
            } catch (err) {
                console.log(`Could not get email for user ${user.id}`);
            }
        }

        console.log(`📧 Found ${usersWithEmails.length} users with emails`);

        // 6. Send Emails (Batching)
        let totalEmailsSent = 0;

        if (usersWithEmails.length > 0) {
            const CHUNK_SIZE = 90; // Resend's batch limit is 100
            const chunks = [];
            for (let i = 0; i < usersWithEmails.length; i += CHUNK_SIZE) {
                chunks.push(usersWithEmails.slice(i, i + CHUNK_SIZE));
            }

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
                            ${request.additional_notes ? `<p><strong>Notes:</strong> "${request.additional_notes}"</p>` : ''}
                            
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
                        totalEmailsSent += data?.data?.length || chunk.length;
                        console.log(`✅ Email batch sent: ${data?.data?.length || chunk.length} emails`);
                    }
                } catch (err) {
                    console.error('Email batch exception:', err);
                }
            }
        }

        console.log(`✅ Total emails sent: ${totalEmailsSent}`);

        // 7. Send SMS via OneSignal
        let totalSmsSent = 0;
        const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
        const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_API_KEY");

        if (smsEligibleUsers.length > 0 && ONESIGNAL_APP_ID && ONESIGNAL_API_KEY) {
            const smsMessage = `🍽️ Cravlr: Someone near ${request.location_city} is craving ${request.food_type}! Share your recommendation: https://cravlr.com/browse-requests`;

            for (const user of smsEligibleUsers) {
                try {
                    const smsResponse = await fetch("https://onesignal.com/api/v1/notifications", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Basic ${ONESIGNAL_API_KEY}`,
                        },
                        body: JSON.stringify({
                            app_id: ONESIGNAL_APP_ID,
                            include_phone_numbers: [user.phone_number],
                            sms_from: "+18449980431", // OneSignal SMS sender
                            contents: { en: smsMessage },
                            name: "New Request Broadcast SMS",
                        }),
                    });

                    if (smsResponse.ok) {
                        totalSmsSent++;
                        console.log(`📱 SMS sent to user ${user.id}`);
                    } else {
                        const errorText = await smsResponse.text();
                        console.error(`SMS failed for user ${user.id}:`, errorText);
                    }
                } catch (smsErr) {
                    console.error(`SMS exception for user ${user.id}:`, smsErr);
                }
            }
        } else if (smsEligibleUsers.length > 0) {
            console.log("⚠️ OneSignal not configured, skipping SMS");
        }

        console.log(`📱 Total SMS sent: ${totalSmsSent}`);

        return new Response(JSON.stringify({ 
            success: true, 
            emailsSent: totalEmailsSent, 
            smsSent: totalSmsSent 
        }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error: any) {
        console.error("Error in email-request-broadcast:", error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
    }
};

serve(handler);
