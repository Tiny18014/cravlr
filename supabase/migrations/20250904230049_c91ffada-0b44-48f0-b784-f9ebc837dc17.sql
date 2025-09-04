-- Set REPLICA IDENTITY FULL for recommendations to ensure complete realtime UPDATE events
ALTER TABLE public.recommendations REPLICA IDENTITY FULL;