-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ========================
-- PROFILES
-- ========================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT CHECK (char_length(bio) <= 160),
  age INTEGER CHECK (age >= 18 AND age <= 99),
  location TEXT,
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  interests TEXT[] DEFAULT '{}',
  preference TEXT CHECK (preference IN ('solo', 'squad', 'both')) DEFAULT 'both',
  subscription_tier TEXT CHECK (subscription_tier IN ('free', 'premium', 'elite', 'business')) DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_subscription_status TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  is_guest BOOLEAN DEFAULT FALSE,
  is_suspended BOOLEAN DEFAULT FALSE,
  swipes_today INTEGER DEFAULT 0,
  messages_today INTEGER DEFAULT 0,
  last_swipe_date DATE,
  last_message_date DATE,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  onesignal_player_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- BUCKET GOALS
-- ========================
CREATE TABLE bucket_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('Travel','Adventure','Food','Creative','Wellness','Philanthropy','Career','Relationships')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','paused')),
  is_public BOOLEAN DEFAULT TRUE,
  completed_at TIMESTAMPTZ,
  proof_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bucket_goals_user_id ON bucket_goals(user_id);
CREATE INDEX idx_bucket_goals_status ON bucket_goals(status);
CREATE INDEX idx_bucket_goals_category ON bucket_goals(category);
CREATE INDEX idx_bucket_goals_title_trgm ON bucket_goals USING gin(title gin_trgm_ops);

-- ========================
-- SWIPES
-- ========================
CREATE TABLE swipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swiper_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  swiped_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('like','pass','superlike')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(swiper_id, swiped_id)
);

CREATE INDEX idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX idx_swipes_swiped ON swipes(swiped_id);

-- ========================
-- MATCHES
-- ========================
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_percentage INTEGER DEFAULT 0 CHECK (match_percentage >= 0 AND match_percentage <= 100),
  shared_goals TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'matched' CHECK (status IN ('pending','matched','blocked')),
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_a_id, user_b_id),
  CHECK (user_a_id < user_b_id)
);

CREATE INDEX idx_matches_user_a ON matches(user_a_id);
CREATE INDEX idx_matches_user_b ON matches(user_b_id);

-- ========================
-- CONVERSATIONS
-- ========================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_ids UUID[] NOT NULL,
  is_group BOOLEAN DEFAULT FALSE,
  group_id UUID,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  is_match_gated BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_participants ON conversations USING gin(participant_ids);

-- ========================
-- MESSAGES
-- ========================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- ========================
-- NOTIFICATIONS
-- ========================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_match','new_message','goal_completed_friend','goal_nearby','weekly_nudge','milestone')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;

-- ========================
-- GROUPS / SQUADS
-- ========================
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES bucket_goals(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id),
  avatar_url TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  member_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_groups_creator ON groups(creator_id);

CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin','member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);

-- ========================
-- GROUP EVENTS
-- ========================
CREATE TABLE group_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE event_rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES group_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('going','maybe','no')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- ========================
-- FEED ITEMS
-- ========================
CREATE TABLE feed_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('goal_completed','new_match','joined_group','milestone')),
  goal_id UUID REFERENCES bucket_goals(id) ON DELETE SET NULL,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feed_items_user ON feed_items(user_id, created_at DESC);
CREATE INDEX idx_feed_items_created ON feed_items(created_at DESC);

-- ========================
-- FEED LIKES
-- ========================
CREATE TABLE feed_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feed_item_id UUID NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feed_item_id, user_id)
);

-- ========================
-- COMMENTS
-- ========================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feed_item_id UUID NOT NULL REFERENCES feed_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_feed_item ON comments(feed_item_id, created_at);

-- ========================
-- BLOCKS / REPORTS
-- ========================
CREATE TABLE user_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE TABLE user_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed','action_taken')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- FEATURE FLAGS
-- ========================
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO feature_flags (key, enabled, description) VALUES
  ('social_feed', true, 'Enable social activity feed'),
  ('groups', true, 'Enable groups/squads feature'),
  ('super_likes', true, 'Enable super likes (premium)'),
  ('maintenance_mode', false, 'Put app in maintenance mode');

-- ========================
-- TRIGGERS
-- ========================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    lower(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), '\s+', '', 'g')) || floor(random() * 9999)::text,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update updated_at on profiles
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER goals_updated_at BEFORE UPDATE ON bucket_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Reset daily swipe/message counts
CREATE OR REPLACE FUNCTION reset_daily_limits()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET swipes_today = 0, messages_today = 0
  WHERE last_swipe_date < CURRENT_DATE OR last_message_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Update last_message on conversation
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message = NEW.content, last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Update comment count on feed
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_items SET comments_count = comments_count + 1 WHERE id = NEW.feed_item_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_items SET comments_count = comments_count - 1 WHERE id = OLD.feed_item_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_comment_count();

-- Update like count on feed
CREATE OR REPLACE FUNCTION update_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_items SET likes_count = likes_count + 1 WHERE id = NEW.feed_item_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_items SET likes_count = likes_count - 1 WHERE id = OLD.feed_item_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON feed_likes
  FOR EACH ROW EXECUTE FUNCTION update_like_count();

-- Update group member count
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE groups SET member_count = member_count - 1 WHERE id = OLD.group_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_group_member_change
  AFTER INSERT OR DELETE ON group_members
  FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

-- ========================
-- ROW LEVEL SECURITY
-- ========================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- Profiles: public read, own write
CREATE POLICY "Profiles are publicly readable" ON profiles FOR SELECT USING (NOT is_suspended);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Bucket goals: public read for public goals, own write
CREATE POLICY "Public goals are readable" ON bucket_goals FOR SELECT USING (is_public = true OR user_id = auth.uid());
CREATE POLICY "Users manage own goals" ON bucket_goals FOR ALL USING (user_id = auth.uid());

-- Swipes: own only
CREATE POLICY "Users manage own swipes" ON swipes FOR ALL USING (swiper_id = auth.uid());

-- Matches: participants only
CREATE POLICY "Match participants can read" ON matches FOR SELECT USING (user_a_id = auth.uid() OR user_b_id = auth.uid());
CREATE POLICY "System can insert matches" ON matches FOR INSERT WITH CHECK (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- Conversations: participants only
CREATE POLICY "Conversation participants can read" ON conversations FOR SELECT USING (auth.uid() = ANY(participant_ids));
CREATE POLICY "Users can create conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() = ANY(participant_ids));

-- Messages: conversation participants only
CREATE POLICY "Message participants can read" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversations WHERE id = conversation_id AND auth.uid() = ANY(participant_ids))
);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (SELECT 1 FROM conversations WHERE id = conversation_id AND auth.uid() = ANY(participant_ids))
);
CREATE POLICY "Recipient can mark read" ON messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM conversations WHERE id = conversation_id AND auth.uid() = ANY(participant_ids))
);

-- Notifications: own only
CREATE POLICY "Users read own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Groups: public read, members write
CREATE POLICY "Public groups are readable" ON groups FOR SELECT USING (is_public = true OR EXISTS (SELECT 1 FROM group_members WHERE group_id = id AND user_id = auth.uid()));
CREATE POLICY "Authenticated can create groups" ON groups FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Admins can update groups" ON groups FOR UPDATE USING (EXISTS (SELECT 1 FROM group_members WHERE group_id = id AND user_id = auth.uid() AND role = 'admin'));

-- Group members
CREATE POLICY "Members visible to all" ON group_members FOR SELECT USING (true);
CREATE POLICY "Users can join/leave" ON group_members FOR ALL USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'));

-- Feed: public read, own write
CREATE POLICY "Feed is publicly readable" ON feed_items FOR SELECT USING (true);
CREATE POLICY "Users create own feed items" ON feed_items FOR INSERT WITH CHECK (user_id = auth.uid());

-- Feed likes
CREATE POLICY "Likes are public" ON feed_likes FOR SELECT USING (true);
CREATE POLICY "Users manage own likes" ON feed_likes FOR ALL USING (user_id = auth.uid());

-- Comments
CREATE POLICY "Comments are public" ON comments FOR SELECT USING (true);
CREATE POLICY "Users manage own comments" ON comments FOR ALL USING (user_id = auth.uid());

-- Blocks/Reports: own only
CREATE POLICY "Users manage own blocks" ON user_blocks FOR ALL USING (blocker_id = auth.uid());
CREATE POLICY "Users create own reports" ON user_reports FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- ========================
-- STORAGE BUCKETS
-- ========================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('proof-photos', 'proof-photos', true),
  ('group-avatars', 'group-avatars', true)
ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Proof photos are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'proof-photos');
CREATE POLICY "Users can upload own proof photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'proof-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
