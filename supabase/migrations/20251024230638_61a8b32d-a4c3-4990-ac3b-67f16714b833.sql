-- Insert sample guru posts from multiple existing gurus
INSERT INTO public.guru_feed_posts (
  id,
  guru_id,
  content_url,
  location_name,
  place_id,
  caption,
  tags,
  content_type,
  created_at
) VALUES
-- Posts from first guru (Guru Test User)
(
  '11111111-1111-1111-1111-111111111111',
  '13daca8a-46ef-49f4-95b5-5dd3f7174858',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
  'Mario''s Italian Kitchen',
  'ChIJ1234567890',
  'The most authentic Neapolitan pizza in LA! That crispy crust and fresh mozzarella 🤌',
  ARRAY['Pizza', 'Date Night', 'Instagrammable'],
  'photo',
  now() - interval '2 hours'
),
(
  '22222222-2222-2222-2222-222222222222',
  '13daca8a-46ef-49f4-95b5-5dd3f7174858',
  'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800',
  'Sunrise Taco Shack',
  'ChIJ2345678901',
  'Best breakfast tacos in Austin! Get the chorizo and egg before they sell out 🌮',
  ARRAY['Tacos', 'Brunch', 'Under $10'],
  'photo',
  now() - interval '5 hours'
),

-- Posts from second guru (John)
(
  '33333333-3333-3333-3333-333333333333',
  '5e177c8a-3536-4883-81d8-e6d5b01c2abb',
  'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=800',
  'The Ramen House',
  'ChIJ3456789012',
  'Hidden gem alert! This tonkotsu ramen is INSANE. Rich, creamy broth that took 18 hours to make 🍜',
  ARRAY['Noodles', 'Hidden Gem', 'Date Night', 'Late Night'],
  'photo',
  now() - interval '8 hours'
),
(
  '44444444-4444-4444-4444-444444444444',
  '5e177c8a-3536-4883-81d8-e6d5b01c2abb',
  'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800',
  'Sweet Dreams Bakery',
  'ChIJ4567890123',
  'These matcha croissants are life-changing 🥐💚 Perfectly flaky with just the right amount of sweetness',
  ARRAY['Dessert', 'Coffee', 'Brunch', 'Instagrammable'],
  'photo',
  now() - interval '12 hours'
),

-- Posts from third guru (Chanda)
(
  '55555555-5555-5555-5555-555555555555',
  '4da2a1aa-c689-4ea3-9d19-7e08a5cf58ad',
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
  'Fire & Spice Thai',
  'ChIJ5678901234',
  'If you can handle the heat, order the crying tiger beef. Not for the faint of heart! 🔥🌶️',
  ARRAY['Spicy', 'Late Night', 'Hidden Gem'],
  'photo',
  now() - interval '1 day'
),
(
  '66666666-6666-6666-6666-666666666666',
  '4da2a1aa-c689-4ea3-9d19-7e08a5cf58ad',
  'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800',
  'Green Earth Cafe',
  'ChIJ6789012345',
  'Best vegan burger in the city, hands down. Even my meat-loving friends were impressed! 🌱🍔',
  ARRAY['Vegan', 'Burgers', 'Family Friendly', 'Under $10'],
  'photo',
  now() - interval '1 day' - interval '6 hours'
),

-- Posts from fourth guru (Tom)
(
  '77777777-7777-7777-7777-777777777777',
  'ee6e85ea-36e4-4071-8682-b406e412655f',
  'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800',
  'Cloud Nine Coffee',
  'ChIJ7890123456',
  'This cold brew hits different ☕️ Perfect spot to work remote with amazing pastries',
  ARRAY['Coffee', 'Brunch', 'Instagrammable'],
  'photo',
  now() - interval '2 days'
),
(
  '88888888-8888-8888-8888-888888888888',
  'ee6e85ea-36e4-4071-8682-b406e412655f',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800',
  'Burger Palace',
  'ChIJ8901234567',
  'Double smash burger with secret sauce = pure heaven 🍔 Don''t sleep on the truffle fries!',
  ARRAY['Burgers', 'Late Night', 'Family Friendly'],
  'photo',
  now() - interval '2 days' - interval '12 hours'
)
ON CONFLICT (id) DO NOTHING;

-- Add some sample reactions to make it more realistic
INSERT INTO public.guru_content_reactions (content_type, content_id, user_id, reaction_type)
VALUES
  ('post', '11111111-1111-1111-1111-111111111111', '5e177c8a-3536-4883-81d8-e6d5b01c2abb', 'heart'),
  ('post', '11111111-1111-1111-1111-111111111111', '4da2a1aa-c689-4ea3-9d19-7e08a5cf58ad', 'drool'),
  ('post', '11111111-1111-1111-1111-111111111111', 'ee6e85ea-36e4-4071-8682-b406e412655f', 'fire'),
  ('post', '22222222-2222-2222-2222-222222222222', '5e177c8a-3536-4883-81d8-e6d5b01c2abb', 'drool'),
  ('post', '33333333-3333-3333-3333-333333333333', '13daca8a-46ef-49f4-95b5-5dd3f7174858', 'guru_pick'),
  ('post', '33333333-3333-3333-3333-333333333333', '4da2a1aa-c689-4ea3-9d19-7e08a5cf58ad', 'fire'),
  ('post', '44444444-4444-4444-4444-444444444444', '13daca8a-46ef-49f4-95b5-5dd3f7174858', 'heart'),
  ('post', '55555555-5555-5555-5555-555555555555', '5e177c8a-3536-4883-81d8-e6d5b01c2abb', 'fire'),
  ('post', '66666666-6666-6666-6666-666666666666', '13daca8a-46ef-49f4-95b5-5dd3f7174858', 'heart'),
  ('post', '77777777-7777-7777-7777-777777777777', '4da2a1aa-c689-4ea3-9d19-7e08a5cf58ad', 'drool')
ON CONFLICT DO NOTHING;

-- Add some sample comments
INSERT INTO public.guru_post_comments (post_id, guru_id, content)
VALUES
  ('11111111-1111-1111-1111-111111111111', '5e177c8a-3536-4883-81d8-e6d5b01c2abb', 'This looks amazing! Adding to my list 🔥'),
  ('33333333-3333-3333-3333-333333333333', '13daca8a-46ef-49f4-95b5-5dd3f7174858', 'Been there, can confirm it''s incredible!'),
  ('44444444-4444-4444-4444-444444444444', '4da2a1aa-c689-4ea3-9d19-7e08a5cf58ad', 'Wow, need this in my life ASAP 😍'),
  ('55555555-5555-5555-5555-555555555555', 'ee6e85ea-36e4-4071-8682-b406e412655f', 'Thanks for sharing! Def going this weekend'),
  ('66666666-6666-6666-6666-666666666666', '5e177c8a-3536-4883-81d8-e6d5b01c2abb', 'This place is a game changer! 🌱')
ON CONFLICT DO NOTHING;