-- ============================================
-- SECURITY FIX: Comprehensive Error-Level Issues
-- ============================================

-- 1. CREATE USER ROLES SYSTEM (fix admin privilege escalation)
-- ============================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Migrate existing admin users to user_roles table
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::public.app_role
FROM public.profiles
WHERE is_admin = true
ON CONFLICT (user_id, role) DO NOTHING;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Update is_admin function to use new role system
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(COALESCE(uid, auth.uid()), 'admin'::public.app_role);
$$;

-- RLS policies for user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. REMOVE PLAIN TEXT VERIFICATION CODES
-- ============================================
-- Drop the plain text verification code columns from business_claims
ALTER TABLE public.business_claims 
  DROP COLUMN IF EXISTS phone_verification_code,
  DROP COLUMN IF EXISTS email_verification_code;

-- Add explicit DENY policy to verification_codes table
DROP POLICY IF EXISTS "No direct access to verification codes" ON public.verification_codes;
CREATE POLICY "No direct access to verification codes"
ON public.verification_codes
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- 3. TIGHTEN PROFILES TABLE RLS (prevent email harvesting)
-- ============================================
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create strict policies - users can only see their own profile
CREATE POLICY "Users can view only their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update only their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert only their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view/update all profiles using the new role system
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. UPDATE BUSINESS PROFILES RLS
-- ============================================
DROP POLICY IF EXISTS "Admins can view all business profiles" ON public.business_profiles;
DROP POLICY IF EXISTS "Admins can update all business profiles" ON public.business_profiles;

CREATE POLICY "Admins can view all business profiles"
ON public.business_profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update all business profiles"
ON public.business_profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5. UPDATE BUSINESS CLAIMS RLS
-- ============================================
DROP POLICY IF EXISTS "Admins can view all business claims" ON public.business_claims;
DROP POLICY IF EXISTS "Admins can update business claims" ON public.business_claims;

CREATE POLICY "Admins can view all business claims"
ON public.business_claims
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update business claims"
ON public.business_claims
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 6. UPDATE guru_weekly_themes RLS
-- ============================================
DROP POLICY IF EXISTS "Admins can manage themes" ON public.guru_weekly_themes;

CREATE POLICY "Admins can manage themes"
ON public.guru_weekly_themes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 7. COMMENT: is_admin column deprecated
COMMENT ON COLUMN public.profiles.is_admin IS 'DEPRECATED: Use user_roles table and has_role() function instead. Kept for backward compatibility only.';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);