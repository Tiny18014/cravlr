-- Add new fields to food_requests table for lifecycle management
ALTER TABLE public.food_requests 
ADD COLUMN status request_status DEFAULT 'active'::request_status,
ADD COLUMN closed_at TIMESTAMP WITH TIME ZONE;

-- Update existing requests to have proper expiry (2 hours from creation)
UPDATE public.food_requests 
SET expires_at = created_at + interval '2 hours'
WHERE expires_at IS NULL OR expires_at = created_at + interval '2 hours';

-- Add location and points fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN location_lat NUMERIC,
ADD COLUMN location_lng NUMERIC,
ADD COLUMN points_total INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN points_this_month INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN notification_email TEXT;

-- Create recommendations table
CREATE TABLE public.recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.food_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_name TEXT NOT NULL CHECK (length(trim(restaurant_name)) >= 2 AND length(trim(restaurant_name)) <= 80),
  restaurant_slug TEXT NOT NULL,
  note TEXT CHECK (length(note) <= 140),
  link TEXT,
  awarded_points INTEGER DEFAULT 0 NOT NULL,
  awarded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(request_id, user_id)
);

-- Enable RLS on recommendations table
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for recommendations
CREATE POLICY "Users can view recommendations for requests they can see" 
ON public.recommendations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.food_requests 
    WHERE id = request_id 
    AND (status = 'active'::request_status OR requester_id = auth.uid())
  )
);

CREATE POLICY "Authenticated users can create recommendations" 
ON public.recommendations 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.food_requests 
    WHERE id = request_id 
    AND status = 'active'::request_status
    AND expires_at > now()
  )
);

CREATE POLICY "Users can update their own recommendations" 
ON public.recommendations 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add trigger for recommendations updated_at
CREATE TRIGGER update_recommendations_updated_at
BEFORE UPDATE ON public.recommendations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_recommendations_request_id ON public.recommendations(request_id);
CREATE INDEX idx_recommendations_user_id ON public.recommendations(user_id);
CREATE INDEX idx_food_requests_status_expires ON public.food_requests(status, expires_at);
CREATE INDEX idx_profiles_location ON public.profiles(location_lat, location_lng) WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;

-- Create function to generate restaurant slug
CREATE OR REPLACE FUNCTION public.slugify_restaurant_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.restaurant_slug = lower(trim(regexp_replace(NEW.restaurant_name, '[^a-zA-Z0-9\s]', '', 'g')));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate restaurant slug
CREATE TRIGGER recommendations_slugify_trigger
BEFORE INSERT OR UPDATE ON public.recommendations
FOR EACH ROW
EXECUTE FUNCTION public.slugify_restaurant_name();

-- Create function to auto-close requests
CREATE OR REPLACE FUNCTION public.auto_close_request()
RETURNS TRIGGER AS $$
DECLARE
  rec_count INTEGER;
BEGIN
  -- Count recommendations for this request
  SELECT COUNT(*) INTO rec_count
  FROM public.recommendations
  WHERE request_id = NEW.request_id;

  -- Close request if it reaches 10 recommendations
  IF rec_count >= 10 THEN
    UPDATE public.food_requests
    SET status = 'closed'::request_status, closed_at = now()
    WHERE id = NEW.request_id AND status = 'active'::request_status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-close requests when they reach 10 recommendations
CREATE TRIGGER auto_close_request_trigger
AFTER INSERT ON public.recommendations
FOR EACH ROW
EXECUTE FUNCTION public.auto_close_request();

-- Create function to close expired requests
CREATE OR REPLACE FUNCTION public.close_expired_requests()
RETURNS INTEGER AS $$
DECLARE
  closed_count INTEGER;
BEGIN
  UPDATE public.food_requests
  SET status = 'closed'::request_status, closed_at = now()
  WHERE status = 'active'::request_status 
  AND expires_at <= now();
  
  GET DIAGNOSTICS closed_count = ROW_COUNT;
  RETURN closed_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate and award points
CREATE OR REPLACE FUNCTION public.award_points_for_request(request_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  request_record RECORD;
  rec RECORD;
  time_diff_minutes NUMERIC;
  points_to_award INTEGER;
  total_awarded INTEGER := 0;
BEGIN
  -- Get request details
  SELECT * INTO request_record
  FROM public.food_requests
  WHERE id = request_id_param;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Award points to each recommendation
  FOR rec IN 
    SELECT * FROM public.recommendations 
    WHERE request_id = request_id_param 
    AND awarded_at IS NULL
  LOOP
    -- Calculate time difference in minutes
    time_diff_minutes = EXTRACT(EPOCH FROM (rec.created_at - request_record.created_at)) / 60;
    
    -- Calculate points using speed formula
    IF time_diff_minutes >= 120 THEN
      points_to_award = 0;
    ELSE
      points_to_award = GREATEST(
        ROUND(100 * (1 - (time_diff_minutes / 120)))::INTEGER,
        10
      );
    END IF;

    -- Update recommendation with awarded points
    UPDATE public.recommendations
    SET awarded_points = points_to_award, awarded_at = now()
    WHERE id = rec.id;

    -- Update user's points
    UPDATE public.profiles
    SET 
      points_total = points_total + points_to_award,
      points_this_month = points_this_month + points_to_award
    WHERE user_id = rec.user_id;

    total_awarded = total_awarded + points_to_award;
  END LOOP;

  RETURN total_awarded;
END;
$$ LANGUAGE plpgsql;