-- Remove unique constraint that prevents duplicate restaurant recommendations
ALTER TABLE public.recommendations 
DROP CONSTRAINT IF EXISTS recommendations_request_id_recommender_id_restaurant_name_key;