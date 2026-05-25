-- 019_title_translations.sql
-- Add translated title columns to forum_posts

ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS title_zh TEXT,
  ADD COLUMN IF NOT EXISTS title_en TEXT;
