-- Fix RLS issue: verification_codes table has policies but RLS is not enabled
-- Enable RLS on verification_codes table
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Note: The table already has a restrictive policy that blocks all direct access
-- Policy: 'No direct access to verification codes' blocks all operations
-- This is intentional - only database functions should access this table