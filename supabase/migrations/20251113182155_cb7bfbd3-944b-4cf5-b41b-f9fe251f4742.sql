-- Fix 1: Restrict business profiles access
-- Drop overly permissive policy
DROP POLICY IF EXISTS "Anyone can view business profiles" ON business_profiles;

-- Only allow users to view their own business profiles
CREATE POLICY "Users can view own business profile"
ON business_profiles FOR SELECT
USING (auth.uid() = user_id);

-- Allow viewing business profiles for places in accepted recommendations
CREATE POLICY "View business profiles from accepted recommendations"
ON business_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM recommendations r
    INNER JOIN food_requests fr ON fr.id = r.request_id
    WHERE r.place_id = business_profiles.place_id
    AND r.status = 'accepted'
    AND fr.requester_id = auth.uid()
  )
);

-- Fix 2: Add rate limiting infrastructure
-- Create table to track rate limit attempts
CREATE TABLE IF NOT EXISTS public.rate_limit_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  ip_address TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on rate_limit_attempts
ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- Users can view their own rate limit attempts
CREATE POLICY "Users can view own rate limits"
ON public.rate_limit_attempts FOR SELECT
USING (auth.uid() = user_id);

-- Service role can insert rate limit attempts
CREATE POLICY "Service role can insert rate limits"
ON public.rate_limit_attempts FOR INSERT
WITH CHECK (true);

-- Create index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_attempts_user_action_time 
ON public.rate_limit_attempts(user_id, action_type, attempted_at);

CREATE INDEX IF NOT EXISTS idx_rate_limit_attempts_ip_action_time 
ON public.rate_limit_attempts(ip_address, action_type, attempted_at);

-- Create function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_ip_address TEXT,
  p_action_type TEXT,
  p_max_attempts INTEGER,
  p_window_minutes INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Count attempts in the time window
  SELECT COUNT(*) INTO attempt_count
  FROM public.rate_limit_attempts
  WHERE action_type = p_action_type
    AND attempted_at >= window_start
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id) OR
      (p_ip_address IS NOT NULL AND ip_address = p_ip_address)
    );
  
  -- Return true if under limit, false if exceeded
  RETURN attempt_count < p_max_attempts;
END;
$$;

-- Create function to log rate limit attempts
CREATE OR REPLACE FUNCTION public.log_rate_limit_attempt(
  p_user_id UUID,
  p_ip_address TEXT,
  p_action_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.rate_limit_attempts (user_id, ip_address, action_type)
  VALUES (p_user_id, p_ip_address, p_action_type);
END;
$$;

-- Cleanup function to remove old rate limit attempts (optional, run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove attempts older than 7 days
  DELETE FROM public.rate_limit_attempts
  WHERE attempted_at < NOW() - INTERVAL '7 days';
END;
$$;