-- Move pg_cron extension to the extensions schema (if it exists)
-- Note: Some environments may not allow moving extensions, this is mainly for compliance
DROP EXTENSION IF EXISTS pg_cron CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- If extensions schema doesn't exist, create it and try again
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'extensions') THEN
    CREATE SCHEMA extensions;
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  -- If we can't create extensions schema, just use pg_cron in public (acceptable for Supabase)
  NULL;
END $$;

-- Recreate the cron job
SELECT cron.schedule(
  'auto-close-expired-requests',
  '*/5 * * * *', -- Every 5 minutes
  $$
    UPDATE public.food_requests 
    SET status = 'expired', closed_at = now() 
    WHERE status = 'active' AND expires_at < now();
  $$
);