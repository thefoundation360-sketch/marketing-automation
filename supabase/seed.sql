-- Sample seed data for development
-- Run after the schema migration

-- Note: In production, users are created via auth.users which triggers profile creation.
-- This seed creates demo profiles directly for local development.

-- Insert demo profiles (these UUIDs are fake — for local dev only)
INSERT INTO profiles (id, username, full_name, bio, age, location, latitude, longitude, interests, preference, subscription_tier, is_verified, onboarding_complete) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'maya_adventures',
  'Maya Chen',
  'Explorer. Photographer. Always planning the next adventure. 🌍',
  28,
  'San Francisco, CA',
  37.7749,
  -122.4194,
  ARRAY['Photography', 'Hiking', 'Travel', 'Yoga', 'Cooking'],
  'both',
  'premium',
  true,
  true
),
(
  '00000000-0000-0000-0000-000000000002',
  'james_traveler',
  'James Torres',
  'Software engineer by day, adventurer by night. Route 66 calling my name.',
  31,
  'Chicago, IL',
  41.8781,
  -87.6298,
  ARRAY['Travel', 'Cycling', 'Music', 'Cooking', 'Running'],
  'squad',
  'free',
  false,
  true
),
(
  '00000000-0000-0000-0000-000000000003',
  'priya_dreams',
  'Priya Kapoor',
  'Learning Spanish one word at a time. Coffee enthusiast. Book lover.',
  26,
  'Austin, TX',
  30.2672,
  -97.7431,
  ARRAY['Languages', 'Reading', 'Coffee Culture', 'Yoga', 'Writing'],
  'solo',
  'elite',
  true,
  true
),
(
  '00000000-0000-0000-0000-000000000004',
  'alex_peaks',
  'Alex Rivera',
  'Chasing summits and sunsets. 14ers done, Kilimanjaro next!',
  34,
  'Denver, CO',
  39.7392,
  -104.9903,
  ARRAY['Rock Climbing', 'Hiking', 'Camping', 'Photography', 'Running'],
  'both',
  'premium',
  true,
  true
),
(
  '00000000-0000-0000-0000-000000000005',
  'luna_creates',
  'Luna Park',
  'Artist, dancer, dreamer. Building a life full of color and movement.',
  29,
  'New York, NY',
  40.7128,
  -74.0060,
  ARRAY['Art', 'Dancing', 'Theater', 'Film', 'Creative'],
  'both',
  'free',
  false,
  true
)
ON CONFLICT (id) DO NOTHING;

-- Sample bucket goals
INSERT INTO bucket_goals (id, user_id, title, description, category, status, is_public) VALUES
-- Maya's goals
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'See the Northern Lights in Iceland', 'Dance under the aurora borealis. A lifelong dream!', 'Travel', 'active', true),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Learn Japanese', 'Speak conversational Japanese before visiting Tokyo', 'Career', 'active', true),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Hike the Camino de Santiago', '800km across Spain. Mind, body, soul.', 'Adventure', 'active', true),

-- James's goals
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Road trip Route 66', 'Chicago to Santa Monica. The great American road trip.', 'Travel', 'active', true),
('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'See the Northern Lights in Iceland', NULL, 'Travel', 'active', true),
('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 'Learn to cook Thai food', 'Take an authentic Thai cooking class in Chiang Mai', 'Food', 'active', true),

-- Priya's goals
('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000003', 'Become fluent in Spanish', 'Achieve B2 level and have a full conversation without thinking', 'Career', 'active', true),
('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000003', 'Write and publish a novel', '80,000 words. One story. Finally done.', 'Creative', 'active', true),
('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000003', 'Volunteer abroad for a month', 'Teach English or build homes in Southeast Asia', 'Philanthropy', 'active', true),

-- Alex's goals
('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000004', 'Climb Kilimanjaro', 'Summit Africa''s highest peak. Training starts now.', 'Adventure', 'active', true),
('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000004', 'See the Northern Lights in Iceland', NULL, 'Travel', 'active', true),
('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000004', 'Complete a triathlon', 'Swim, bike, run. I can do this.', 'Wellness', 'active', true),

-- Luna's goals
('10000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000005', 'Exhibit my art in a gallery', 'Real walls. Real people. Real art.', 'Creative', 'active', true),
('10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000005', 'Learn flamenco dancing', 'In Seville, from a real flamenco school', 'Creative', 'active', true),
('10000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000005', 'See the Northern Lights in Iceland', NULL, 'Travel', 'active', true)
ON CONFLICT (id) DO NOTHING;

-- Sample feed items
INSERT INTO feed_items (id, user_id, type, goal_id, content, likes_count, comments_count) VALUES
('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'goal_completed', '10000000-0000-0000-0000-000000000012', 'Just crossed "Complete a triathlon" off my bucket list! 🏊‍♂️🚴‍♂️🏃‍♂️ Never thought I''d do it but here we are. Next up: Kilimanjaro!', 24, 8),
('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'milestone', NULL, 'Just hit 5 bucket list goals! Halfway to my first 10. The journey is just beginning ✨', 17, 4)
ON CONFLICT (id) DO NOTHING;

-- Feature flags (should already exist from migration, this is a safety insert)
INSERT INTO feature_flags (key, enabled, description) VALUES
  ('social_feed', true, 'Enable social activity feed'),
  ('groups', true, 'Enable groups/squads feature'),
  ('super_likes', true, 'Enable super likes (premium feature)'),
  ('maintenance_mode', false, 'Put app in maintenance mode'),
  ('goal_coaching', true, 'Enable 1:1 goal coaching (elite feature)'),
  ('pdf_export', true, 'Enable bucket list PDF export (premium feature)')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;
