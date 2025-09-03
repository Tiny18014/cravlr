-- Fix RLS policy to allow any authenticated user to read active requests
DROP POLICY IF EXISTS "read_active_requests_realtime" ON public.food_requests;
CREATE POLICY "read_active_requests_realtime"
ON public.food_requests
FOR SELECT
TO anon, authenticated
USING (status = 'active'::request_status);

-- Ensure recommendations can be read by anyone for live count updates  
DROP POLICY IF EXISTS "read_recommendations_for_live_updates" ON public.recommendations;
CREATE POLICY "read_recommendations_for_live_updates"
ON public.recommendations
FOR SELECT
TO anon, authenticated
USING (true);