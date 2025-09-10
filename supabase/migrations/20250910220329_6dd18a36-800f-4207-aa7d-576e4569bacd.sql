-- Test admin access by temporarily setting the current user context
-- This simulates being logged in as the admin user
SET LOCAL auth.uid TO '908b02df-ba5b-4e23-8aec-90401ed04b8e';

-- Check if admin can see all business claims
SELECT COUNT(*) as admin_can_see FROM public.business_claims;

-- Reset and test as non-admin user
SET LOCAL auth.uid TO 'de470525-a51f-4fb9-8303-8e104bf02636';

-- Check what non-admin user can see (should only see their own claims)
SELECT COUNT(*) as non_admin_can_see FROM public.business_claims;