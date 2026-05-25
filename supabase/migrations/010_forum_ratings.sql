-- ─────────────────────────────────────────────────────────────────────────────
-- 010_forum_ratings.sql  —  Post rating/scoring system (like Discuz 精华评分)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.forum_ratings (
  id          BIGSERIAL PRIMARY KEY,
  post_id     BIGINT  NOT NULL REFERENCES public.forum_posts(id)  ON DELETE CASCADE,
  user_id     UUID    NOT NULL REFERENCES auth.users(id)          ON DELETE CASCADE,
  gc_amount   INTEGER NOT NULL,   -- positive = award, negative = penalty
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, post_id)       -- one rating per user per post
);

CREATE INDEX IF NOT EXISTS forum_ratings_post_idx ON public.forum_ratings(post_id, created_at DESC);

-- RLS
ALTER TABLE public.forum_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forum_ratings_read"   ON public.forum_ratings FOR SELECT USING (true);
CREATE POLICY "forum_ratings_insert" ON public.forum_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_ratings_delete" ON public.forum_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- Also add last_seen to users table for online status
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
