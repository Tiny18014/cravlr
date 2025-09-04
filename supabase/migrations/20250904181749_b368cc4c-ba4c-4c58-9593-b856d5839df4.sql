-- Check current replica identity setting for food_requests
SELECT c.relname, c.relreplident 
FROM pg_class c 
WHERE c.relname = 'food_requests';

-- Set REPLICA IDENTITY FULL for food_requests to enable complete realtime UPDATE events
ALTER TABLE public.food_requests REPLICA IDENTITY FULL;