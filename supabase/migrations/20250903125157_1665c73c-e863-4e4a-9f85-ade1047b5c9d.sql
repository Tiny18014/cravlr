-- Create a new RLS policy that allows viewing display names publicly
CREATE POLICY "Public access to display names" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Note: This allows all users to see display names of all other users
-- This is necessary for the recommendation system to show who made requests