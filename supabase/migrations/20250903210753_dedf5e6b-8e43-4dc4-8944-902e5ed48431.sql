-- Fix the trigger issue by removing the problematic trigger that's causing the updated_at error
-- This function is trying to set updated_at on tables that don't have it

-- First check if the trigger exists and remove it if it does
DROP TRIGGER IF EXISTS update_food_requests_updated_at ON public.food_requests;
DROP TRIGGER IF EXISTS update_recommendations_updated_at ON public.recommendations;

-- The food_requests table should have the trigger but recommendations table doesn't need it
-- Recreate only for tables that actually have updated_at column
CREATE TRIGGER update_food_requests_updated_at
  BEFORE UPDATE ON public.food_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Now let's manually close the expired request and award points
UPDATE public.food_requests 
SET status = 'expired', closed_at = now() 
WHERE id = '4886be4d-57e8-4d85-85fd-0e1612989315' AND status = 'active';

-- Award 70 points for the quick positive feedback (50 base + 20 star bonus)
UPDATE public.recommendations
SET awarded_points = 70, awarded_at = now()
WHERE id = '2c1de1b2-5752-43a6-961d-7e2f6dc0c84e' AND awarded_at IS NULL;

-- Update the recommender's total points  
UPDATE public.profiles
SET 
  points_total = points_total + 70,
  points_this_month = points_this_month + 70
WHERE user_id = 'd1599a40-51d4-4d5a-a31e-fb9440140f6a';