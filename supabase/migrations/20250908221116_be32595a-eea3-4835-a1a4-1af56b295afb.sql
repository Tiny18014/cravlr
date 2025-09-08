-- Update the business claim to use the actual logged-in business user
UPDATE public.business_claims 
SET 
  user_id = '721276b4-d6b9-4654-8b60-47bb626267b4',
  restaurant_name = 'Joe''s Pizza Palace Test',
  updated_at = now()
WHERE id = '02dc075d-1273-447c-8b93-873a36bbec0a';

-- Also create a sample referral click for the actual business user
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
) 
SELECT 
  '908b02df-ba5b-4e23-8aec-90401ed04b8e',  -- recommender (the food lover user)
  'd1599a40-51d4-4d5a-a31e-fb9440140f6a',  -- requester from recent pizza request 
  '5128c566-96ac-4461-885c-100643721990',  -- recommendation ID from recent request
  '53293c46-9d21-4e76-9598-39aaee1723b4',  -- request ID from recent pizza request
  rl.id,  -- use existing referral link ID
  'Joe''s Pizza Palace Test',
  'test_joes_pizza_palace',
  25.00,  -- sample order value
  0.10,   -- 10% commission rate
  'Mozilla/5.0 (Test Browser)',
  '192.168.1.1'::inet
FROM public.referral_links rl 
WHERE rl.restaurant_name = 'Joe''s Pizza Palace Test' 
LIMIT 1
ON CONFLICT DO NOTHING;