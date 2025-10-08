-- Clean up all test data for test@joes-pizza.com to start fresh

DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Get the user_id for test@joes-pizza.com
  SELECT user_id INTO test_user_id 
  FROM public.profiles 
  WHERE email = 'test@joes-pizza.com';

  IF test_user_id IS NULL THEN
    RAISE NOTICE 'test@joes-pizza.com user not found';
    RETURN;
  END IF;

  -- Delete referral clicks
  DELETE FROM public.referral_clicks
  WHERE recommender_id = test_user_id OR requester_id = test_user_id;

  -- Delete referral links for this user's recommendations
  DELETE FROM public.referral_links
  WHERE recommendation_id IN (
    SELECT id FROM public.recommendations WHERE recommender_id = test_user_id
  );

  -- Delete recommendations
  DELETE FROM public.recommendations
  WHERE recommender_id = test_user_id;

  -- Delete food requests
  DELETE FROM public.food_requests
  WHERE requester_id = test_user_id;

  -- Delete business claims
  DELETE FROM public.business_claims
  WHERE user_id = test_user_id;

  -- Delete business profile
  DELETE FROM public.business_profiles
  WHERE user_id = test_user_id;

  -- Reset persona to 'both' (neutral state)
  UPDATE public.profiles
  SET persona = 'both'
  WHERE user_id = test_user_id;

  RAISE NOTICE 'Successfully cleaned up all test data for test@joes-pizza.com';
END $$;