-- Fix overly permissive RLS policy on rate_limit_attempts
-- Drop the existing permissive INSERT policy
DROP POLICY IF EXISTS "Service role can insert rate limits" ON public.rate_limit_attempts;

-- Create a restrictive policy that only allows service_role to insert
-- Note: This policy targets the service_role specifically
CREATE POLICY "Only service role inserts rate limits"
ON public.rate_limit_attempts
FOR INSERT
TO service_role
WITH CHECK (true);

-- Also add a policy that allows the authenticated role to insert only their own records
-- This is needed for the database functions that use SECURITY DEFINER
CREATE POLICY "Authenticated users insert via db functions only"
ON public.rate_limit_attempts
FOR INSERT
TO authenticated
WITH CHECK (false);