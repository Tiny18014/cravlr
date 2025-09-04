-- Enable real-time for food_requests table
ALTER TABLE public.food_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_requests;