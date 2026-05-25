-- ─────────────────────────────────────────────────────────────────────────────
-- 018_category_no_new_posts.sql
-- Add no_new_posts flag to forum_categories.
-- When TRUE the board is read-only for regular users (system posts only).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.forum_categories
  ADD COLUMN IF NOT EXISTS no_new_posts BOOLEAN NOT NULL DEFAULT FALSE;

-- The "match" board only shows auto-generated match threads
UPDATE public.forum_categories
  SET no_new_posts = TRUE
  WHERE slug = 'match';
