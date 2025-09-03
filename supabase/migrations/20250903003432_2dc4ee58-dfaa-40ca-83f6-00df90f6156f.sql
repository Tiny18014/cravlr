-- Ensure we have the correct RLS policy for reading open requests
DROP POLICY IF EXISTS "read_open_requests" ON public.food_requests;
CREATE POLICY "read_open_requests"
ON public.food_requests
FOR SELECT
TO anon, authenticated
USING (status = 'active'::request_status);

-- Create request_user_state table for Accept/Ignore functionality
CREATE TABLE IF NOT EXISTS public.request_user_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.food_requests(id) ON DELETE CASCADE,
  state TEXT NOT NULL CHECK (state IN ('accepted', 'ignored')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, request_id)
);

-- Enable RLS on request_user_state
ALTER TABLE public.request_user_state ENABLE ROW LEVEL SECURITY;

-- RLS policies for request_user_state
CREATE POLICY "Users can manage their own request states"
ON public.request_user_state
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add Do Not Disturb preferences to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS do_not_disturb BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS quiet_hours_start TIME,
ADD COLUMN IF NOT EXISTS quiet_hours_end TIME,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_request_user_state_user_id ON public.request_user_state(user_id);
CREATE INDEX IF NOT EXISTS idx_request_user_state_request_id ON public.request_user_state(request_id);
CREATE INDEX IF NOT EXISTS idx_food_requests_location ON public.food_requests(location_lat, location_lng) WHERE status = 'active';