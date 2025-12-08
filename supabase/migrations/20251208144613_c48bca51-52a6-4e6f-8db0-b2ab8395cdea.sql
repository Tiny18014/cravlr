-- Allow users to view their own requests regardless of status (for viewing expired request results)
DROP POLICY IF EXISTS "Anyone can view active requests" ON public.food_requests;

-- Create two policies: one for public active requests, one for own requests
CREATE POLICY "Anyone can view active requests" 
ON public.food_requests 
FOR SELECT 
USING (status = 'active');

CREATE POLICY "Users can view their own requests" 
ON public.food_requests 
FOR SELECT 
USING (auth.uid() = requester_id);