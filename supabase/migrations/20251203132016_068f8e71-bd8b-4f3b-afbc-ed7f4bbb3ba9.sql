-- Add recommender pause columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS recommender_paused boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recommender_paused_at timestamp with time zone;

-- Create a function that allows users to self-assign initial roles (both requester and recommender)
-- This runs ONLY if the user has no roles yet
CREATE OR REPLACE FUNCTION public.self_assign_initial_roles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_count integer;
BEGIN
  -- Check if user already has any roles
  SELECT COUNT(*) INTO role_count
  FROM public.user_roles
  WHERE user_id = auth.uid();

  -- Only allow if user has no roles
  IF role_count = 0 THEN
    -- Assign both requester and recommender roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES 
      (auth.uid(), 'requester'),
      (auth.uid(), 'recommender')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.self_assign_initial_roles() TO authenticated;