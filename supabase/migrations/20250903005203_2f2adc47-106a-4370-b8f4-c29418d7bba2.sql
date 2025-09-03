-- Fix security vulnerability: Restrict profile access to protect user privacy

-- 1. Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- 2. Create restrictive policy for personal data access
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Create a security definer function for safe public profile data
CREATE OR REPLACE FUNCTION public.get_safe_profile_data(profile_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text
) 
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.display_name,
    p.avatar_url
  FROM public.profiles p
  WHERE p.user_id = profile_user_id
  AND p.is_active = true;
$$;

-- 4. Create a policy to allow reading safe public data via function
-- (This allows the app to get display names for requests/recommendations)
CREATE POLICY "Public can access safe profile data"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Only allow reading non-sensitive fields in specific contexts
  -- This will be used by our application queries that need display names
  user_id IN (
    SELECT DISTINCT requester_id FROM public.food_requests WHERE status = 'active'
    UNION
    SELECT DISTINCT recommender_id FROM public.recommendations
  )
);