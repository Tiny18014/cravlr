-- Add cuisine expertise and search range fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cuisine_expertise TEXT[],
ADD COLUMN IF NOT EXISTS search_range TEXT DEFAULT 'local';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.cuisine_expertise IS 'User''s cuisine expertise or cultural background (multi-select)';
COMMENT ON COLUMN public.profiles.search_range IS 'Preferred search range: local (same city) or nearby (within 25 miles)';