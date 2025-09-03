-- Enable the pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job that runs every 5 minutes to close expired requests
SELECT cron.schedule(
  'auto-close-expired-requests',
  '*/5 * * * *', -- Every 5 minutes
  $$
    UPDATE public.food_requests 
    SET status = 'expired', closed_at = now() 
    WHERE status = 'active' AND expires_at < now();
  $$
);

-- Also run it once immediately
UPDATE public.food_requests 
SET status = 'expired', closed_at = now() 
WHERE status = 'active' AND expires_at < now();