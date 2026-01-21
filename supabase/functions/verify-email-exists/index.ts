import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyEmailRequest {
  email: string;
}

interface AbstractApiResponse {
  email: string;
  autocorrect: string;
  deliverability: string; // "DELIVERABLE", "UNDELIVERABLE", "UNKNOWN", "RISKY"
  quality_score: number; // 0.0 - 1.0
  is_valid_format: { value: boolean; text: string };
  is_free_email: { value: boolean; text: string };
  is_disposable_email: { value: boolean; text: string };
  is_role_email: { value: boolean; text: string };
  is_catchall_email: { value: boolean; text: string };
  is_mx_found: { value: boolean; text: string };
  is_smtp_valid: { value: boolean; text: string };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json() as VerifyEmailRequest;

    if (!email) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          error: 'Email address is required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verifying email: ${email}`);

    const apiKey = Deno.env.get('ABSTRACT_API_KEY');

    if (!apiKey) {
      console.error('Abstract API key not configured');
      // Fallback to basic validation
      return new Response(
        JSON.stringify({ 
          isValid: true, 
          warning: 'Email verification service not configured' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Abstract API Email Verification
    const abstractUrl = `https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${encodeURIComponent(email)}`;
    
    const response = await fetch(abstractUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Abstract API error:', errorText);
      
      // On API error, allow the email through with warning
      return new Response(
        JSON.stringify({ 
          isValid: true, 
          warning: 'Could not verify email, proceeding with basic validation' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: AbstractApiResponse = await response.json();
    console.log('Abstract API response:', JSON.stringify(data, null, 2));

    // Check if email format is valid
    if (!data.is_valid_format?.value) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          error: 'Invalid email format. Please check and try again.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for disposable emails
    if (data.is_disposable_email?.value) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          error: 'Disposable email addresses are not allowed. Please use a permanent email.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if MX records exist
    if (!data.is_mx_found?.value) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          error: 'This email domain does not appear to receive emails. Please check the address.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check SMTP validity (if the mailbox exists)
    if (!data.is_smtp_valid?.value) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          error: 'This email address does not exist. Please check and try again.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check deliverability
    if (data.deliverability === 'UNDELIVERABLE') {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          error: 'This email address cannot receive emails. Please use a different email.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check quality score (reject very low quality emails)
    if (data.quality_score < 0.5) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          error: 'This email address appears to be invalid. Please use a different email.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for autocorrect suggestion
    if (data.autocorrect && data.autocorrect !== '' && data.autocorrect !== email) {
      return new Response(
        JSON.stringify({ 
          isValid: true,
          suggestion: data.autocorrect,
          message: `Did you mean ${data.autocorrect}?`,
          deliverability: data.deliverability,
          qualityScore: data.quality_score,
          isFreeEmail: data.is_free_email?.value,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Email is valid
    return new Response(
      JSON.stringify({ 
        isValid: true,
        deliverability: data.deliverability,
        qualityScore: data.quality_score,
        isFreeEmail: data.is_free_email?.value,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Email verification error:', error);
    
    // On error, allow the email through
    return new Response(
      JSON.stringify({ 
        isValid: true, 
        warning: 'Email verification temporarily unavailable' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
