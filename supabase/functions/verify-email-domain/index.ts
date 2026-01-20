import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  email: string;
}

interface VerifyResponse {
  valid: boolean;
  domain: string;
  hasMxRecords: boolean;
  error?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: VerifyRequest = await req.json();
    
    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ valid: false, error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract domain from email
    const parts = email.toLowerCase().trim().split("@");
    if (parts.length !== 2 || !parts[1]) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const domain = parts[1];
    console.log(`[verify-email-domain] Checking MX records for domain: ${domain}`);

    // Use DNS over HTTPS (DoH) to check MX records via Google's public DNS
    const dnsResponse = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`,
      {
        headers: { "Accept": "application/dns-json" },
      }
    );

    if (!dnsResponse.ok) {
      console.error(`[verify-email-domain] DNS lookup failed: ${dnsResponse.status}`);
      // If DNS lookup fails, we'll assume it's valid to not block legitimate users
      return new Response(
        JSON.stringify({ 
          valid: true, 
          domain, 
          hasMxRecords: true,
          error: "DNS lookup unavailable, assuming valid" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dnsData = await dnsResponse.json();
    console.log(`[verify-email-domain] DNS response for ${domain}:`, JSON.stringify(dnsData));

    // Check if MX records exist
    // Status 0 = NOERROR (success), Answer array contains the records
    const hasMxRecords = dnsData.Status === 0 && 
                         Array.isArray(dnsData.Answer) && 
                         dnsData.Answer.length > 0;

    // Also check if domain exists at all (NXDOMAIN = status 3)
    const domainExists = dnsData.Status !== 3;

    if (!domainExists) {
      console.log(`[verify-email-domain] Domain ${domain} does not exist (NXDOMAIN)`);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          domain, 
          hasMxRecords: false,
          error: `The domain "${domain}" does not exist` 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!hasMxRecords) {
      // Check if there's an A record as fallback (some domains accept mail on A record)
      const aRecordResponse = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`,
        { headers: { "Accept": "application/dns-json" } }
      );
      
      if (aRecordResponse.ok) {
        const aRecordData = await aRecordResponse.json();
        const hasARecord = aRecordData.Status === 0 && 
                          Array.isArray(aRecordData.Answer) && 
                          aRecordData.Answer.length > 0;
        
        if (hasARecord) {
          console.log(`[verify-email-domain] Domain ${domain} has no MX but has A record, allowing`);
          return new Response(
            JSON.stringify({ 
              valid: true, 
              domain, 
              hasMxRecords: false,
              error: null 
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      console.log(`[verify-email-domain] Domain ${domain} has no MX records and no A record`);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          domain, 
          hasMxRecords: false,
          error: `The domain "${domain}" cannot receive emails` 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[verify-email-domain] Domain ${domain} has valid MX records`);
    return new Response(
      JSON.stringify({ 
        valid: true, 
        domain, 
        hasMxRecords: true,
        error: null 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[verify-email-domain] Error:", error);
    // On error, don't block the user
    return new Response(
      JSON.stringify({ 
        valid: true, 
        domain: "", 
        hasMxRecords: true,
        error: "Verification unavailable" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
