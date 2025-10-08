-- Create complete test business account for Joe's Pizza (test@joes-pizza.com)

DO $$
DECLARE
  test_user_id UUID;
  test_business_claim_id UUID;
  test_request_id UUID;
  test_recommendation_id UUID;
  test_referral_link_id UUID;
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
  ON CONFLICT DO NOTHING
  RETURNING id INTO test_business_claim_id;

  -- Create a test food request
  INSERT INTO public.food_requests (
    requester_id,
    food_type,
    location_city,
    location_state,
    location_address,
    status,
    response_window
  )
  VALUES (
    test_user_id,
    'Pizza',
    'New York',
    'NY',
    '456 Test Ave, New York, NY',
    'closed',
    120
  )
  RETURNING id INTO test_request_id;

  -- Create a test recommendation
  INSERT INTO public.recommendations (
    request_id,
    recommender_id,
    restaurant_name,
    place_id,
    restaurant_address,
    confidence_score,
    notes
  )
  VALUES (
    test_request_id,
    test_user_id,
    'Joe''s Pizza',
    'ChIJN1t_tDeuEmsRUsoyG83frY4',
    '123 Pizza Street, New York, NY 10001',
    5,
    'Best pizza in town!'
  )
  RETURNING id INTO test_recommendation_id;

  -- Create a referral link
  INSERT INTO public.referral_links (
    recommendation_id,
    request_id,
    restaurant_name,
    place_id,
    referral_code
  )
  VALUES (
    test_recommendation_id,
    test_request_id,
    'Joe''s Pizza',
    'ChIJN1t_tDeuEmsRUsoyG83frY4',
    generate_referral_code()
  )
  RETURNING id INTO test_referral_link_id;

  -- Create sample referral clicks with conversions
  -- Click 1: Converted for $25 (commission paid)
  INSERT INTO public.referral_clicks (
    referral_link_id,
    request_id,
    recommendation_id,
    requester_id,
    recommender_id,
    restaurant_name,
    place_id,
    clicked_at,
    converted,
    conversion_value,
    converted_at,
    commission_rate,
    commission_amount,
    commission_paid,
    commission_paid_at,
    conversion_method
  )
  VALUES (
    test_referral_link_id,
    test_request_id,
    test_recommendation_id,
    test_user_id,
    test_user_id,
    'Joe''s Pizza',
    'ChIJN1t_tDeuEmsRUsoyG83frY4',
    now() - interval '5 days',
    true,
    25.00,
    now() - interval '5 days',
    0.10,
    2.50,
    true,
    now() - interval '3 days',
    'business_verified'
  );

  -- Click 2: Converted for $50 (pending commission)
  INSERT INTO public.referral_clicks (
    referral_link_id,
    request_id,
    recommendation_id,
    requester_id,
    recommender_id,
    restaurant_name,
    place_id,
    clicked_at,
    converted,
    conversion_value,
    converted_at,
    commission_rate,
    commission_amount,
    commission_paid,
    conversion_method
  )
  VALUES (
    test_referral_link_id,
    test_request_id,
    test_recommendation_id,
    test_user_id,
    test_user_id,
    'Joe''s Pizza',
    'ChIJN1t_tDeuEmsRUsoyG83frY4',
    now() - interval '2 days',
    true,
    50.00,
    now() - interval '2 days',
    0.10,
    5.00,
    false,
    'business_verified'
  );

  -- Click 3: Converted for $35 (pending commission)
  INSERT INTO public.referral_clicks (
    referral_link_id,
    request_id,
    recommendation_id,
    requester_id,
    recommender_id,
    restaurant_name,
    place_id,
    clicked_at,
    converted,
    conversion_value,
    converted_at,
    commission_rate,
    commission_amount,
    commission_paid,
    conversion_method
  )
  VALUES (
    test_referral_link_id,
    test_request_id,
    test_recommendation_id,
    test_user_id,
    test_user_id,
    'Joe''s Pizza',
    'ChIJN1t_tDeuEmsRUsoyG83frY4',
    now() - interval '1 day',
    true,
    35.00,
    now() - interval '1 day',
    0.10,
    3.50,
    false,
    'business_verified'
  );

  -- Click 4: Not converted yet
  INSERT INTO public.referral_clicks (
    referral_link_id,
    request_id,
    recommendation_id,
    requester_id,
    recommender_id,
    restaurant_name,
    place_id,
    clicked_at,
    converted,
    commission_rate
  )
  VALUES (
    test_referral_link_id,
    test_request_id,
    test_recommendation_id,
    test_user_id,
    test_user_id,
    'Joe''s Pizza',
    'ChIJN1t_tDeuEmsRUsoyG83frY4',
    now() - interval '3 hours',
    false,
    0.10
  );

  -- Click 5: Another pending click
  INSERT INTO public.referral_clicks (
    referral_link_id,
    request_id,
    recommendation_id,
    requester_id,
    recommender_id,
    restaurant_name,
    place_id,
    clicked_at,
    converted,
    commission_rate
  )
  VALUES (
    test_referral_link_id,
    test_request_id,
    test_recommendation_id,
    test_user_id,
    test_user_id,
    'Joe''s Pizza',
    'ChIJN1t_tDeuEmsRUsoyG83frY4',
    now() - interval '1 hour',
    false,
    0.10
  );

END $$;