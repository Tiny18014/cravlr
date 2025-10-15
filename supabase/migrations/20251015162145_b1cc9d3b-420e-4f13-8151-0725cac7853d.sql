-- Insert sample guru feed posts for testing
-- Using the guru users we just enabled

INSERT INTO guru_feed_posts (guru_id, content_url, location_name, place_id, caption, tags, content_type)
VALUES
  -- Post 1
  (
    (SELECT user_id FROM profiles WHERE email = 'john20000802@gmail.com' LIMIT 1),
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38',
    'Donut Vault',
    NULL,
    'This Thai iced tea donut blew my mind 🍩🧡',
    ARRAY['Dessert', 'HiddenGem'],
    'photo'
  ),
  -- Post 2
  (
    (SELECT user_id FROM profiles WHERE email = 'chhannaarawal@gmail.com' LIMIT 1),
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47',
    'La Bamba Express',
    NULL,
    'Late night taco run — under $8 and fully loaded 🌮🔥',
    ARRAY['LateNight', 'Under$10'],
    'photo'
  ),
  -- Post 3
  (
    (SELECT user_id FROM profiles WHERE email = 'htom57114@gmail.com' LIMIT 1),
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624',
    'Pho Real',
    NULL,
    'Best vegan pho in Charlotte? This one wins. 💚🍜',
    ARRAY['Vegan', 'NoodleLovers'],
    'photo'
  ),
  -- Post 4
  (
    (SELECT user_id FROM profiles WHERE email = 'john20000802@gmail.com' LIMIT 1),
    'https://images.unsplash.com/photo-1571091718767-18b5b1457add',
    'Sunrise Cafe',
    NULL,
    'Brunch goals achieved ☀️🥞',
    ARRAY['Brunch', 'Breakfast'],
    'photo'
  );

-- Insert some sample reactions to make it more realistic
INSERT INTO guru_content_reactions (user_id, content_id, content_type, reaction_type)
SELECT 
  p.user_id,
  fp.id,
  'post',
  CASE 
    WHEN random() < 0.33 THEN 'heart'
    WHEN random() < 0.66 THEN 'fire'
    ELSE 'drool'
  END
FROM guru_feed_posts fp
CROSS JOIN profiles p
WHERE p.guru_level = true
AND random() < 0.6  -- 60% chance each guru reacts to each post
LIMIT 20;