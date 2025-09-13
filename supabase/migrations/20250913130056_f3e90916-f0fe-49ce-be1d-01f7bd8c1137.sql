-- Clean up test data for Joe's Pizza Palace Test
-- Delete referral clicks for Joe's Pizza
DELETE FROM public.referral_clicks 
WHERE restaurant_name ILIKE '%joe%pizza%' 
   OR restaurant_name = 'Joe''s Pizza Palace Test';

-- Delete referral links for Joe's Pizza  
DELETE FROM public.referral_links 
WHERE restaurant_name ILIKE '%joe%pizza%' 
   OR restaurant_name = 'Joe''s Pizza Palace Test';

-- Reset points for the test business user (optional - removes test points)
UPDATE public.profiles 
SET points_total = 0, points_this_month = 0 
WHERE email = 'test@joes-pizza.com';

-- Delete any points events related to this test data
DELETE FROM public.points_events 
WHERE referral_click_id IN (
  SELECT id FROM public.referral_clicks 
  WHERE restaurant_name ILIKE '%joe%pizza%'
);