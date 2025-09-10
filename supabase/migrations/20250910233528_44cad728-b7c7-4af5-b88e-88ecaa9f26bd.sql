-- Enable real-time updates for food_requests table
ALTER TABLE public.food_requests REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_requests;