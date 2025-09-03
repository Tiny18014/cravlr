-- Update auto_close_request function to also award points when requests reach 10 recommendations
CREATE OR REPLACE FUNCTION public.auto_close_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rec_count INTEGER;
  total_points_awarded INTEGER;
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
    
    -- Award points for all recommendations in this request
    SELECT public.award_points_for_request(NEW.request_id) INTO total_points_awarded;
    
    -- Log the point awarding
    -- Note: We can't use console.log in PostgreSQL, but this will help with debugging
    RAISE NOTICE 'Request % closed with % recommendations. Awarded % total points.', 
      NEW.request_id, rec_count, COALESCE(total_points_awarded, 0);
  END IF;

  RETURN NEW;
END;
$function$;