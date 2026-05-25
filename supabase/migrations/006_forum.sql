-- ─────────────────────────────────────────────────────────────────────────────
-- 006_forum.sql  —  Forum: categories · posts · replies · likes · follows
-- Run in Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Categories ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_categories (
  id          SERIAL PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  name_zh     TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT '💬',
  description TEXT,
  description_zh TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  post_count  INTEGER NOT NULL DEFAULT 0
);

-- Seed categories
INSERT INTO public.forum_categories (slug, name, name_zh, icon, description, description_zh, sort_order) VALUES
  ('match',    'Match Talk',      '赛事讨论',   '⚽', 'Pre-match previews, post-match reviews & live chat',  '赛前预测、赛后复盘与即时讨论',  1),
  ('stars',    'Stars & Players', '风云人物',   '⭐', 'Player news, performances & debates',                '球星动态、表现点评与话题争议',  2),
  ('predict',  'Predictions',     '竞猜交流',   '🎯', 'Share GC bet strategies, tips & win/loss stories',   '分享竞猜策略、心得与战绩',      3),
  ('tactical', 'Tactics',         '战术分析',   '🧠', 'Formations, tactics & in-depth match analysis',      '阵型解析、战术拆解与深度分析',  4),
  ('teams',    'Team Talk',        '各队前瞻',   '🏴', 'Discussion on all 48 World Cup nations',             '48支参赛国家队阵容与前景分析',  5),
  ('breaking', 'Breaking News',   '热点新闻',   '🔥', 'Latest transfers, injuries & controversy',           '最新转会、伤情与争议话题',      6),
  ('history',  'WC History',      '世界杯历史', '📜', 'Classic matches, records & World Cup legends',       '经典比赛、历史纪录与传奇故事',  7),
  ('lounge',   'Fan Lounge',      '球迷休息室', '🎉', 'Memes, banter & off-topic fun',                      '表情包、闲聊与球迷日常',        8)
ON CONFLICT (slug) DO NOTHING;

-- ── 2. Posts ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id            BIGSERIAL PRIMARY KEY,
  category_id   INTEGER NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  user_id       UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT    NOT NULL,
  content       TEXT    NOT NULL,
  match_id      INTEGER REFERENCES public.matches(id) ON DELETE SET NULL,
  is_pinned     BOOLEAN NOT NULL DEFAULT FALSE,
  is_locked     BOOLEAN NOT NULL DEFAULT FALSE,
  view_count    INTEGER NOT NULL DEFAULT 0,
  reply_count   INTEGER NOT NULL DEFAULT 0,
  like_count    INTEGER NOT NULL DEFAULT 0,
  last_reply_at TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS forum_posts_category_idx    ON public.forum_posts(category_id, last_reply_at DESC);
CREATE INDEX IF NOT EXISTS forum_posts_user_idx        ON public.forum_posts(user_id);
CREATE INDEX IF NOT EXISTS forum_posts_created_idx     ON public.forum_posts(created_at DESC);

-- ── 3. Replies ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_replies (
  id         BIGSERIAL PRIMARY KEY,
  post_id    BIGINT NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id    UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id  BIGINT REFERENCES public.forum_replies(id) ON DELETE SET NULL,
  content    TEXT   NOT NULL,
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS forum_replies_post_idx ON public.forum_replies(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS forum_replies_user_idx ON public.forum_replies(user_id);

-- ── 4. Likes (posts + replies) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_likes (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post','reply')),
  target_id   BIGINT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, target_type, target_id)
);

-- ── 5. Post follows ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_follows (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id    BIGINT NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, post_id)
);

-- ── 6. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_likes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_follows    ENABLE ROW LEVEL SECURITY;

-- Categories: public read
CREATE POLICY "forum_categories_read" ON public.forum_categories
  FOR SELECT USING (true);

-- Posts: public read; auth users insert own; owner or admin update/delete
CREATE POLICY "forum_posts_read"   ON public.forum_posts FOR SELECT USING (true);
CREATE POLICY "forum_posts_insert" ON public.forum_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_posts_update" ON public.forum_posts FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "forum_posts_delete" ON public.forum_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Replies: same pattern
CREATE POLICY "forum_replies_read"   ON public.forum_replies FOR SELECT USING (true);
CREATE POLICY "forum_replies_insert" ON public.forum_replies FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_replies_update" ON public.forum_replies FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "forum_replies_delete" ON public.forum_replies FOR DELETE
  USING (auth.uid() = user_id);

-- Likes: auth users manage their own
CREATE POLICY "forum_likes_read"   ON public.forum_likes FOR SELECT USING (true);
CREATE POLICY "forum_likes_insert" ON public.forum_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_likes_delete" ON public.forum_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Follows: auth users manage their own
CREATE POLICY "forum_follows_read"   ON public.forum_follows FOR SELECT USING (true);
CREATE POLICY "forum_follows_insert" ON public.forum_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_follows_delete" ON public.forum_follows FOR DELETE
  USING (auth.uid() = user_id);

-- ── 7. Triggers: keep counters in sync ───────────────────────────────────────

-- reply_count on forum_posts
CREATE OR REPLACE FUNCTION public.forum_reply_count_inc()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.forum_posts
  SET reply_count   = reply_count + 1,
      last_reply_at = NOW()
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_forum_reply_inc ON public.forum_replies;
CREATE TRIGGER trg_forum_reply_inc
  AFTER INSERT ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.forum_reply_count_inc();

CREATE OR REPLACE FUNCTION public.forum_reply_count_dec()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.forum_posts
  SET reply_count = GREATEST(0, reply_count - 1)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS trg_forum_reply_dec ON public.forum_replies;
CREATE TRIGGER trg_forum_reply_dec
  AFTER DELETE ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.forum_reply_count_dec();

-- post_count on forum_categories
CREATE OR REPLACE FUNCTION public.forum_post_count_inc()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.forum_categories SET post_count = post_count + 1 WHERE id = NEW.category_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_forum_post_inc ON public.forum_posts;
CREATE TRIGGER trg_forum_post_inc
  AFTER INSERT ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.forum_post_count_inc();

CREATE OR REPLACE FUNCTION public.forum_post_count_dec()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.forum_categories SET post_count = GREATEST(0, post_count - 1) WHERE id = OLD.category_id;
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS trg_forum_post_dec ON public.forum_posts;
CREATE TRIGGER trg_forum_post_dec
  AFTER DELETE ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.forum_post_count_dec();

-- like_count on posts / replies
CREATE OR REPLACE FUNCTION public.forum_like_count_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE delta INT := CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE -1 END;
        rid   BIGINT := CASE WHEN TG_OP = 'INSERT' THEN NEW.target_id ELSE OLD.target_id END;
        rtype TEXT   := CASE WHEN TG_OP = 'INSERT' THEN NEW.target_type ELSE OLD.target_type END;
BEGIN
  IF rtype = 'post' THEN
    UPDATE public.forum_posts   SET like_count = GREATEST(0, like_count + delta) WHERE id = rid;
  ELSE
    UPDATE public.forum_replies SET like_count = GREATEST(0, like_count + delta) WHERE id = rid;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_forum_like_change ON public.forum_likes;
CREATE TRIGGER trg_forum_like_change
  AFTER INSERT OR DELETE ON public.forum_likes
  FOR EACH ROW EXECUTE FUNCTION public.forum_like_count_change();
