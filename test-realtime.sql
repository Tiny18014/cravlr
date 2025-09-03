-- Test SQL to manually insert a food request and verify real-time notifications
-- Run this in the SQL Editor to test if the second account sees the card instantly

-- Test 1: Quick request (5 minutes) near Concord, NC
INSERT INTO public.food_requests (
  id,
  requester_id, 
  food_type,
  location_lat,
  location_lng,
  location_city,
  location_state,
  location_address,
  additional_notes,
  response_window,
  status,
  created_at,
  expires_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1), -- Use any existing user ID
  'Sushi',
  35.4087,   -- Concord, NC coordinates
  -80.5792,
  'Concord',
  'North Carolina', 
  'Downtown area',
  'Looking for fresh sushi for lunch!',
  5, -- 5 minute quick request
  'active',
  now(),
  now() + interval '5 minutes'
);

-- Test 2: Soon request (30 minutes) 
INSERT INTO public.food_requests (
  id,
  requester_id,
  food_type,
  location_lat,
  location_lng,
  location_city,
  location_state,
  additional_notes,
  response_window,
  status,
  created_at,
  expires_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1),
  'Italian',
  35.4000,   -- Slightly different coordinates within 15km
  -80.5500,
  'Concord',
  'North Carolina',
  'Celebrating anniversary tonight!',
  30, -- 30 minute soon request
  'active',
  now(),
  now() + interval '30 minutes'
);

-- Test 3: Extended request (2 hours)
INSERT INTO public.food_requests (
  id, 
  requester_id,
  food_type,
  location_lat,
  location_lng,
  location_city,
  location_state,
  response_window,
  status,
  created_at,
  expires_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1),
  'BBQ',
  35.4200,
  -80.5600,
  'Concord',
  'North Carolina',
  120, -- 2 hour extended request
  'active',
  now(),
  now() + interval '2 hours'
);

-- Verify the insertions worked
SELECT 
  id,
  food_type,
  location_lat,
  location_lng,
  location_city,
  response_window,
  status,
  created_at,
  expires_at
FROM public.food_requests 
WHERE created_at > now() - interval '1 minute'
ORDER BY created_at DESC;