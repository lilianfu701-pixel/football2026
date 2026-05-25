-- ─────────────────────────────────────────────────────────────────────────────
-- 011_forum_translate.sql  —  Auto-translation cache for forum posts & replies
-- ─────────────────────────────────────────────────────────────────────────────

-- Posts: store one translated version per target language
ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS content_zh        TEXT,   -- cached Chinese translation
  ADD COLUMN IF NOT EXISTS content_en        TEXT,   -- cached English translation
  ADD COLUMN IF NOT EXISTS translated_at     TIMESTAMPTZ;  -- last translation time

-- Replies: same pattern
ALTER TABLE public.forum_replies
  ADD COLUMN IF NOT EXISTS content_zh        TEXT,
  ADD COLUMN IF NOT EXISTS content_en        TEXT,
  ADD COLUMN IF NOT EXISTS translated_at     TIMESTAMPTZ;
