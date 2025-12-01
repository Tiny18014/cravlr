-- Fix search_path for calculate_recommender_level function
CREATE OR REPLACE FUNCTION public.calculate_recommender_level(total_points integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF total_points >= 600 THEN
    RETURN 'Verified Guru';
  ELSIF total_points >= 300 THEN
    RETURN 'Expert';
  ELSIF total_points >= 150 THEN
    RETURN 'Trusted';
  ELSIF total_points >= 50 THEN
    RETURN 'Explorer';
  ELSE
    RETURN 'Newbie';
  END IF;
END;
$$;