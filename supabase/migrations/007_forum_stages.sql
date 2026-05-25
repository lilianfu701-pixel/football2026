-- ─────────────────────────────────────────────────────────────────────────────
-- 007_forum_stages.sql  —  Add stage filter + match-thread support to forum
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add stage column to forum_posts (used to filter posts in Match Talk)
ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS stage TEXT;

-- 2. Allow user_id to be NULL for system-generated match threads
--    (match threads are auto-created by the server, not by a real user)
ALTER TABLE public.forum_posts
  ALTER COLUMN user_id DROP NOT NULL;

-- 3. Index for fast match-thread lookup
CREATE INDEX IF NOT EXISTS forum_posts_match_id_idx ON public.forum_posts(match_id);
CREATE INDEX IF NOT EXISTS forum_posts_stage_idx    ON public.forum_posts(stage, last_reply_at DESC);

-- 4. Update RLS: system posts (user_id IS NULL) are readable but not editable by anyone
DROP POLICY IF EXISTS "forum_posts_update" ON public.forum_posts;
DROP POLICY IF EXISTS "forum_posts_delete" ON public.forum_posts;

CREATE POLICY "forum_posts_update" ON public.forum_posts FOR UPDATE
  USING (auth.uid() = user_id AND user_id IS NOT NULL);
CREATE POLICY "forum_posts_delete" ON public.forum_posts FOR DELETE
  USING (auth.uid() = user_id AND user_id IS NOT NULL);
