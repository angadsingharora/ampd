-- 003_full_schema.sql
-- Transitions the database from the early vertical-slice schema (001 + 002)
-- to the full MVP schema defined in DESIGN.md v3.0.
--
-- WARNING: This drops and recreates tables whose shape changed.
-- Only safe in development (no production data to preserve).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- DROP old tables that are being replaced
-- ============================================

DROP TABLE IF EXISTS public.activity_points CASCADE;
DROP TABLE IF EXISTS public.live_locations CASCADE;
DROP TABLE IF EXISTS public.friendships CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id         uuid PRIMARY KEY DEFAULT auth.uid(),
  username   text UNIQUE NOT NULL CHECK (char_length(username) BETWEEN 3 AND 20),
  campus     text NOT NULL,
  role       text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE friendships (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status     text NOT NULL CHECK (status IN ('pending', 'accepted')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

CREATE TABLE posts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lat          float8 NOT NULL,
  lng          float8 NOT NULL,
  text         text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
  image_url    text,
  is_anonymous boolean DEFAULT false,
  score        integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE votes (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  value   smallint NOT NULL CHECK (value IN (1, -1)),
  UNIQUE (user_id, post_id)
);

CREATE TABLE messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text        text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE locations (
  user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  lat        float8 NOT NULL,
  lng        float8 NOT NULL,
  sharing    boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE moments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      text NOT NULL,
  lat        float8 NOT NULL,
  lng        float8 NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE communities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text UNIQUE NOT NULL CHECK (char_length(name) BETWEEN 3 AND 50),
  description text CHECK (char_length(description) <= 500),
  created_by  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lat         float8,
  lng         float8,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE community_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at    timestamptz DEFAULT now(),
  UNIQUE (community_id, user_id)
);

CREATE TABLE group_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  sender_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text         text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('post', 'message', 'user', 'group_message')),
  target_id   uuid NOT NULL,
  reason      text NOT NULL,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  reviewed_by uuid REFERENCES users(id),
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE push_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      text NOT NULL,
  platform   text NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE TABLE dating_profiles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photos     text[] NOT NULL CHECK (array_length(photos, 1) BETWEEN 2 AND 6),
  prompts    jsonb NOT NULL,
  age        smallint NOT NULL CHECK (age >= 18),
  bio        text CHECK (char_length(bio) <= 300),
  active     boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE dating_likes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  liker_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  liked_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  liked_content_type  text NOT NULL CHECK (liked_content_type IN ('photo', 'prompt')),
  liked_content_index smallint NOT NULL,
  comment             text CHECK (char_length(comment) <= 200),
  created_at          timestamptz DEFAULT now(),
  UNIQUE (liker_id, liked_id),
  CHECK (liker_id <> liked_id)
);

CREATE TABLE dating_matches (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (LEAST(user_a, user_b), GREATEST(user_a, user_b)),
  CHECK (user_a <> user_b)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_posts_location ON posts (lat, lng);
CREATE INDEX idx_posts_created ON posts (created_at DESC);
CREATE INDEX idx_messages_conversation ON messages (
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id),
  created_at
);
CREATE INDEX idx_friendships_user ON friendships (user_id, status);
CREATE INDEX idx_friendships_friend ON friendships (friend_id, status);
CREATE INDEX idx_community_members_user ON community_members (user_id);
CREATE INDEX idx_community_members_community ON community_members (community_id);
CREATE INDEX idx_group_messages_community ON group_messages (community_id, created_at DESC);
CREATE INDEX idx_reports_status ON reports (status, created_at);
CREATE INDEX idx_push_tokens_user ON push_tokens (user_id);
CREATE INDEX idx_dating_profiles_campus ON dating_profiles (user_id);
CREATE INDEX idx_dating_likes_liker ON dating_likes (liker_id);
CREATE INDEX idx_dating_likes_liked ON dating_likes (liked_id);
CREATE INDEX idx_dating_matches_users ON dating_matches (user_a, user_b);
CREATE INDEX idx_users_campus ON users (campus);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-create user profile on sign-up with campus extraction
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  email_domain text;
BEGIN
  email_domain := split_part(NEW.email, '@', 2);
  IF email_domain LIKE '%.%.edu' THEN
    email_domain := substring(email_domain from '[^.]+\.[^.]+$');
  END IF;

  INSERT INTO public.users (id, username, campus)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    email_domain
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Keep posts.score in sync with votes
CREATE OR REPLACE FUNCTION update_post_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET score = (
    SELECT COALESCE(SUM(value), 0) FROM votes
    WHERE post_id = COALESCE(NEW.post_id, OLD.post_id)
  ) WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_vote_change
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_post_score();

-- Auto-add community creator as admin member
CREATE OR REPLACE FUNCTION add_community_creator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO community_members (community_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_community_created
  AFTER INSERT ON communities
  FOR EACH ROW EXECUTE FUNCTION add_community_creator();

-- Auto-create match when mutual like detected
CREATE OR REPLACE FUNCTION check_for_match()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM dating_likes
    WHERE liker_id = NEW.liked_id AND liked_id = NEW.liker_id
  ) THEN
    INSERT INTO dating_matches (user_a, user_b)
    VALUES (LEAST(NEW.liker_id, NEW.liked_id), GREATEST(NEW.liker_id, NEW.liked_id))
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_dating_like
  AFTER INSERT ON dating_likes
  FOR EACH ROW EXECUTE FUNCTION check_for_match();

-- Auto-update updated_at on locations
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER locations_set_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER dating_profiles_set_updated_at
  BEFORE UPDATE ON dating_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE dating_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dating_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dating_matches ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- users
CREATE POLICY "Users are viewable by authenticated users"
  ON users FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE USING (id = auth.uid());

-- friendships
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can create friend requests"
  ON friendships FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own friendship rows"
  ON friendships FOR UPDATE
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can delete own friendship rows"
  ON friendships FOR DELETE
  USING (user_id = auth.uid() OR friend_id = auth.uid());

-- posts
CREATE POLICY "Posts are viewable by authenticated users"
  ON posts FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own posts or admin"
  ON posts FOR UPDATE USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can delete own posts or admin"
  ON posts FOR DELETE USING (user_id = auth.uid() OR is_admin());

-- votes
CREATE POLICY "Users can view own votes"
  ON votes FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create votes"
  ON votes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own votes"
  ON votes FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own votes"
  ON votes FOR DELETE USING (user_id = auth.uid());

-- messages
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Admin can delete messages"
  ON messages FOR DELETE USING (is_admin());

-- locations (friends only)
CREATE POLICY "Users can view own or friends shared locations"
  ON locations FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      sharing = true
      AND EXISTS (
        SELECT 1 FROM friendships
        WHERE status = 'accepted'
          AND user_id = auth.uid()
          AND friend_id = locations.user_id
      )
    )
  );

CREATE POLICY "Users can upsert own location"
  ON locations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own location"
  ON locations FOR UPDATE
  USING (user_id = auth.uid());

-- moments
CREATE POLICY "Users can view own moments"
  ON moments FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create moments"
  ON moments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own moments"
  ON moments FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own moments"
  ON moments FOR DELETE USING (user_id = auth.uid());

-- communities
CREATE POLICY "Communities are viewable by authenticated users"
  ON communities FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create communities"
  ON communities FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creator or admin can update community"
  ON communities FOR UPDATE
  USING (created_by = auth.uid() OR is_admin());

CREATE POLICY "Creator or admin can delete community"
  ON communities FOR DELETE
  USING (created_by = auth.uid() OR is_admin());

-- community_members
CREATE POLICY "Members can view community membership"
  ON community_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_members.community_id
        AND cm.user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Users can join communities"
  ON community_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Community admin can update members"
  ON community_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_members.community_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
    )
    OR is_admin()
  );

CREATE POLICY "Users can leave or admin can remove"
  ON community_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_members.community_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
    )
    OR is_admin()
  );

-- group_messages
CREATE POLICY "Community members can view group messages"
  ON group_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = group_messages.community_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Community members can send group messages"
  ON group_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = group_messages.community_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "Sender or admin can delete group messages"
  ON group_messages FOR DELETE
  USING (sender_id = auth.uid() OR is_admin());

-- reports
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users view own reports admins view all"
  ON reports FOR SELECT
  USING (reporter_id = auth.uid() OR is_admin());

CREATE POLICY "Admins can update reports"
  ON reports FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete reports"
  ON reports FOR DELETE USING (is_admin());

-- push_tokens
CREATE POLICY "Users can view own push tokens"
  ON push_tokens FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can register push tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own push tokens"
  ON push_tokens FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own push tokens"
  ON push_tokens FOR DELETE USING (user_id = auth.uid());

-- dating_profiles
CREATE POLICY "View active profiles on same campus"
  ON dating_profiles FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      active = true
      AND EXISTS (
        SELECT 1 FROM users u1, users u2
        WHERE u1.id = dating_profiles.user_id
          AND u2.id = auth.uid()
          AND u1.campus = u2.campus
      )
    )
  );

CREATE POLICY "Users can create own dating profile"
  ON dating_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own dating profile"
  ON dating_profiles FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own dating profile"
  ON dating_profiles FOR DELETE USING (user_id = auth.uid());

-- dating_likes
CREATE POLICY "Users can see likes involving them"
  ON dating_likes FOR SELECT
  USING (liker_id = auth.uid() OR liked_id = auth.uid());

CREATE POLICY "Users can create likes"
  ON dating_likes FOR INSERT
  WITH CHECK (liker_id = auth.uid());

CREATE POLICY "Users can delete own likes"
  ON dating_likes FOR DELETE USING (liker_id = auth.uid());

-- dating_matches
CREATE POLICY "Users can see own matches"
  ON dating_matches FOR SELECT
  USING (user_a = auth.uid() OR user_b = auth.uid());

CREATE POLICY "Users can delete own matches"
  ON dating_matches FOR DELETE
  USING (user_a = auth.uid() OR user_b = auth.uid());

-- ============================================
-- REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE locations;
ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
