-- Add last_feedback_date column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN last_feedback_date timestamp with time zone;