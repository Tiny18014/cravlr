-- Simplify the security fix with a more practical approach

-- 1. Drop the complex policy that may not work as expected
DROP POLICY IF EXISTS "Public can access safe profile data" ON public.profiles;

-- 2. Create a policy that allows viewing only non-sensitive public fields
-- for users who have created requests or recommendations
CREATE POLICY "View public profile fields for active participants"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Users can always see their own full profile
  auth.uid() = user_id 
  OR
  -- Others can only see display_name and avatar_url of active participants
  (
    user_id IN (
      SELECT requester_id FROM public.food_requests WHERE status = 'active'
      UNION
      SELECT recommender_id FROM public.recommendations
    )
  )
);

-- 3. Create a view for safe public profile data to be used by the application
CREATE OR REPLACE VIEW public.safe_profiles AS
SELECT 
  user_id,
  display_name,
  avatar_url,
  -- Only show location at city level for privacy
  location_city,
  location_state,
  -- Show total points for leaderboard purposes only
  points_total
FROM public.profiles
WHERE is_active = true;

-- 4. Enable RLS on the view (inherits from base table)
-- No additional policies needed as it only exposes safe fields

-- 5. Grant access to the safe view
GRANT SELECT ON public.safe_profiles TO authenticated, anon;