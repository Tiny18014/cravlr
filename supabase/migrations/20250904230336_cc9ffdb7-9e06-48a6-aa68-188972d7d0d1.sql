-- Update cron job to run every 10 seconds for precise timing
SELECT cron.unschedule('auto-close-expired-requests');

-- Schedule to run every 10 seconds for near-exact timing
SELECT cron.schedule(
  'auto-close-expired-requests',
  '*/10 * * * * *', -- every 10 seconds
  $$
  SELECT net.http_post(
    url := 'https://edazolwepxbdeniluamf.supabase.co/functions/v1/auto-close-requests',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkYXpvbHdlcHhiZGVuaWx1YW1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MzY5NTUsImV4cCI6MjA3MjQxMjk1NX0.Fo-4i9YKhs8dIH_e4E-MEKUwSveQaA7SkGITAPQoBW0"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  );
  $$
);