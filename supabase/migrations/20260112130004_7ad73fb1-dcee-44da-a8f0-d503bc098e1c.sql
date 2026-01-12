-- Fix overly permissive RLS policies that use USING (true) or WITH CHECK (true)
-- These policies should use (false) since service role bypasses RLS anyway

-- 1. Fix email_notification_logs - Service role can manage email logs
DROP POLICY IF EXISTS "Service role can manage email logs" ON public.email_notification_logs;
CREATE POLICY "Service role can manage email logs"
ON public.email_notification_logs
FOR ALL
USING (false)
WITH CHECK (false);

-- 2. Fix rate_limit_attempts - Only service role inserts rate limits
DROP POLICY IF EXISTS "Only service role inserts rate limits" ON public.rate_limit_attempts;
CREATE POLICY "Only service role inserts rate limits"
ON public.rate_limit_attempts
FOR INSERT
WITH CHECK (false);

-- 3. Fix locations - Service role can insert locations
DROP POLICY IF EXISTS "Service role can insert locations" ON public.locations;
CREATE POLICY "Service role can insert locations"
ON public.locations
FOR INSERT
WITH CHECK (false);

-- 4. Fix locations - Service role can update locations
DROP POLICY IF EXISTS "Service role can update locations" ON public.locations;
CREATE POLICY "Service role can update locations"
ON public.locations
FOR UPDATE
USING (false);

-- 5. Fix places - Service role can insert places
DROP POLICY IF EXISTS "Service role can insert places" ON public.places;
CREATE POLICY "Service role can insert places"
ON public.places
FOR INSERT
WITH CHECK (false);

-- 6. Fix places - Service role can update places
DROP POLICY IF EXISTS "Service role can update places" ON public.places;
CREATE POLICY "Service role can update places"
ON public.places
FOR UPDATE
USING (false);