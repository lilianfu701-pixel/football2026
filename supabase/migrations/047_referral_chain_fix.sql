-- ─────────────────────────────────────────────────────────────────────────────
-- 047_referral_chain_fix.sql  (make the whole referral chain actually work)
--
-- Builds on 046 (which created process_referral + invite_milestone_claims +
-- referral_processed). Three remaining problems are fixed here:
--
--   1. users.referred_by is a UUID column (schema drift) but the app writes a
--      TEXT nickname/referral_code into it → every referred signup errored with
--      "invalid input syntax for type uuid". Converted to TEXT. (Column is empty
--      in production, so the cast is trivial; verified: 0 referred rows.)
--
--   2. handle_new_user (042) read the wrong metadata key for the nickname
--      (name/full_name/preferred_username) but email signups send `username`,
--      so email users got nicknamed after their email prefix. Added `username`
--      to the front of the fallback chain.
--
--   3. process_referral now SETS referred_by on the new user (idempotently) so
--      the OAuth path works: the /auth/callback route calls process_referral
--      with the ?ref= value and the function records the relationship + pays out.
--      Reward is granted from the callback (after email confirmation / OAuth),
--      NOT from the insert trigger — so unconfirmed email signups can't farm GC.
--
-- Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. referred_by → TEXT ────────────────────────────────────────────────────────

-- Drop any FK on users.referred_by (a UUID column likely carried a self-FK to
-- users(id); a FK to UUID blocks the TEXT conversion).
DO $$
DECLARE
  conname_var TEXT;
BEGIN
  SELECT c.conname INTO conname_var
  FROM pg_constraint c
  JOIN pg_attribute a
    ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
  WHERE c.conrelid = 'public.users'::regclass
    AND c.contype  = 'f'
    AND a.attname  = 'referred_by'
  LIMIT 1;

  IF conname_var IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', conname_var);
  END IF;
END $$;

DO $$ BEGIN
  IF (
    SELECT data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name = 'referred_by'
  ) <> 'text' THEN
    ALTER TABLE public.users
      ALTER COLUMN referred_by TYPE TEXT USING referred_by::TEXT;
  END IF;
END $$;

-- 2. process_referral — resolves referrer, records relationship, pays both ──────
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

  -- Mark the new user as referred (OAuth path arrives with referred_by = NULL)
  -- and reward them. COALESCE keeps any value the signup trigger already wrote.
  UPDATE public.users
  SET referred_by = COALESCE(referred_by, referrer_name),
      gc_balance  = gc_balance + reward_per_side,
      gc_total    = gc_total   + reward_per_side
  WHERE id = new_user_id;

  -- Reward the referrer.
  UPDATE public.users
  SET gc_balance = gc_balance + reward_per_side,
      gc_total   = gc_total   + reward_per_side
  WHERE id = referrer_id;

  -- Live invite count from referred_by (the single source of truth).
  SELECT COUNT(*) INTO new_invite_cnt
  FROM public.users
  WHERE referred_by = referrer_nickname
     OR (referrer_code IS NOT NULL AND referred_by = referrer_code);

  -- Milestone bonuses, idempotent via invite_milestone_claims.
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
        NULL;  -- already claimed
      END;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. handle_new_user — fix nickname source (read `username` first) ──────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_nickname TEXT;
  final_nickname TEXT;
  final_referral_code TEXT;
  suffix INT := 0;
BEGIN
  base_nickname := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'username'), ''),          -- email signup
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'name'), ''),             -- OAuth
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'preferred_username'), ''),
    NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), ''),
    'user' || LEFT(REPLACE(NEW.id::TEXT, '-', ''), 8)
  );
  base_nickname := LEFT(base_nickname, 20);
  final_nickname := base_nickname;

  WHILE EXISTS (SELECT 1 FROM public.users WHERE nickname = final_nickname) LOOP
    suffix := suffix + 1;
    final_nickname := LEFT(base_nickname, 17) || suffix::TEXT;
  END LOOP;

  LOOP
    final_referral_code := UPPER(
      LEFT(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT || NEW.id::TEXT), 6)
    );
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.users WHERE referral_code = final_referral_code
    );
  END LOOP;

  INSERT INTO public.users (
    id,
    email,
    nickname,
    avatar_url,
    country_code,
    gc_balance,
    gc_total,
    honor_points,
    wealth_level,
    honor_level,
    referral_code,
    created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    final_nickname,
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'country_code', ''), 'UN'),
    100000,
    100000,
    0,
    1,
    1,
    final_referral_code,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Referral rewards are granted later by /auth/callback (after email
  -- confirmation / OAuth) via process_referral — NOT here, so unconfirmed
  -- email signups cannot farm GC.

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

NOTIFY pgrst, 'reload schema';
