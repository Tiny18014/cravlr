-- Update test@joes-pizza.com to be a business owner (recommender) account
UPDATE public.profiles 
SET persona = 'recommender'
WHERE email = 'test@joes-pizza.com';