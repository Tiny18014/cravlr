-- Fix security warnings by setting search_path for functions

-- Update slugify_restaurant_name function
CREATE OR REPLACE FUNCTION public.slugify_restaurant_name()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.restaurant_slug = lower(trim(regexp_replace(NEW.restaurant_name, '[^a-zA-Z0-9\s]', '', 'g')));
  RETURN NEW;
END;
$$;

-- Update auto_close_request function
CREATE OR REPLACE FUNCTION public.auto_close_request()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Update close_expired_requests function
CREATE OR REPLACE FUNCTION public.close_expired_requests()
RETURNS INTEGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Update award_points_for_request function
CREATE OR REPLACE FUNCTION public.award_points_for_request(request_id_param UUID)
RETURNS INTEGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    WHERE user_id = rec.recommender_id;

    total_awarded = total_awarded + points_to_award;
  END LOOP;

  RETURN total_awarded;
END;
$$;