-- Add request_range field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS request_range text DEFAULT 'nearby';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.request_range IS 'Default request range for food requesters: nearby, 5mi, 10mi, 15mi';