-- Enable Supabase Realtime on the food_requests table
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_requests;

-- Ensure RLS allows reading active requests for realtime updates
-- (this policy should already exist but let's ensure it's correct)
DROP POLICY IF EXISTS "read_active_requests_realtime" ON public.food_requests;
CREATE POLICY "read_active_requests_realtime"
ON public.food_requests
FOR SELECT
TO anon, authenticated
USING (status = 'active'::request_status);

-- Also enable realtime on recommendations table for live count updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.recommendations;