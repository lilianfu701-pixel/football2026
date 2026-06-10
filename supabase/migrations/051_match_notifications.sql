-- ─────────────────────────────────────────────────────────────────────────────
-- 051_match_notifications.sql — Match event notification support
--
-- 1. Add red card tracking columns to matches
-- 2. Add match-related columns to notifications (backward-safe, nullable)
-- 3. Create match_notifications_sent dedup table
--    Prevents the same event from being notified twice across Cron runs
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Red card counters on matches (default 0, safe for existing rows)
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS red_cards_home INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS red_cards_away INTEGER NOT NULL DEFAULT 0;

-- 2. Match notification columns on notifications
--    match_id  — which match this notification is about
--    event_detail — JSONB payload (team names, flags, score, etc.)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS match_id     INTEGER REFERENCES public.matches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS event_detail JSONB;

-- Index: fast lookup of match notifications for a user
CREATE INDEX IF NOT EXISTS notif_match_id_idx
  ON public.notifications (match_id)
  WHERE match_id IS NOT NULL;

-- 3. Dedup table: one row per (match, event_type, event_key)
--    event_key examples: "kickoff", "goal_home_1", "goal_away_2",
--                        "red_home_1", "final", "countdown_10min"
CREATE TABLE IF NOT EXISTS public.match_notifications_sent (
  id         BIGSERIAL    PRIMARY KEY,
  match_id   INTEGER      NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  event_type TEXT         NOT NULL,
  event_key  TEXT         NOT NULL,
  sent_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, event_type, event_key)
);

CREATE INDEX IF NOT EXISTS mns_match_event_idx
  ON public.match_notifications_sent (match_id, event_type);

-- Only service role (Cron job) should write here; no user-level access needed
ALTER TABLE public.match_notifications_sent ENABLE ROW LEVEL SECURITY;
