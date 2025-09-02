-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to auto-close expired requests every hour
SELECT cron.schedule(
  'auto-close-expired-requests',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://edazolwepxbdeniluamf.supabase.co/functions/v1/auto-close-requests',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkYXpvbHdlcHhiZGVuaWx1YW1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MzY5NTUsImV4cCI6MjA3MjQxMjk1NX0.Fo-4i9YKhs8dIH_e4E-MEKUwSveQaA7SkGITAPQoBW0"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);