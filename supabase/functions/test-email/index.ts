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

    console.log(`📧 Sending test email to ${email}...`);

    const emailResponse = await resend.emails.send({
      from: "Cravlr <onboarding@resend.dev>",
      to: [email],
      subject: "🍽️ Test Email from Cravlr",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7f5f8; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
            <h1 style="color: #A03272; margin: 0 0 16px 0; font-size: 24px;">🎉 Email Test Successful!</h1>
            <p style="color: #1C1C1C; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
              This is a test email from Cravlr. If you're seeing this, your email notification system is working correctly!
            </p>
            <div style="background: #F9EFF5; border-radius: 12px; padding: 16px; margin: 24px 0;">
              <p style="color: #6B6B6B; font-size: 14px; margin: 0;">
                <strong>Test Details:</strong><br>
                Sent at: ${new Date().toISOString()}<br>
                Recipient: ${email}
              </p>
            </div>
            <a href="https://cravlr.com" style="display: inline-block; background: linear-gradient(135deg, #A03272, #7A2156); color: white; padding: 14px 24px; border-radius: 14px; text-decoration: none; font-weight: 600; margin-top: 16px;">
              Open Cravlr
            </a>
          </div>
        </body>
        </html>
      `,
    });

    console.log("✅ Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: `Test email sent to ${email}`, response: emailResponse }),
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
