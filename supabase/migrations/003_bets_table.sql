-- Bets / Predictions table
CREATE TABLE IF NOT EXISTS public.bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  prediction text NOT NULL CHECK (prediction IN ('home', 'draw', 'away')),
  gc_amount bigint NOT NULL DEFAULT 0 CHECK (gc_amount >= 0),
  odds numeric(6, 2) NOT NULL DEFAULT 1.00,
  potential_payout bigint GENERATED ALWAYS AS (ROUND(gc_amount * odds)) STORED,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'refunded')),
  payout_amount bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  UNIQUE(user_id, match_id)
);

-- Enable RLS
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

-- Users can read their own bets
CREATE POLICY "users_read_own_bets" ON public.bets
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own bets
CREATE POLICY "users_insert_own_bets" ON public.bets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS bets_user_id_idx ON public.bets(user_id);
CREATE INDEX IF NOT EXISTS bets_match_id_idx ON public.bets(match_id);

-- Add odds columns to matches table (for dynamic odds)
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS odds_home numeric(6, 2) DEFAULT 2.00,
  ADD COLUMN IF NOT EXISTS odds_draw numeric(6, 2) DEFAULT 3.20,
  ADD COLUMN IF NOT EXISTS odds_away numeric(6, 2) DEFAULT 2.80;
