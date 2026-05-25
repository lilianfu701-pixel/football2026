-- ─────────────────────────────────────────────────────────────────────────────
-- 030_fix_award_bets_fk.sql
--
-- Problem: award_bets.user_id references auth.users(id).
--   The `authenticated` role has no SELECT on auth.users, so PostgreSQL
--   cannot verify the FK on INSERT → every bet insert returns "insert_failed".
--   Same root cause as the forum tables fixed in migration 015.
--
-- Fix: drop the auth.users FK, re-add pointing to public.users.
-- Also adds a missing DELETE policy so cancelAwardBet() works.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Drop the old FK constraint (name may vary; handle both possibilities)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema    = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema    = 'public'
      AND tc.table_name      = 'award_bets'
      AND kcu.column_name    = 'user_id'
  ) LOOP
    EXECUTE format('ALTER TABLE public.award_bets DROP CONSTRAINT %I', r.constraint_name);
    RAISE NOTICE 'Dropped FK % on award_bets.user_id', r.constraint_name;
  END LOOP;
END $$;

-- 2. Re-add FK pointing to public.users (authenticated role can read this)
ALTER TABLE public.award_bets
  ADD CONSTRAINT award_bets_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 3. Add missing DELETE policy so cancelAwardBet() can remove records
DO $$ BEGIN
  CREATE POLICY "Users can delete own award bets"
    ON public.award_bets FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
