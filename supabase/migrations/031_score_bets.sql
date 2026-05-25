-- ─────────────────────────────────────────────────────────────────────────────
-- 031_score_bets.sql
-- Score prediction (比分竞猜) — parimutuel, one bet per user per match.
-- score_home = 99, score_away = 99  →  "Other / 其他" bucket
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.score_bets (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_id         integer       NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  score_home       smallint      NOT NULL CHECK (score_home >= 0),
  score_away       smallint      NOT NULL CHECK (score_away >= 0),
  gc_amount        bigint        NOT NULL CHECK (gc_amount > 0),
  status           text          NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'won', 'lost', 'refunded')),
  potential_payout bigint,
  created_at       timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_id)     -- one score bet per user per match
);

-- Indexes
CREATE INDEX IF NOT EXISTS score_bets_match_idx ON public.score_bets (match_id);
CREATE INDEX IF NOT EXISTS score_bets_user_idx  ON public.score_bets (user_id);

-- RLS
ALTER TABLE public.score_bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "score_bets_select_own" ON public.score_bets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "score_bets_insert_own" ON public.score_bets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "score_bets_update_own" ON public.score_bets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "score_bets_delete_own" ON public.score_bets
  FOR DELETE USING (auth.uid() = user_id);
