-- Remove 'business' from user_role enum and rename to persona
-- First, create the new persona enum
CREATE TYPE public.persona AS ENUM ('requester', 'recommender', 'both');

-- Add the new persona column
ALTER TABLE public.profiles ADD COLUMN persona public.persona DEFAULT 'both';

-- Migrate existing data (convert 'business' users to 'both' persona)
UPDATE public.profiles 
SET persona = CASE 
  WHEN user_role = 'business' THEN 'both'::persona
  ELSE user_role::text::persona
END;

-- Make the new column NOT NULL
ALTER TABLE public.profiles ALTER COLUMN persona SET NOT NULL;

-- Drop the old user_role column
ALTER TABLE public.profiles DROP COLUMN user_role;

-- Drop the old enum
DROP TYPE public.user_role;

-- Create the is_admin helper function
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE user_id = uid),
    false
  );
$$;

-- Update RLS policies to use the new is_admin function

-- Update business_claims policies
DROP POLICY IF EXISTS "Admins can view all business claims" ON public.business_claims;
DROP POLICY IF EXISTS "Admins can update business claims" ON public.business_claims;

CREATE POLICY "Admins can view all business claims" 
ON public.business_claims 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can update business claims" 
ON public.business_claims 
FOR UPDATE 
USING (public.is_admin());

-- Update profiles policies for admin access
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.is_admin());

-- Update business_profiles policies for admin access
CREATE POLICY "Admins can view all business profiles" 
ON public.business_profiles 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can update all business profiles" 
ON public.business_profiles 
FOR UPDATE 
USING (public.is_admin());