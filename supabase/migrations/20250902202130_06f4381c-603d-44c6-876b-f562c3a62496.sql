-- Add Google Places fields to recommendations table
ALTER TABLE public.recommendations 
ADD COLUMN place_id TEXT,
ADD COLUMN maps_url TEXT,
ADD COLUMN photo_token TEXT,
ADD COLUMN rating NUMERIC(2,1),
ADD COLUMN price_level INTEGER;