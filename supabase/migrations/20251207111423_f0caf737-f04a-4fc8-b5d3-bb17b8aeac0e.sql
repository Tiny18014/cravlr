-- Fix 1: Set security_invoker on view_business_commissions to inherit RLS from underlying tables
ALTER VIEW public.view_business_commissions SET (security_invoker = true);

-- Fix 2: Move pg_net extension from public to extensions schema
-- Note: pg_net is a Supabase-managed extension, we need to drop and recreate in correct schema
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;