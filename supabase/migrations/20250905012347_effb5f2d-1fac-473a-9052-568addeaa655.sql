-- Allow the requester to SELECT their own rows regardless of status
DROP POLICY IF EXISTS requester_select_any_status ON public.food_requests;
CREATE POLICY requester_select_any_status
ON public.food_requests
FOR SELECT
USING (requester_id = auth.uid());

-- Add explicit UPDATE policy for visibility in realtime
DROP POLICY IF EXISTS requester_update_visibility ON public.food_requests;
CREATE POLICY requester_update_visibility
ON public.food_requests
FOR UPDATE
USING (requester_id = auth.uid());