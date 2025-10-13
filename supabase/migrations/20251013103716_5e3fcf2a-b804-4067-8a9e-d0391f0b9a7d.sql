-- Grant Guru access to the test user
UPDATE profiles 
SET 
  guru_level = true,
  display_name = 'Guru Test User',
  reputation_score = 95.0,
  approval_rate = 92.0,
  total_feedbacks = 50,
  positive_feedbacks = 46,
  points_total = 5000,
  points_this_month = 500
WHERE email = 'guru@test.com';

-- Create sample Guru maps for testing
INSERT INTO guru_maps (title, description, theme, created_by, collaborators, likes_count, is_public)
SELECT 
  'Hidden Gems of Charlotte',
  'The best under-the-radar spots that locals don''t want tourists to know about',
  'Hidden Gems',
  user_id,
  ARRAY[user_id],
  12,
  true
FROM profiles WHERE email = 'guru@test.com'
UNION ALL
SELECT 
  'Late Night Eats Under $15',
  'Affordable spots that stay open late for those midnight cravings',
  'Budget Eats',
  user_id,
  ARRAY[user_id],
  8,
  true
FROM profiles WHERE email = 'guru@test.com'
UNION ALL
SELECT 
  'Best Brunch Spots Downtown',
  'Weekend brunch destinations that are worth the wait',
  'Brunch',
  user_id,
  ARRAY[user_id],
  15,
  true
FROM profiles WHERE email = 'guru@test.com';