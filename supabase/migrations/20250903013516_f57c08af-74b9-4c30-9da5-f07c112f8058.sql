-- Ensure RLS policy allows reading active requests for realtime
DROP POLICY IF EXISTS "read_active_requests_realtime" ON public.food_requests;
CREATE POLICY "read_active_requests_realtime"
ON public.food_requests 
FOR SELECT 
TO authenticated
USING (status = 'active'::request_status);

-- Enable replica identity for complete row data in realtime updates
ALTER TABLE public.food_requests REPLICA IDENTITY FULL;
ALTER TABLE public.recommendations REPLICA IDENTITY FULL;