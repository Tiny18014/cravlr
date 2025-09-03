-- Test realtime subscription by manually inserting a request
INSERT INTO public.food_requests (
  id, 
  requester_id, 
  food_type, 
  location_city, 
  location_state, 
  response_window, 
  status, 
  created_at, 
  expires_at,
  location_lat,
  location_lng
) VALUES (
  gen_random_uuid(), 
  gen_random_uuid(), 
  'Italian', 
  'Concord', 
  'North Carolina', 
  5, 
  'active', 
  now(), 
  now() + interval '5 minutes',
  35.4100756,
  -80.5819527
);

-- Check if the row was inserted and is visible
SELECT id, food_type, location_city, status, created_at 
FROM public.food_requests 
WHERE status = 'active'
ORDER BY created_at DESC 
LIMIT 5;