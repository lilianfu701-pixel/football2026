-- ── 045: Player follows ──────────────────────────────────────────────────
-- Lets authenticated users follow/unfollow World Cup 2026 players.
-- Surfaced on player profiles (follow button) and the personal dashboard
-- (关注的球员 / Followed Players section).

CREATE TABLE IF NOT EXISTS public.player_follows (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id   INTEGER NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, player_id)
);

-- Fast lookups: "who do I follow" and "how many follow this player"
CREATE INDEX IF NOT EXISTS player_follows_user_idx   ON public.player_follows (user_id);
CREATE INDEX IF NOT EXISTS player_follows_player_idx ON public.player_follows (player_id);

-- RLS: users manage only their own follow rows
ALTER TABLE public.player_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_follows_select_own" ON public.player_follows
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "player_follows_insert_own" ON public.player_follows
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "player_follows_delete_own" ON public.player_follows
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Service role (admin API routes) bypasses RLS automatically.
