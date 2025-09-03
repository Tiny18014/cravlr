-- Create points_events audit table
CREATE TABLE IF NOT EXISTS public.points_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  points integer NOT NULL,
  type text NOT NULL DEFAULT 'conversion_bonus',
  referral_click_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on points_events
ALTER TABLE public.points_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for points_events
CREATE POLICY "Users can view their own points events" 
ON public.points_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert points events" 
ON public.points_events 
FOR INSERT 
WITH CHECK (true);