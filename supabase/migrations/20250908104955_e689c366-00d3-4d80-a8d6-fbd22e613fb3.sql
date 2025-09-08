-- Add phone and email verification fields to business_claims table
ALTER TABLE public.business_claims 
ADD COLUMN phone_verified boolean DEFAULT false,
ADD COLUMN email_verified boolean DEFAULT false,
ADD COLUMN phone_verification_code text,
ADD COLUMN email_verification_code text,
ADD COLUMN phone_verification_sent_at timestamp with time zone,
ADD COLUMN email_verification_sent_at timestamp with time zone,
ADD COLUMN verification_step text DEFAULT 'pending' CHECK (verification_step IN ('pending', 'phone_verification', 'email_verification', 'document_upload', 'manual_review', 'verified', 'rejected'));

-- Create phone verification function
CREATE OR REPLACE FUNCTION public.send_phone_verification(
  claim_id uuid,
  phone_number text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create phone verification check function
CREATE OR REPLACE FUNCTION public.verify_phone_code(
  claim_id uuid,
  provided_code text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create email domain verification function
CREATE OR REPLACE FUNCTION public.verify_business_email_domain(
  email text,
  restaurant_name text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Insert sample restaurant data for testing
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'owner@joes-pizza.com', crypt('password123', gen_salt('bf')), now(), 
   '{"display_name": "Joe Martinez", "user_type": "business"}'::jsonb, now(), now()),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'manager@mamas-kitchen.com', crypt('password123', gen_salt('bf')), now(), 
   '{"display_name": "Maria Rodriguez", "user_type": "business"}'::jsonb, now(), now()),
  ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'chef@the-golden-spoon.com', crypt('password123', gen_salt('bf')), now(), 
   '{"display_name": "David Chen", "user_type": "business"}'::jsonb, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Insert corresponding profiles
INSERT INTO public.profiles (user_id, email, display_name, user_role)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'owner@joes-pizza.com', 'Joe Martinez', 'business'),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'manager@mamas-kitchen.com', 'Maria Rodriguez', 'business'),
  ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'chef@the-golden-spoon.com', 'David Chen', 'business')
ON CONFLICT (user_id) DO NOTHING;

-- Insert business profiles
INSERT INTO public.business_profiles (user_id, business_name, contact_name, business_address, business_website)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'Joe''s Pizza Palace', 'Joe Martinez', '123 Main St, New York, NY 10001', 'https://joes-pizza.com'),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'Mama''s Kitchen', 'Maria Rodriguez', '456 Oak Ave, Los Angeles, CA 90210', 'https://mamas-kitchen.com'),
  ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'The Golden Spoon', 'David Chen', '789 Pine St, Chicago, IL 60601', 'https://golden-spoon.com')
ON CONFLICT (user_id) DO NOTHING;

-- Insert business claims (verified)
INSERT INTO public.business_claims (user_id, restaurant_name, business_email, business_phone, status, phone_verified, email_verified, verification_step, verified_at, place_id)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'Joe''s Pizza Palace', 'owner@joes-pizza.com', '+1-555-0101', 'verified', true, true, 'verified', now(), 'ChIJN1t_tDeuEmsRUsoyG83frY4'),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'Mama''s Kitchen', 'manager@mamas-kitchen.com', '+1-555-0102', 'verified', true, true, 'verified', now(), 'ChIJN1t_tDeuEmsRUsoyG83frY5'),
  ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'The Golden Spoon', 'chef@the-golden-spoon.com', '+1-555-0103', 'verified', true, true, 'verified', now(), 'ChIJN1t_tDeuEmsRUsoyG83frY6')
ON CONFLICT DO NOTHING;