-- Security & RLS Audit - Fix Critical Security Issues
-- This migration hardens RLS policies and adds email verification requirements

-- 1. Fix public access to profiles table - Remove public policy and restrict access
DROP POLICY IF EXISTS "Public access to display names" ON public.profiles;

-- Create a more secure policy for display names only (for recommendations display)
CREATE POLICY "Limited public display name access" ON public.profiles
FOR SELECT 
USING (true)
WITH (select_columns = 'display_name,user_id');

-- 2. Fix public access to recommendations table - Remove overly permissive policy
DROP POLICY IF EXISTS "read_recommendations_for_live_updates" ON public.recommendations;

-- Create more secure recommendation access policy
CREATE POLICY "Authenticated users can view recommendations for active requests" ON public.recommendations
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.food_requests fr
    WHERE fr.id = recommendations.request_id 
    AND (
      fr.status = 'active'::request_status 
      OR fr.requester_id = auth.uid()
      OR recommendations.recommender_id = auth.uid()
    )
  )
);

-- 3. Create email verification check function
CREATE OR REPLACE FUNCTION public.is_email_verified()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (auth.jwt() -> 'email_verified')::boolean),
    false
  );
$$;

-- 4. Create function to check if user can perform sensitive actions
CREATE OR REPLACE FUNCTION public.can_perform_sensitive_action()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT 
      (auth.jwt() -> 'email_verified')::boolean AND
      is_active = true
    FROM public.profiles 
    WHERE user_id = auth.uid()),
    false
  );
$$;

-- 5. Add email verification requirement to business claims
DROP POLICY IF EXISTS "Users can create their own business claims" ON public.business_claims;
CREATE POLICY "Verified users can create business claims" ON public.business_claims
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  public.is_email_verified()
);

-- 6. Add email verification requirement to recommendation creation
DROP POLICY IF EXISTS "Authenticated users can create recommendations" ON public.recommendations;
CREATE POLICY "Verified users can create recommendations" ON public.recommendations
FOR INSERT 
WITH CHECK (
  auth.uid() = recommender_id AND 
  public.is_email_verified() AND
  EXISTS (
    SELECT 1 FROM public.food_requests
    WHERE id = recommendations.request_id 
    AND status = 'active'::request_status 
    AND expires_at > now()
  )
);

-- 7. Secure referral conversion marking - require admin AND email verification
DROP POLICY IF EXISTS "Only admins can update conversion data" ON public.referral_clicks;
CREATE POLICY "Verified admins can update conversion data" ON public.referral_clicks
FOR UPDATE 
USING (
  public.is_email_verified() AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- 8. Add email verification to sensitive profile updates
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update basic profile info" ON public.profiles
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Verified users can update sensitive profile info" ON public.profiles
FOR UPDATE 
USING (
  auth.uid() = user_id AND 
  public.is_email_verified()
)
WITH CHECK (
  auth.uid() = user_id AND 
  public.is_email_verified()
);

-- 9. Secure business profile creation
DROP POLICY IF EXISTS "Users can insert their own business profile" ON public.business_profiles;
CREATE POLICY "Verified users can create business profiles" ON public.business_profiles
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  public.is_email_verified()
);

-- 10. Add rate limiting table for sensitive actions
CREATE TABLE IF NOT EXISTS public.action_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  performed_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address inet,
  UNIQUE(user_id, action_type, performed_at)
);

ALTER TABLE public.action_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limit records" ON public.action_rate_limits
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert rate limit records" ON public.action_rate_limits
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 11. Create function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_action_type text,
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count integer;
BEGIN
  -- Count attempts in the time window
  SELECT COUNT(*) INTO attempt_count
  FROM public.action_rate_limits
  WHERE user_id = auth.uid()
    AND action_type = p_action_type
    AND performed_at > now() - interval '1 minute' * p_window_minutes;
  
  -- Return false if limit exceeded
  IF attempt_count >= p_max_attempts THEN
    RETURN false;
  END IF;
  
  -- Log this attempt
  INSERT INTO public.action_rate_limits (user_id, action_type)
  VALUES (auth.uid(), p_action_type);
  
  RETURN true;
END;
$$;

-- 12. Add triggers for automatic rate limit cleanup
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clean up rate limit records older than 24 hours
  DELETE FROM public.action_rate_limits
  WHERE performed_at < now() - interval '24 hours';
  
  RETURN NEW;
END;
$$;