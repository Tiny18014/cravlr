-- 🔥 COMPREHENSIVE REAL-TIME TEST SCRIPT 🔥
-- Run these tests to verify the 4 fixes are working:
-- 1. Subscription doesn't require coords 
-- 2. Explicit status: 'active' 
-- 3. Shows events even without coords 
-- 4. Realtime status verification

-- ======= IMMEDIATE TEST (Run this first) =======
-- Test 1: City-only request (no coordinates) - should now appear instantly!
INSERT INTO public.food_requests (
  id,
  requester_id, 
  food_type,
  location_city,
  location_state,
  additional_notes,
  response_window,
  status,  -- 🔥 EXPLICIT status: 'active'
  created_at,
  expires_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1), -- Use any existing user ID
  'Test City-Level Request',
  'Concord',
  'North Carolina', 
  '🔥 HOTFIX TEST: Should appear even without GPS coordinates!',
  5, -- 5 minute quick request (should vibrate)
  'active',  -- 🔥 CRITICAL: Must be active to pass RLS
  now(),
  now() + interval '5 minutes'
);

-- Watch for these logs in recommender console:
-- 🔴 Realtime subscription status: SUBSCRIBED
-- 🆕 === INSERT EVENT RECEIVED ===
-- ⚠️ No GPS coordinates - showing city-level
-- In range? true Precision: city
-- ✅ Adding new request to state

-- ======= GPS TEST =======

-- Test 2: Quick request WITH GPS coordinates
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
  (SELECT id FROM auth.users LIMIT 1),
  'Fresh Sushi',
  35.4087,   -- Concord, NC coordinates
  -80.5792,
  'Concord',
  'North Carolina', 
  'Downtown area',
  'GPS-level test with vibration!',
  5, -- 5 minute quick request (should vibrate)
  'active',
  now(),
  now() + interval '5 minutes'
);

-- Test 3: Soon request (30 minutes) with coordinates
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
  'Italian Pasta',
  35.4000,   -- Slightly different coordinates within 15km
  -80.5500,
  'Concord',
  'North Carolina',
  'Anniversary dinner tonight!',
  30, -- 30 minute soon request
  'active',
  now(),
  now() + interval '30 minutes'
);

-- Test 4: Extended request (2 hours) with coordinates
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
  'BBQ Ribs',
  35.4200,
  -80.5600,
  'Concord',
  'North Carolina',
  120, -- 2 hour extended request
  'active',
  now(),
  now() + interval '2 hours'
);

-- Verify the insertions worked and show the exact data being sent via realtime
SELECT 
  id,
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
FROM public.food_requests 
WHERE created_at > now() - interval '2 minutes'
ORDER BY created_at DESC;