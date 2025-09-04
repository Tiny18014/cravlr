-- Enable realtime updates for recommendations table
ALTER TABLE public.recommendations REPLICA IDENTITY FULL;

-- Add recommendations table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.recommendations;