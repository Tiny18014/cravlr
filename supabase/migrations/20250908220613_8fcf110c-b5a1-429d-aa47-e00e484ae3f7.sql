-- Update the existing business claim to use the current test user and match the exact restaurant name used in recommendations
UPDATE public.business_claims 
SET 
  user_id = '908b02df-ba5b-4e23-8aec-90401ed04b8e',
  restaurant_name = 'Joe''s Pizza Palace Test',
  updated_at = now()
WHERE id = '02dc075d-1273-447c-8b93-873a36bbec0a';

-- Also insert a sample referral click for testing (this would normally be created when someone clicks a referral link)
INSERT INTO public.referral_clicks (
  recommender_id,
  requester_id, 
  recommendation_id,
  request_id,
  referral_link_id,
  restaurant_name,
  place_id,
  conversion_value,
  commission_rate,
  user_agent,
  ip_address
) VALUES (
  '908b02df-ba5b-4e23-8aec-90401ed04b8e',  -- recommender (same as current user for testing)
  'd1599a40-51d4-4d5a-a31e-fb9440140f6a',  -- requester from recent pizza request 
  '5128c566-96ac-4461-885c-100643721990',  -- recommendation ID from recent request
  '53293c46-9d21-4e76-9598-39aaee1723b4',  -- request ID from recent pizza request
  gen_random_uuid(),  -- dummy referral link ID
  'Joe''s Pizza Palace Test',
  'test_joes_pizza_palace',
  25.00,  -- sample order value
  0.10,   -- 10% commission rate
  'Mozilla/5.0 (Test Browser)',
  '192.168.1.1'::inet
) ON CONFLICT DO NOTHING;