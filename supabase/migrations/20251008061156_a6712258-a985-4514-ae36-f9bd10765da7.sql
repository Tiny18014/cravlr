-- Set test@joes-pizza.com back to business owner (recommender) persona
UPDATE public.profiles 
SET persona = 'recommender'
WHERE email = 'test@joes-pizza.com';