-- 026: Featured posts, daily check-in, bookmarks, reports, tags

-- ── 1. Featured posts ─────────────────────────────────────────────────────
ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS forum_posts_featured_idx ON public.forum_posts(is_featured) WHERE is_featured = TRUE;

-- ── 2. Daily check-in ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.check_ins (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  streak     INTEGER     NOT NULL DEFAULT 1,
  gc_earned  INTEGER     NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS check_ins_user_idx ON public.check_ins(user_id);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checkins_select" ON public.check_ins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "checkins_insert" ON public.check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 3. Bookmarks ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_bookmarks (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID    NOT NULL REFERENCES public.users(id)        ON DELETE CASCADE,
  post_id    INTEGER NOT NULL REFERENCES public.forum_posts(id)  ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS forum_bookmarks_user_idx ON public.forum_bookmarks(user_id);

ALTER TABLE public.forum_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookmarks_select" ON public.forum_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bookmarks_insert" ON public.forum_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bookmarks_delete" ON public.forum_bookmarks FOR DELETE USING (auth.uid() = user_id);

-- ── 4. Reports ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_reports (
  id          BIGSERIAL PRIMARY KEY,
  reporter_id UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  post_id     INTEGER     REFERENCES public.forum_posts(id)    ON DELETE CASCADE,
  reply_id    INTEGER     REFERENCES public.forum_replies(id)  ON DELETE CASCADE,
  reason      TEXT        NOT NULL DEFAULT 'other'
              CHECK (reason IN ('spam','abuse','misleading','illegal','other')),
  detail      TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT report_target CHECK (
    (post_id IS NOT NULL AND reply_id IS NULL) OR
    (post_id IS NULL    AND reply_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS forum_reports_status_idx ON public.forum_reports(status);

ALTER TABLE public.forum_reports ENABLE ROW LEVEL SECURITY;
-- Reporters can insert their own reports
CREATE POLICY "reports_insert" ON public.forum_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
-- Users can view their own reports; admins see all (handled in API via service role)
CREATE POLICY "reports_select" ON public.forum_reports FOR SELECT USING (auth.uid() = reporter_id);

-- ── 5. Tags ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_tags (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  name_zh    TEXT,
  color      TEXT NOT NULL DEFAULT '#4F46E5',
  post_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.forum_post_tags (
  post_id INTEGER NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES public.forum_tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS forum_post_tags_tag_idx ON public.forum_post_tags(tag_id);

ALTER TABLE public.forum_tags        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_tags   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_select"      ON public.forum_tags      FOR SELECT USING (true);
CREATE POLICY "post_tags_select" ON public.forum_post_tags FOR SELECT USING (true);
-- Only authenticated users can add tags to posts (enforced more strictly in API)
CREATE POLICY "post_tags_insert" ON public.forum_post_tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "post_tags_delete" ON public.forum_post_tags FOR DELETE USING (auth.uid() IS NOT NULL);

-- Seed common tags
INSERT INTO public.forum_tags (name, name_zh, color) VALUES
  ('prediction',  '竞猜',   '#F59E0B'),
  ('analysis',    '赛前分析','#3B82F6'),
  ('live',        '赛中',   '#10B981'),
  ('post-match',  '赛后',   '#8B5CF6'),
  ('highlight',   '精彩回顾','#EF4444'),
  ('transfer',    '转会',   '#EC4899'),
  ('tactics',     '战术',   '#06B6D4'),
  ('humor',       '趣味',   '#F97316')
ON CONFLICT (name) DO NOTHING;

-- ── 6. Messages (DMs) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id          BIGSERIAL PRIMARY KEY,
  sender_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_receiver_idx ON public.messages(receiver_id, is_read);
CREATE INDEX IF NOT EXISTS messages_sender_idx   ON public.messages(sender_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select" ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "messages_insert" ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "messages_update" ON public.messages FOR UPDATE
  USING (auth.uid() = receiver_id);
