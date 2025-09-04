-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to run auto-close-requests every 2 minutes
SELECT cron.schedule(
  'auto-close-expired-requests',
  '*/2 * * * *', -- every 2 minutes
  $$
  SELECT
    net.http_post(
        url:='https://edazolwepxbdeniluamf.supabase.co/functions/v1/auto-close-requests',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkYXpvbHdlcHhiZGVuaWx1YW1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MzY5NTUsImV4cCI6MjA3MjQxMjk1NX0.Fo-4i9YKhs8dIH_e4E-MEKUwSveQaA7SkGITAPQoBW0"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);

-- Award points for existing unawarded recommendations
SELECT public.award_points_for_request(request_id) FROM (
  SELECT DISTINCT request_id 
  FROM public.recommendations 
  WHERE awarded_points IS NULL OR awarded_points = 0
) as unawarded_requests;