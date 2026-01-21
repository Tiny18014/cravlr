import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyPhoneRequest {
  phoneNumber: string;
  countryCode: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, countryCode } = await req.json() as VerifyPhoneRequest;

    if (!phoneNumber || !countryCode) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          error: 'Phone number and country code are required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format the full phone number
    const fullNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
    
    console.log(`Verifying phone number: ${fullNumber}`);

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!accountSid || !authToken) {
      console.error('Twilio credentials not configured');
      // Fallback to basic validation if Twilio not configured
      return new Response(
        JSON.stringify({ 
          isValid: true, 
          warning: 'Phone verification service not configured, basic validation passed' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Twilio Lookup API v2
    const twilioUrl = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(fullNumber)}`;
    
    const twilioResponse = await fetch(twilioUrl, {
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/json',
      },
    });

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.json();
      console.error('Twilio lookup failed:', errorData);
      
      // If the number format is invalid
      if (twilioResponse.status === 404) {
        return new Response(
          JSON.stringify({ 
            isValid: false, 
            error: 'This phone number appears to be invalid. Please check the number and try again.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // For other errors, fall back to allowing the number
      return new Response(
        JSON.stringify({ 
          isValid: true, 
          warning: 'Could not verify phone number, proceeding with basic validation' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lookupData = await twilioResponse.json();
    console.log('Twilio lookup result:', JSON.stringify(lookupData, null, 2));

    // Check if the number is valid
    const isValid = lookupData.valid === true;
    
    if (!isValid) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          error: 'This phone number is not valid. Please enter a real phone number.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return success with formatted number
    return new Response(
      JSON.stringify({ 
        isValid: true,
        nationalFormat: lookupData.national_format,
        countryCode: lookupData.country_code,
        callingCountryCode: lookupData.calling_country_code,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Phone verification error:', error);
    
    // On error, allow the number through with basic validation
    return new Response(
      JSON.stringify({ 
        isValid: true, 
        warning: 'Phone verification temporarily unavailable' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
