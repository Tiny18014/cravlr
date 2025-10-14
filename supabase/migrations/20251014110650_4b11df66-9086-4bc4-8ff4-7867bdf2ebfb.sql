-- Grant Guru access to test users
UPDATE profiles 
SET 
  guru_level = true,
  points_total = GREATEST(points_total, 1000)
WHERE email IN (
  'john20000802@gmail.com',
  'chhannaarawal@gmail.com', 
  'htom57114@gmail.com'
);