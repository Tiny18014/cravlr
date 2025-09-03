-- Close the expired request and award points
UPDATE public.food_requests 
SET status = 'expired', closed_at = now() 
WHERE id = '4886be4d-57e8-4d85-85fd-0e1612989315' AND status = 'active';

-- Award points for the recommendation (50 base points for quick response)
UPDATE public.recommendations
SET awarded_points = 85, awarded_at = now()
WHERE request_id = '4886be4d-57e8-4d85-85fd-0e1612989315' AND awarded_at IS NULL;

-- Update the recommender's total points
UPDATE public.profiles
SET 
  points_total = points_total + 85,
  points_this_month = points_this_month + 85
WHERE user_id = 'd1599a40-51d4-4d5a-a31e-fb9440140f6a';