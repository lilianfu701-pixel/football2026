-- ─────────────────────────────────────────────────────────────────────────────
-- 022_edited_at.sql — Track edit history on posts and replies
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.forum_posts   ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE public.forum_replies ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
