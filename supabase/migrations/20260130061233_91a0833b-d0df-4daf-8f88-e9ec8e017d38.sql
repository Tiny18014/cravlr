-- Create the missing award_points_for_request function
CREATE OR REPLACE FUNCTION public.award_points_for_request(request_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recommendation RECORD;
  v_total_points_awarded INTEGER := 0;
  v_points_per_recommendation INTEGER := 5;
BEGIN
  -- Loop through all recommendations for this request and award points to recommenders
  FOR v_recommendation IN 
    SELECT r.id, r.recommender_id, r.awarded_points
    FROM recommendations r
    WHERE r.request_id = request_id_param
      AND (r.awarded_points IS NULL OR r.awarded_points = 0)
  LOOP
    -- Update the recommendation with awarded points
    UPDATE recommendations
    SET awarded_points = v_points_per_recommendation
    WHERE id = v_recommendation.id;

    -- Update recommender's profile points
    UPDATE profiles
    SET 
      points_total = COALESCE(points_total, 0) + v_points_per_recommendation,
      points_this_month = COALESCE(points_this_month, 0) + v_points_per_recommendation
    WHERE id = v_recommendation.recommender_id;

    -- Create points event record
    INSERT INTO points_events (user_id, points, event_type)
    VALUES (v_recommendation.recommender_id, v_points_per_recommendation, 'request_expired');

    v_total_points_awarded := v_total_points_awarded + v_points_per_recommendation;
    
    RAISE NOTICE 'Awarded % points to recommender % for recommendation %', 
                 v_points_per_recommendation, v_recommendation.recommender_id, v_recommendation.id;
  END LOOP;

  RETURN v_total_points_awarded;
END;
$$;