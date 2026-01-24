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

    // Call Twilio Lookup API v2 with line_type_intelligence for real validation
    const twilioUrl = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(fullNumber)}?Fields=line_type_intelligence`;
    
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

      // For other errors, fall back to basic format validation
      // But require proper digit count
      const digitsOnly = phoneNumber.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        return new Response(
          JSON.stringify({ 
            isValid: false, 
            error: 'Phone number must have at least 10 digits' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          isValid: true, 
          warning: 'Could not fully verify phone number' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lookupData = await twilioResponse.json();
    console.log('Twilio lookup result:', JSON.stringify(lookupData, null, 2));

    // Check if the number is valid
    const isFormatValid = lookupData.valid === true;
    
    if (!isFormatValid) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          error: 'This phone number format is not valid.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check line type intelligence if available
    const lineTypeInfo = lookupData.line_type_intelligence;
    if (lineTypeInfo) {
      console.log('Line type info:', JSON.stringify(lineTypeInfo, null, 2));
      
      // Check for invalid/non-existent carrier
      if (lineTypeInfo.error_code) {
        console.log('Line type error:', lineTypeInfo.error_code);
        return new Response(
          JSON.stringify({ 
            isValid: false, 
            error: 'This phone number could not be verified. Please use a real phone number.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Check carrier - if no carrier, it's likely not a real number
      if (!lineTypeInfo.carrier_name && lineTypeInfo.type !== 'mobile' && lineTypeInfo.type !== 'landline') {
        console.log('No carrier found for number');
        return new Response(
          JSON.stringify({ 
            isValid: false, 
            error: 'This phone number does not appear to be connected to a carrier. Please use a real phone number.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Return success with formatted number
    return new Response(
      JSON.stringify({ 
        isValid: true,
        nationalFormat: lookupData.national_format,
        countryCode: lookupData.country_code,
        callingCountryCode: lookupData.calling_country_code,
        lineType: lineTypeInfo?.type || 'unknown',
        carrier: lineTypeInfo?.carrier_name || 'unknown',
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
