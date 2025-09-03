-- Create sample referral click data for testing
-- First, let's set one user as admin for testing
UPDATE public.profiles 
SET is_admin = true 
WHERE user_id = (
  SELECT user_id 
  FROM public.profiles 
  LIMIT 1
);

-- Insert some sample referral clicks data
-- This will create test data using existing users and requests
DO $$
DECLARE 
    sample_user_1 uuid;
    sample_user_2 uuid;
    sample_request uuid;
BEGIN
    -- Get two existing users
    SELECT user_id INTO sample_user_1 FROM public.profiles LIMIT 1;
    SELECT user_id INTO sample_user_2 FROM public.profiles OFFSET 1 LIMIT 1;
    
    -- Get an existing request
    SELECT id INTO sample_request FROM public.food_requests LIMIT 1;
    
    -- Only insert if we have the required data
    IF sample_user_1 IS NOT NULL AND sample_user_2 IS NOT NULL AND sample_request IS NOT NULL THEN
        -- Insert test referral clicks
        INSERT INTO public.referral_clicks (
            recommendation_id,
            request_id,
            recommender_id,
            requester_id,
            restaurant_name,
            place_id,
            click_source,
            converted,
            clicked_at
        ) VALUES 
        (
            gen_random_uuid(), -- placeholder recommendation_id
            sample_request,
            sample_user_1,
            sample_user_2,
            'Test Restaurant #1',
            'ChIJtest123',
            'link',
            false,
            now() - interval '2 days'
        ),
        (
            gen_random_uuid(), -- placeholder recommendation_id
            sample_request,
            sample_user_2,
            sample_user_1,
            'Test Restaurant #2',
            'ChIJtest456',
            'call',
            false,
            now() - interval '1 day'
        );
        
        RAISE NOTICE 'Sample referral clicks created successfully';
    ELSE
        RAISE NOTICE 'Not enough existing data to create sample referral clicks';
    END IF;
END $$;