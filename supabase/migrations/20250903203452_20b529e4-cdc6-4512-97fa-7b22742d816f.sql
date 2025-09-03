-- Fix numeric field precision to allow values up to 100.00
ALTER TABLE public.profiles 
ALTER COLUMN reputation_score TYPE NUMERIC(5,2),
ALTER COLUMN approval_rate TYPE NUMERIC(5,2);