-- Update RLS policies for referral_clicks to include admin access
DROP POLICY IF EXISTS "Users can view referral clicks they're involved in or admins can view all" ON public.referral_clicks;
DROP POLICY IF EXISTS "Only admins can update conversion data" ON public.referral_clicks;
DROP POLICY IF EXISTS "Admins can insert converted referral clicks" ON public.referral_clicks;

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