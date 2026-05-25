-- Migration 029: Switch to Parimutuel betting (dynamic pool, 5% rake)

-- 1. Drop the GENERATED ALWAYS column (incompatible with parimutuel)
ALTER TABLE public.bets DROP COLUMN IF EXISTS potential_payout;

-- 2. Re-add as regular nullable bigint (filled at settlement)
ALTER TABLE public.bets ADD COLUMN IF NOT EXISTS potential_payout bigint;

-- 3. Make odds nullable (no longer meaningful at bet time; kept for snapshot)
ALTER TABLE public.bets ALTER COLUMN odds DROP NOT NULL;
ALTER TABLE public.bets ALTER COLUMN odds SET DEFAULT NULL;

-- 4. Add pool columns to matches for fast UI display (updated on each bet)
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS pool_home bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pool_draw bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pool_away bigint NOT NULL DEFAULT 0;

-- 5. Add platform_rake column to matches (filled at settlement)
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS platform_rake bigint;

-- Index for bulk settlement queries
CREATE INDEX IF NOT EXISTS bets_match_status_idx ON public.bets(match_id, status);
