-- Create verified business claim for test@joes-pizza.com as business-only account

DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Get the user_id for test@joes-pizza.com
  SELECT user_id INTO test_user_id 
  FROM public.profiles 
  WHERE email = 'test@joes-pizza.com';

  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'test@joes-pizza.com user not found';
  END IF;

  -- Create business profile
  INSERT INTO public.business_profiles (
    user_id,
    business_name,
    contact_name,
    business_address,
    business_website,
    commission_rate,
    subscription_tier
  )
  VALUES (
    test_user_id,
    'Joe''s Pizza',
    'Joe Smith',
    '123 Pizza Street, New York, NY 10001',
    'https://joespizza.example.com',
    0.10,
    'basic'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    business_name = EXCLUDED.business_name,
    contact_name = EXCLUDED.contact_name;

  -- Create verified business claim
  INSERT INTO public.business_claims (
    user_id,
    restaurant_name,
    place_id,
    business_email,
    business_phone,
    phone_verified,
    email_verified,
    status,
    verification_step,
    verified_at
  )
  VALUES (
    test_user_id,
    'Joe''s Pizza',
    'ChIJN1t_tDeuEmsRUsoyG83frY4',
    'test@joes-pizza.com',
    '+1234567890',
    true,
    true,
    'verified',
    'manual_review',
    now()
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Successfully created verified business claim for test@joes-pizza.com';
END $$;