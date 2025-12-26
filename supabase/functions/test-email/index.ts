import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📧 Sending test recommender notification email to ${email}...`);

    // Simulate real request data
    const mockRequest = {
      food_type: "Spicy Thai Curry",
      location_city: "San Francisco",
      location_state: "CA",
      location_address: "Mission District",
      additional_notes: "Looking for something authentic with good vegetarian options!"
    };
    
    const mockRequester = {
      display_name: "Alex Chen"
    };

    const locationDisplay = `${mockRequest.location_city}, ${mockRequest.location_state}`;
    const recipientName = email.split('@')[0] || 'there';
    const subject = `🍽️ New ${mockRequest.food_type} request in ${mockRequest.location_city}!`;

    const emailResponse = await resend.emails.send({
      from: "Cravlr <notifications@cravlr.app>",
      to: [email],
      subject: subject,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F7F5F8;">
          <div style="background: linear-gradient(135deg, #A03272 0%, #7A2156 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🍽️ New Food Request!</h1>
          </div>
          
          <div style="padding: 30px; background-color: white;">
            <p style="font-size: 16px; color: #1C1C1C;">Hi ${recipientName}!</p>
            
            <p style="font-size: 16px; color: #1C1C1C;">Someone near you is looking for a great <strong>${mockRequest.food_type}</strong> spot in ${locationDisplay}!</p>
            
            <div style="background-color: #F9EFF5; padding: 20px; border-radius: 16px; margin: 24px 0; border-left: 4px solid #A03272;">
              <h2 style="color: #A03272; margin-top: 0; font-size: 18px;">📍 Request Details</h2>
              <p style="margin: 8px 0; color: #1C1C1C;"><strong>Food Type:</strong> ${mockRequest.food_type}</p>
              <p style="margin: 8px 0; color: #1C1C1C;"><strong>Location:</strong> ${locationDisplay}</p>
              <p style="margin: 8px 0; color: #1C1C1C;"><strong>Near:</strong> ${mockRequest.location_address}</p>
              <p style="margin: 8px 0; color: #1C1C1C;"><strong>Notes:</strong> ${mockRequest.additional_notes}</p>
              <p style="margin: 8px 0; color: #1C1C1C;"><strong>Requested by:</strong> ${mockRequester.display_name}</p>
            </div>
            
            <p style="font-size: 16px; color: #1C1C1C;">Know a great spot? Share your recommendation and earn points!</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://cravlr.app/browse-requests" 
                 style="background: linear-gradient(135deg, #A03272 0%, #7A2156 100%); color: white; padding: 14px 28px; 
                        text-decoration: none; border-radius: 24px; display: inline-block; font-weight: 600;
                        box-shadow: 0 4px 12px rgba(160, 50, 114, 0.3);">
                View Request & Recommend
              </a>
            </div>
          </div>
          
          <div style="padding: 20px; text-align: center; background-color: #F7F5F8;">
            <p style="font-size: 12px; color: #6B6B6B; margin: 0;">
              You received this because you're registered near ${locationDisplay}.<br>
              <a href="https://cravlr.app/profile" style="color: #A03272;">Update your notification preferences</a>
            </p>
            <p style="margin-top: 16px; font-size: 14px; color: #1C1C1C;">
              Happy recommending! 🎉<br>
              <strong>The Cravlr Team</strong>
            </p>
          </div>
        </div>
      `,
      text: `Hi ${recipientName}! Someone near you is looking for a great ${mockRequest.food_type} spot in ${locationDisplay}. Know a great spot? Visit Cravlr to share your recommendation and earn points!`,
    });

    console.log("✅ Recommender notification email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: `Recommender notification email sent to ${email}`, response: emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Error sending test email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
