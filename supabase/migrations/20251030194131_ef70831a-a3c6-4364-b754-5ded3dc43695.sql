-- Fix critical RLS policy vulnerabilities

-- 1. Block client updates to referral_clicks (prevents financial fraud)
DROP POLICY IF EXISTS "System can update referral clicks for conversions" ON public.referral_clicks;

CREATE POLICY "Block direct client updates to referral clicks"
ON public.referral_clicks
FOR UPDATE
USING (false)
WITH CHECK (false);
-- Note: Edge functions using service role key will bypass this and still work

-- 2. Block client inserts to system tables (prevents gaming/spam)
DROP POLICY IF EXISTS "system_can_insert_notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert points events" ON public.points_events;
DROP POLICY IF EXISTS "System can insert referral links" ON public.referral_links;
DROP POLICY IF EXISTS "System can insert referral clicks" ON public.referral_clicks;

CREATE POLICY "Block direct client notification inserts"
ON public.notifications
FOR INSERT
WITH CHECK (false);

CREATE POLICY "Block direct client points inserts"
ON public.points_events
FOR INSERT
WITH CHECK (false);

CREATE POLICY "Block direct client referral link inserts"
ON public.referral_links
FOR INSERT
WITH CHECK (false);

CREATE POLICY "Block direct client referral click inserts"
ON public.referral_clicks
FOR INSERT
WITH CHECK (false);

-- Note: All edge functions use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS,
-- so this only blocks unauthorized client-side inserts/updates