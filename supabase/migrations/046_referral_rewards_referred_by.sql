-- ─────────────────────────────────────────────────────────────────────────────
-- 046_referral_rewards_referred_by.sql  (Option B — pure referred_by stats)
--
-- Problem: process_referral (migrations 005 / 040) references columns that never
--   existed in production:
--     • users.username      → the live schema uses `nickname` (see migration 042)
--     • users.invite_count  → never created (migration 005 was not applied)
--     • users.invite_gc     → never created (migration 005 was not applied)
--   so EVERY referral call errored out and NO GC was ever granted. The invite
--   page, leaderboard, missions, and sidebar all read these phantom columns too.
--
-- Fix (Option B): make `referred_by` the single source of truth.
--   • Referrer lookup uses nickname OR referral_code (referred_by may store
--     either, depending on what was in the ?ref= URL at signup).
--   • Per-invite reward: 500K GC to BOTH sides (PER_INVITE_GC in
--     src/lib/inviteMilestones.ts), touching ONLY gc_balance + gc_total.
--   • Invite count is COUNTED LIVE from referred_by, never cached.
--   • Milestone bonuses (3/10/25/50 → 50K/200K/500K/1M) stay idempotent via
--     invite_milestone_claims.
--   • Whole call is idempotent per new user via referral_processed, so a retried
--     signup can't double-pay.
--
-- Idempotent and safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Milestone claims (referrer-side idempotency). Schema matches migration 005.
CREATE TABLE IF NOT EXISTS public.invite_milestone_claims (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone   INTEGER     NOT NULL,
  gc_reward   BIGINT      NOT NULL,
  claimed_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, milestone)
);

ALTER TABLE public.invite_milestone_claims ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'invite_milestone_claims'
      AND policyname = 'Users can read own milestone claims'
  ) THEN
    CREATE POLICY "Users can read own milestone claims"
      ON public.invite_milestone_claims FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;
-- No client INSERT/UPDATE policy: writes happen only inside the SECURITY DEFINER
-- function below, which bypasses RLS.

-- 2. Per-new-user processing guard (whole-call idempotency).
CREATE TABLE IF NOT EXISTS public.referral_processed (
  new_user_id  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_id  UUID,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.referral_processed ENABLE ROW LEVEL SECURITY;
-- No policies → no client access. Server-side function (SECURITY DEFINER) only.

-- 3. Rewrite process_referral. Signature unchanged so auth/actions.ts keeps
--    calling rpc('process_referral', { new_user_id, referrer_name }).
CREATE OR REPLACE FUNCTION public.process_referral(
  new_user_id   UUID,
  referrer_name TEXT
)
RETURNS VOID AS $$
DECLARE
  referrer_id        UUID;
  referrer_nickname  TEXT;
  referrer_code      TEXT;
  new_invite_cnt     INTEGER;
  reward_per_side    BIGINT := 500000;          -- PER_INVITE_GC (50万 GC each side)
  milestones         INTEGER[] := ARRAY[3, 10, 25, 50];
  bonuses            BIGINT[]  := ARRAY[50000, 200000, 500000, 1000000];
  i                  INTEGER;
BEGIN
  IF referrer_name IS NULL OR BTRIM(referrer_name) = '' THEN
    RETURN;
  END IF;

  -- Resolve referrer by nickname OR referral_code (referred_by may hold either).
  SELECT id, nickname, referral_code
    INTO referrer_id, referrer_nickname, referrer_code
  FROM public.users
  WHERE nickname = referrer_name OR referral_code = referrer_name
  LIMIT 1;

  IF referrer_id IS NULL THEN RETURN; END IF;       -- unknown referrer
  IF referrer_id = new_user_id THEN RETURN; END IF; -- no self-referral

  -- Whole-call idempotency: bail if this new user was already processed.
  BEGIN
    INSERT INTO public.referral_processed (new_user_id, referrer_id)
    VALUES (new_user_id, referrer_id);
  EXCEPTION WHEN unique_violation THEN
    RETURN;
  END;

  -- a) Reward the new user (referred_by was already set at signup in actions.ts).
  UPDATE public.users
  SET gc_balance = gc_balance + reward_per_side,
      gc_total   = gc_total   + reward_per_side
  WHERE id = new_user_id;

  -- b) Reward the referrer.
  UPDATE public.users
  SET gc_balance = gc_balance + reward_per_side,
      gc_total   = gc_total   + reward_per_side
  WHERE id = referrer_id;

  -- c) Live invite count from referred_by (the single source of truth).
  SELECT COUNT(*) INTO new_invite_cnt
  FROM public.users
  WHERE referred_by = referrer_nickname
     OR (referrer_code IS NOT NULL AND referred_by = referrer_code);

  -- d) Milestone bonuses, idempotent via invite_milestone_claims.
  FOR i IN 1 .. array_length(milestones, 1) LOOP
    IF new_invite_cnt >= milestones[i] THEN
      BEGIN
        INSERT INTO public.invite_milestone_claims (user_id, milestone, gc_reward)
        VALUES (referrer_id, milestones[i], bonuses[i]);

        UPDATE public.users
        SET gc_balance = gc_balance + bonuses[i],
            gc_total   = gc_total   + bonuses[i]
        WHERE id = referrer_id;
      EXCEPTION WHEN unique_violation THEN
        -- Already claimed this milestone; skip.
        NULL;
      END;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Drop the obsolete invite_count index from migration 005 if it ever landed.
DROP INDEX IF EXISTS public.idx_users_invite_count;

NOTIFY pgrst, 'reload schema';
