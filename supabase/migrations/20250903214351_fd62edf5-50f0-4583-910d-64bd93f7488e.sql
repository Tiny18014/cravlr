-- Add conversion tracking fields to referral_clicks table
ALTER TABLE public.referral_clicks 
ADD COLUMN IF NOT EXISTS restaurant_name text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS place_id text,
ADD COLUMN IF NOT EXISTS click_source text NOT NULL DEFAULT 'link',
ADD COLUMN IF NOT EXISTS converted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS conversion_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS conversion_method text,
ADD COLUMN IF NOT EXISTS conversion_value numeric(10,2),
ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2) NOT NULL DEFAULT 0.10,
ADD COLUMN IF NOT EXISTS commission_amount numeric(10,2),
ADD COLUMN IF NOT EXISTS reported_by uuid,
ADD COLUMN IF NOT EXISTS notes text;

-- Ensure profiles table has required admin field
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Create points_events audit table for tracking point awards
CREATE TABLE IF NOT EXISTS public.points_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  points integer NOT NULL,
  type text NOT NULL DEFAULT 'conversion_bonus',
  referral_click_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  FOREIGN KEY (referral_click_id) REFERENCES public.referral_clicks(id) ON DELETE SET NULL
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

-- Update RLS policies for referral_clicks to include admin access
DROP POLICY IF EXISTS "Users can view their own referral clicks" ON public.referral_clicks;

CREATE POLICY "Users can view referral clicks they're involved in or admins can view all" 
ON public.referral_clicks 
FOR SELECT 
USING (
  (auth.uid() = requester_id) OR 
  (auth.uid() = recommender_id) OR 
  (auth.uid() = reported_by) OR 
  (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true))
);

CREATE POLICY "Only admins can update conversion data" 
ON public.referral_clicks 
FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can insert converted referral clicks" 
ON public.referral_clicks 
FOR INSERT 
WITH CHECK (
  (converted = false) OR 
  (converted = true AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true))
);

-- Function to award points on conversion
CREATE OR REPLACE FUNCTION public.award_points_on_conversion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  points_to_award INTEGER;
BEGIN
  -- Only run when converted changes from false to true
  IF NEW.converted = true AND OLD.converted = false THEN
    -- Calculate commission amount
    NEW.commission_amount = COALESCE(NEW.conversion_value, 0) * NEW.commission_rate;
    
    -- Calculate bonus points (30 points per $1 commission)
    points_to_award = FLOOR(NEW.commission_amount * 30);
    
    -- Update recommender's points
    UPDATE public.profiles
    SET 
      points_total = points_total + points_to_award,
      points_this_month = points_this_month + points_to_award
    WHERE user_id = NEW.recommender_id;
    
    -- Insert audit record
    INSERT INTO public.points_events (
      user_id,
      points,
      type,
      referral_click_id
    ) VALUES (
      NEW.recommender_id,
      points_to_award,
      'conversion_bonus',
      NEW.id
    );
    
    -- Log the conversion
    RAISE NOTICE 'Conversion awarded: % points to user % for referral %', 
      points_to_award, NEW.recommender_id, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for conversion point awarding
DROP TRIGGER IF EXISTS award_conversion_points_trigger ON public.referral_clicks;
CREATE TRIGGER award_conversion_points_trigger
  BEFORE UPDATE ON public.referral_clicks
  FOR EACH ROW
  EXECUTE FUNCTION public.award_points_on_conversion();

-- Create helpful view for recent conversions
CREATE OR REPLACE VIEW public.view_referral_conversions_recent AS
SELECT 
  rc.*,
  req_profile.display_name as requester_name,
  rec_profile.display_name as recommender_name,
  pe.points as awarded_points
FROM public.referral_clicks rc
LEFT JOIN public.profiles req_profile ON rc.requester_id = req_profile.user_id
LEFT JOIN public.profiles rec_profile ON rc.recommender_id = rec_profile.user_id
LEFT JOIN public.points_events pe ON rc.id = pe.referral_click_id AND pe.type = 'conversion_bonus'
WHERE rc.created_at >= now() - interval '90 days'
ORDER BY rc.conversion_at DESC NULLS LAST, rc.created_at DESC;