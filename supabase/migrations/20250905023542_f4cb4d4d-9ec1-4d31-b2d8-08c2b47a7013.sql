-- Ensure requester can see their own requests in any status for realtime updates
CREATE POLICY "requester_select_any_status_realtime" 
ON public.food_requests 
FOR SELECT 
USING (requester_id = auth.uid());

-- Enable realtime for food_requests table
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_requests;