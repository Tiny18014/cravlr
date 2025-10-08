-- Make referral_link_id nullable in referral_clicks
-- This allows tracking direct "I am going" clicks from requesters 
-- in addition to clicks from referral links

ALTER TABLE public.referral_clicks 
ALTER COLUMN referral_link_id DROP NOT NULL;