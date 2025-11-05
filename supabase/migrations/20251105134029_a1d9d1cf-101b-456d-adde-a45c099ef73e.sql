-- Add cuisine_expertise column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cuisine_expertise text[];

-- Add search_range column to profiles table  
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS search_range text DEFAULT 'local';