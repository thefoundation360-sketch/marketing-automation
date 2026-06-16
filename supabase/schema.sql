-- ============================================================
-- DreamLink Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE subscription_tier AS ENUM ('free', 'premium', 'elite', 'business');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing');
CREATE TYPE goal_category AS ENUM ('travel', 'adventure', 'food', 'creative', 'wellness', 'philanthropy', 'career', 'relationships');
CREATE TYPE swipe_action AS ENUM ('like', 'pass');
CREATE TYPE notification_type AS ENUM ('new_match', 'message', 'goal_completed', 'nearby_goal', 'weekly_nudge', 'goal_liked', 'goal_commented', 'group_invite');
CREATE TYPE group_role AS ENUM ('admin', 'member');

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  bio TEXT CHECK (char_length(bio) <= 160),
  avatar_url TEXT,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  age INTEGER CHECK (age >= 18 AND age <= 120),
  is_verified BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  is_guest BOOLEAN DEFAULT FALSE,
  is_blocked BOOLEAN DEFAULT FALSE,
  subscription_tier subscription_tier DEFAULT 'free',
  subscription_expires_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  onesignal_player_id TEXT,
  solo_squad_preference TEXT DEFAULT 'both' CHECK (solo_squad_preference IN ('solo', 'squad', 'both')),
  swipes_today INTEGER DEFAULT 0,
  messages_today INTEGER DEFAULT 0,
  swipes_reset_at DATE DEFAULT CURRENT_DATE,
  messages_reset_at DATE DEFAULT CURRENT_DATE,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USER INTERESTS
-- ============================================================
CREATE TABLE user_interests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  interest TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, interest)
);

-- ============================================================
-- BUCKET LIST GOALS
-- ============================================================
CREATE TABLE bucket_list_goals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category goal_category NOT NULL DEFAULT 'travel',
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completion_photo_url TEXT,
  completion_note TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goals_user_id ON bucket_list_goals(user_id);
CREATE INDEX idx_goals_category ON bucket_list_goals(category);
CREATE INDEX idx_goals_is_public ON bucket_list_goals(is_public);
CREATE INDEX idx_goals_title_trgm ON bucket_list_goals USING gin(title gin_trgm_ops);

-- ============================================================
-- SWIPES
-- ============================================================
CREATE TABLE swipes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  swiper_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  swiped_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action swipe_action NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(swiper_id, swiped_id)
);

CREATE INDEX idx_swipes_swiper_id ON swipes(swiper_id);
CREATE INDEX idx_swipes_swiped_id ON swipes(swiped_id);

-- ============================================================
-- MATCHES
-- ============================================================
CREATE TABLE matches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  match_percentage INTEGER DEFAULT 0,
  shared_goals TEXT[],
  shared_goal_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id)
);

CREATE INDEX idx_matches_user1 ON matches(user1_id);
CREATE INDEX idx_matches_user2 ON matches(user2_id);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_request BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_match_id ON messages(match_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ============================================================
-- FEED ACTIVITIES
-- ============================================================
CREATE TABLE feed_activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('goal_completed', 'new_match', 'milestone', 'goal_added')),
  goal_id UUID REFERENCES bucket_list_goals(id) ON DELETE SET NULL,
  content TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feed_user_id ON feed_activities(user_id);
CREATE INDEX idx_feed_created_at ON feed_activities(created_at DESC);

-- ============================================================
-- FEED LIKES
-- ============================================================
CREATE TABLE feed_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  activity_id UUID REFERENCES feed_activities(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, user_id)
);

-- ============================================================
-- FEED COMMENTS
-- ============================================================
CREATE TABLE feed_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  activity_id UUID REFERENCES feed_activities(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_activity_id ON feed_comments(activity_id);

-- ============================================================
-- GROUPS / SQUADS
-- ============================================================
CREATE TABLE groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  goal_id UUID REFERENCES bucket_list_goals(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  avatar_url TEXT,
  is_premium_only BOOLEAN DEFAULT FALSE,
  member_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_groups_creator_id ON groups(creator_id);

-- ============================================================
-- GROUP MEMBERS
-- ============================================================
CREATE TABLE group_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role group_role DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);

-- ============================================================
-- GROUP MESSAGES
-- ============================================================
CREATE TABLE group_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX idx_group_messages_created_at ON group_messages(created_at DESC);

-- ============================================================
-- GROUP GOALS (shared group objectives)
-- ============================================================
CREATE TABLE group_goals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GROUP EVENTS
-- ============================================================
CREATE TABLE group_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REPORTS
-- ============================================================
CREATE TABLE reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reported_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BLOCKS
-- ============================================================
CREATE TABLE blocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  tier subscription_tier NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FEATURE FLAGS
-- ============================================================
CREATE TABLE feature_flags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default feature flags
INSERT INTO feature_flags (name, description, is_enabled) VALUES
  ('social_feed', 'Enable the social activity feed', TRUE),
  ('groups', 'Enable groups/squads feature', TRUE),
  ('goal_coaching', 'Enable 1:1 goal coaching for Elite tier', TRUE),
  ('brand_profiles', 'Enable Business/Brand tier profiles', TRUE),
  ('push_notifications', 'Enable push notifications via OneSignal', TRUE);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_list_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles viewable by all" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User interests policies
CREATE POLICY "Interests viewable by all" ON user_interests FOR SELECT USING (true);
CREATE POLICY "Users manage own interests" ON user_interests FOR ALL USING (auth.uid() = user_id);

-- Bucket list goals policies
CREATE POLICY "Public goals viewable" ON bucket_list_goals FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users manage own goals" ON bucket_list_goals FOR ALL USING (auth.uid() = user_id);

-- Swipes policies
CREATE POLICY "Users see own swipes" ON swipes FOR SELECT USING (auth.uid() = swiper_id);
CREATE POLICY "Users insert own swipes" ON swipes FOR INSERT WITH CHECK (auth.uid() = swiper_id);

-- Matches policies
CREATE POLICY "Users see own matches" ON matches FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "System creates matches" ON matches FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Messages policies
CREATE POLICY "Users see own messages" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users update own messages" ON messages FOR UPDATE USING (auth.uid() = receiver_id);

-- Notifications policies
CREATE POLICY "Users see own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System inserts notifications" ON notifications FOR INSERT WITH CHECK (true);

-- Feed policies
CREATE POLICY "Public feed viewable" ON feed_activities FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users manage own activities" ON feed_activities FOR ALL USING (auth.uid() = user_id);

-- Feed likes policies
CREATE POLICY "Feed likes viewable" ON feed_likes FOR SELECT USING (true);
CREATE POLICY "Users manage own likes" ON feed_likes FOR ALL USING (auth.uid() = user_id);

-- Feed comments policies
CREATE POLICY "Feed comments viewable" ON feed_comments FOR SELECT USING (true);
CREATE POLICY "Users manage own comments" ON feed_comments FOR ALL USING (auth.uid() = user_id);

-- Groups policies
CREATE POLICY "Groups viewable by all" ON groups FOR SELECT USING (true);
CREATE POLICY "Users create groups" ON groups FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Admins update groups" ON groups FOR UPDATE USING (auth.uid() = creator_id);

-- Group members policies
CREATE POLICY "Group members viewable" ON group_members FOR SELECT USING (true);
CREATE POLICY "Users manage own membership" ON group_members FOR ALL USING (auth.uid() = user_id);

-- Group messages policies
CREATE POLICY "Group members see messages" ON group_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid())
);
CREATE POLICY "Group members send messages" ON group_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (SELECT 1 FROM group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid())
);

-- Group goals policies
CREATE POLICY "Group members see goals" ON group_goals FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_id = group_goals.group_id AND user_id = auth.uid())
);
CREATE POLICY "Group members add goals" ON group_goals FOR INSERT WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (SELECT 1 FROM group_members WHERE group_id = group_goals.group_id AND user_id = auth.uid())
);

-- Group events policies
CREATE POLICY "Group members see events" ON group_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_id = group_events.group_id AND user_id = auth.uid())
);
CREATE POLICY "Group members add events" ON group_events FOR INSERT WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (SELECT 1 FROM group_members WHERE group_id = group_events.group_id AND user_id = auth.uid())
);

-- Reports policies
CREATE POLICY "Users submit reports" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users see own reports" ON reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Admins see all reports" ON reports FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Blocks policies
CREATE POLICY "Users manage own blocks" ON blocks FOR ALL USING (auth.uid() = blocker_id);

-- Subscriptions policies
CREATE POLICY "Users see own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System manages subscriptions" ON subscriptions FOR ALL USING (true);

-- Feature flags policies
CREATE POLICY "Feature flags viewable by all" ON feature_flags FOR SELECT USING (true);
CREATE POLICY "Admins manage feature flags" ON feature_flags FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update profile updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER goals_updated_at BEFORE UPDATE ON bucket_list_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER groups_updated_at BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to check for mutual match after a swipe
CREATE OR REPLACE FUNCTION check_mutual_match()
RETURNS TRIGGER AS $$
DECLARE
  mutual_exists BOOLEAN;
  match_pct INTEGER;
  user1 UUID;
  user2 UUID;
  shared TEXT[];
BEGIN
  IF NEW.action = 'like' THEN
    SELECT EXISTS (
      SELECT 1 FROM swipes
      WHERE swiper_id = NEW.swiped_id
        AND swiped_id = NEW.swiper_id
        AND action = 'like'
    ) INTO mutual_exists;

    IF mutual_exists THEN
      -- Order IDs to satisfy check constraint
      IF NEW.swiper_id < NEW.swiped_id THEN
        user1 := NEW.swiper_id;
        user2 := NEW.swiped_id;
      ELSE
        user1 := NEW.swiped_id;
        user2 := NEW.swiper_id;
      END IF;

      -- Calculate shared goals
      SELECT ARRAY(
        SELECT DISTINCT g1.title
        FROM bucket_list_goals g1
        JOIN bucket_list_goals g2 ON LOWER(g1.title) = LOWER(g2.title)
        WHERE g1.user_id = user1 AND g2.user_id = user2
          AND g1.is_public = true AND g2.is_public = true
        LIMIT 5
      ) INTO shared;

      match_pct := GREATEST(0, LEAST(100, COALESCE(ARRAY_LENGTH(shared, 1), 0) * 20 + 30));

      INSERT INTO matches (user1_id, user2_id, match_percentage, shared_goals)
      VALUES (user1, user2, match_pct, shared)
      ON CONFLICT (user1_id, user2_id) DO NOTHING;

      -- Notify both users
      INSERT INTO notifications (user_id, type, title, body, metadata)
      VALUES
        (NEW.swiper_id, 'new_match', 'New Match! 🎉', 'You have a new mutual match!', jsonb_build_object('match_user_id', NEW.swiped_id)),
        (NEW.swiped_id, 'new_match', 'New Match! 🎉', 'You have a new mutual match!', jsonb_build_object('match_user_id', NEW.swiper_id));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_swipe_check_match
  AFTER INSERT ON swipes
  FOR EACH ROW EXECUTE FUNCTION check_mutual_match();

-- Function to create feed activity when goal is completed
CREATE OR REPLACE FUNCTION handle_goal_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_completed = true AND (OLD.is_completed = false OR OLD.is_completed IS NULL) THEN
    INSERT INTO feed_activities (user_id, type, goal_id, content)
    VALUES (NEW.user_id, 'goal_completed', NEW.id, 'completed a bucket list goal: ' || NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_goal_completed
  AFTER UPDATE ON bucket_list_goals
  FOR EACH ROW EXECUTE FUNCTION handle_goal_completion();

-- ============================================================
-- REALTIME SUBSCRIPTIONS
-- Enable realtime for key tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;

-- ============================================================
-- STORAGE BUCKETS (run via Supabase dashboard or API)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', TRUE);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('goal-photos', 'goal-photos', TRUE);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('group-avatars', 'group-avatars', TRUE);
