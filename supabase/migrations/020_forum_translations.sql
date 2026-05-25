-- 020_forum_translations.sql
-- Unified translation cache: supports any language, any content type.
-- Replaces the per-column approach (content_zh, content_en, title_zh, title_en).

CREATE TABLE IF NOT EXISTS public.forum_translations (
  id         BIGSERIAL PRIMARY KEY,
  type       TEXT        NOT NULL
               CHECK (type IN ('post_content', 'post_title', 'reply_content')),
  source_id  BIGINT      NOT NULL,
  lang       TEXT        NOT NULL,   -- 'zh','en','es','pt','ar','fr','de','ja','ko', …
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (type, source_id, lang)
);

CREATE INDEX IF NOT EXISTS forum_translations_lookup
  ON public.forum_translations (type, source_id);

-- ── Migrate existing translations from old columns ──────────────────────────

INSERT INTO public.forum_translations (type, source_id, lang, content)
SELECT 'post_content', id, 'zh', content_zh
FROM public.forum_posts WHERE content_zh IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.forum_translations (type, source_id, lang, content)
SELECT 'post_content', id, 'en', content_en
FROM public.forum_posts WHERE content_en IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.forum_translations (type, source_id, lang, content)
SELECT 'post_title', id, 'zh', title_zh
FROM public.forum_posts WHERE title_zh IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.forum_translations (type, source_id, lang, content)
SELECT 'post_title', id, 'en', title_en
FROM public.forum_posts WHERE title_en IS NOT NULL
ON CONFLICT DO NOTHING;

-- (forum_replies had content_zh / content_en in the original schema —
--  migrate them if they exist)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forum_replies' AND column_name = 'content_zh'
  ) THEN
    INSERT INTO public.forum_translations (type, source_id, lang, content)
    SELECT 'reply_content', id, 'zh', content_zh
    FROM public.forum_replies WHERE content_zh IS NOT NULL
    ON CONFLICT DO NOTHING;

    INSERT INTO public.forum_translations (type, source_id, lang, content)
    SELECT 'reply_content', id, 'en', content_en
    FROM public.forum_replies WHERE content_en IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- RLS: anyone can read, authenticated users can insert (via API only)
ALTER TABLE public.forum_translations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "translations_read_all" ON public.forum_translations
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "translations_insert_auth" ON public.forum_translations
    FOR INSERT WITH CHECK (true);   -- API uses service role; RLS on insert is permissive
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "translations_update_auth" ON public.forum_translations
    FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
