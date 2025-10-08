
-- Update business claim to match the recommendation data
UPDATE public.business_claims
SET 
  restaurant_name = 'Joe''s Pizza Palace Test',
  place_id = 'test_joes_pizza_palace'
WHERE user_id = (SELECT user_id FROM public.profiles WHERE email = 'test@joes-pizza.com');

-- Also update business profile to match
UPDATE public.business_profiles
SET business_name = 'Joe''s Pizza Palace Test'
WHERE user_id = (SELECT user_id FROM public.profiles WHERE email = 'test@joes-pizza.com');
