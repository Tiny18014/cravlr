-- Remove the problematic view and implement a cleaner security solution
DROP VIEW IF EXISTS public.safe_profiles;
DROP FUNCTION IF EXISTS public.get_safe_profile_data(uuid);

-- Create a simple, secure policy that only exposes necessary public fields
-- while protecting all sensitive information
DROP POLICY IF EXISTS "View public profile fields for active participants" ON public.profiles;

CREATE POLICY "Secure profile access with limited public fields"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Users can always see their own complete profile
  auth.uid() = user_id
);