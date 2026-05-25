-- ── Referral system ──────────────────────────────────────────────────────────
-- Adds invite tracking to users and a milestone claims table.

-- 1. Extend users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referred_by   TEXT    DEFAULT NULL,   -- referrer's username
  ADD COLUMN IF NOT EXISTS invite_count  INTEGER DEFAULT 0,      -- cached count of successful invites
  ADD COLUMN IF NOT EXISTS invite_gc     BIGINT  DEFAULT 0;      -- total GC earned from referrals

-- 2. Milestone claims (prevent double-claiming)
CREATE TABLE IF NOT EXISTS public.invite_milestone_claims (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone   INTEGER     NOT NULL,   -- number of invites required
  gc_reward   BIGINT      NOT NULL,
  claimed_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, milestone)
);

-- RLS
ALTER TABLE public.invite_milestone_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own milestone claims"
  ON public.invite_milestone_claims FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE from client — server-side only (SECURITY DEFINER function)

-- 3. Index for leaderboard query
CREATE INDEX IF NOT EXISTS idx_users_invite_count
  ON public.users (invite_count DESC NULLS LAST);

-- 4. SECURITY DEFINER function: called server-side after a new user confirms email.
--    Awards 20 M GC to both parties, increments invite_count, checks milestones.
CREATE OR REPLACE FUNCTION public.process_referral(
  new_user_id   UUID,
  referrer_name TEXT
)
RETURNS VOID AS $$
DECLARE
  referrer_id     UUID;
  referrer_bal    BIGINT;
  new_bal         BIGINT;
  new_invite_cnt  INTEGER;
  reward_per_side BIGINT := 20000000;   -- 20 M GC each
  -- Milestone definitions: (threshold, bonus_gc)
  milestones      INTEGER[] := ARRAY[3, 10, 25, 50];
  bonuses         BIGINT[]  := ARRAY[50000000, 200000000, 500000000, 1000000000];
  i               INTEGER;
  already_claimed BOOLEAN;
BEGIN
  -- Look up referrer
  SELECT id, gc_balance INTO referrer_id, referrer_bal
  FROM public.users
  WHERE username = referrer_name
  LIMIT 1;

  IF referrer_id IS NULL THEN RETURN; END IF;
  -- Don't self-refer
  IF referrer_id = new_user_id THEN RETURN; END IF;

  -- a) Mark new user as referred
  UPDATE public.users
  SET referred_by = referrer_name,
      gc_balance  = gc_balance + reward_per_side,
      invite_gc   = invite_gc  + reward_per_side
  WHERE id = new_user_id;

  -- b) Reward referrer + increment invite_count
  UPDATE public.users
  SET gc_balance   = gc_balance  + reward_per_side,
      invite_count = invite_count + 1,
      invite_gc    = invite_gc   + reward_per_side
  WHERE id = referrer_id
  RETURNING invite_count INTO new_invite_cnt;

  -- c) Check each milestone
  FOR i IN 1 .. array_length(milestones, 1) LOOP
    IF new_invite_cnt >= milestones[i] THEN
      SELECT EXISTS (
        SELECT 1 FROM public.invite_milestone_claims
        WHERE user_id = referrer_id AND milestone = milestones[i]
      ) INTO already_claimed;

      IF NOT already_claimed THEN
        -- Award bonus
        UPDATE public.users
        SET gc_balance = gc_balance + bonuses[i],
            invite_gc  = invite_gc  + bonuses[i]
        WHERE id = referrer_id;

        INSERT INTO public.invite_milestone_claims (user_id, milestone, gc_reward)
        VALUES (referrer_id, milestones[i], bonuses[i]);
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
