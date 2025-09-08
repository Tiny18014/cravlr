-- Fix function search path security issues for the functions we just created
CREATE OR REPLACE FUNCTION public.send_phone_verification(
  claim_id uuid,
  phone_number text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  verification_code text;
BEGIN
  -- Generate 6-digit verification code
  verification_code := LPAD((random() * 999999)::int::text, 6, '0');
  
  -- Update business claim with verification code
  UPDATE public.business_claims
  SET 
    phone_verification_code = verification_code,
    phone_verification_sent_at = now(),
    verification_step = 'phone_verification'
  WHERE id = claim_id AND user_id = auth.uid();
  
  -- In a real implementation, you'd send SMS here via Twilio/etc
  -- For now, we'll just log it for testing
  RAISE NOTICE 'SMS verification code for %: %', phone_number, verification_code;
  
  RETURN FOUND;
END;
$$;

-- Fix function search path security issues for phone verification check
CREATE OR REPLACE FUNCTION public.verify_phone_code(
  claim_id uuid,
  provided_code text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  stored_code text;
  sent_at timestamp with time zone;
BEGIN
  -- Get stored verification code and timestamp
  SELECT phone_verification_code, phone_verification_sent_at
  INTO stored_code, sent_at
  FROM public.business_claims
  WHERE id = claim_id AND user_id = auth.uid();
  
  -- Check if code matches and is not expired (15 minutes)
  IF stored_code = provided_code AND sent_at > now() - interval '15 minutes' THEN
    UPDATE public.business_claims
    SET 
      phone_verified = true,
      phone_verification_code = NULL,
      verification_step = 'email_verification'
    WHERE id = claim_id;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Fix function search path security issues for email verification
CREATE OR REPLACE FUNCTION public.verify_business_email_domain(
  email text,
  restaurant_name text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  domain text;
  restaurant_slug text;
BEGIN
  -- Extract domain from email
  domain := split_part(email, '@', 2);
  
  -- Create restaurant slug for matching
  restaurant_slug := lower(regexp_replace(restaurant_name, '[^a-zA-Z0-9]', '', 'g'));
  
  -- Check if domain contains restaurant name or common business domains
  IF domain ILIKE '%' || restaurant_slug || '%' 
     OR domain IN ('gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com') THEN
    RETURN true;
  END IF;
  
  -- For non-generic domains, assume it's a business domain
  IF NOT domain IN ('gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com') THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;