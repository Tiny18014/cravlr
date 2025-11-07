-- Fix 1: Add authorization check to assign_user_role function
-- This prevents privilege escalation by requiring admin role to assign roles
CREATE OR REPLACE FUNCTION public.assign_user_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin access required to assign roles';
  END IF;
  
  -- Insert the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Fix 2: Restrict profile visibility to prevent data exposure
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create restrictive policy: users can see their own profile and profiles of recommenders
CREATE POLICY "Users view own profile and recommenders" ON public.profiles
FOR SELECT TO authenticated
USING (
  auth.uid() = id  -- Own profile
  OR
  id IN (  -- Recommenders who have made recommendations
    SELECT DISTINCT r.recommender_id 
    FROM public.recommendations r
    WHERE r.status = 'pending' OR r.status = 'accepted'
  )
  OR
  id IN (  -- Users who created public guru maps
    SELECT DISTINCT gm.created_by 
    FROM public.guru_maps gm
    WHERE gm.is_public = true
  )
);