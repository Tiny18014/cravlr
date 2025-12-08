-- Fix: Recreate policies as PERMISSIVE (OR logic) instead of RESTRICTIVE (AND logic)
DROP POLICY IF EXISTS "Anyone can view active requests" ON public.food_requests;
DROP POLICY IF EXISTS "Users can view their own requests" ON public.food_requests;

-- Create PERMISSIVE policies - either condition allows access
CREATE POLICY "Anyone can view active requests" 
ON public.food_requests 
FOR SELECT 
USING (status = 'active');

CREATE POLICY "Users can view their own requests" 
ON public.food_requests 
FOR SELECT 
USING (auth.uid() = requester_id);

-- Ensure policies are permissive (default, but explicit for clarity)
ALTER POLICY "Anyone can view active requests" ON public.food_requests USING (status = 'active');
ALTER POLICY "Users can view their own requests" ON public.food_requests USING (auth.uid() = requester_id);