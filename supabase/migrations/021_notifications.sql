-- ─────────────────────────────────────────────────────────────────────────────
-- 021_notifications.sql — In-site notification system
-- Types: 'rating' (tip/punish), 'reply' (someone replied to your post/reply)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id          BIGSERIAL    PRIMARY KEY,
  user_id     UUID         NOT NULL REFERENCES public.users(id)         ON DELETE CASCADE,
  type        TEXT         NOT NULL CHECK (type IN ('rating', 'reply')),
  is_read     BOOLEAN      NOT NULL DEFAULT false,
  actor_id    UUID                  REFERENCES public.users(id)         ON DELETE SET NULL,
  post_id     BIGINT                REFERENCES public.forum_posts(id)   ON DELETE CASCADE,
  reply_id    BIGINT                REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  gc_amount   INTEGER,      -- rating only: positive = tip, negative = punish
  reason      TEXT,         -- rating only
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Fast lookup: user's unread notifications sorted by time
CREATE INDEX IF NOT EXISTS notif_user_read_time_idx
  ON public.notifications (user_id, is_read, created_at DESC);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notif_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow any authenticated user to insert (route validates auth before inserting)
CREATE POLICY "notif_insert_auth" ON public.notifications
  FOR INSERT WITH CHECK (true);
