-- Posts table for the Ampd vertical slice.
-- Run this in your Supabase SQL Editor to create the table.

CREATE TABLE IF NOT EXISTS posts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid,
  lat         float8      NOT NULL DEFAULT 0,
  lng         float8      NOT NULL DEFAULT 0,
  text        text        NOT NULL CHECK (char_length(text) <= 500),
  image_url   text,
  is_anonymous boolean    NOT NULL DEFAULT true,
  score       integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_location ON posts (lat, lng);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Permissive policies for the anonymous-posting vertical slice.
-- Tighten these once auth is wired up.
CREATE POLICY "Posts are viewable by everyone"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create posts"
  ON posts FOR INSERT
  WITH CHECK (true);
