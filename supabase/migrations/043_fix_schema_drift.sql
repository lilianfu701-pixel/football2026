-- ─────────────────────────────────────────────────────────────────────────────
-- 043_fix_schema_drift.sql
--
-- Problem: the live production DB had drifted from the migration history.
--   `CREATE TABLE IF NOT EXISTS` in earlier migrations silently skipped tables
--   that already existed from older partial runs, so newer columns/constraints
--   were never applied. Three production 500s traced to this:
--
--   1. /api/notifications        → "column notifications.gc_amount does not exist"
--        Live table was the old shape (id, user_id, type, content, is_read,
--        created_at); migration 021's columns gc_amount/reason/actor_id/
--        post_id/reply_id were never added.
--
--   2. /api/match-vote (upsert)  → onConflict "match_id,user_id" has no matching
--        unique constraint. Live match_votes only had the match_id FK; the
--        UNIQUE (match_id, user_id) from migration 025 was missing.
--
--   3. /api/match-votes-by-country (fan map) → users!inner(country_code) embed
--        failed because the FK match_votes.user_id → users(id) was missing, so
--        PostgREST could not detect the relationship.
--
-- Fix: additively reconcile the live schema with the intended migration state.
--   Idempotent and safe to re-run; only removes invalid data (orphans / dupes).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. notifications — add the columns the in-site notification system expects
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS gc_amount INTEGER;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS reason    TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS actor_id  UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS post_id   BIGINT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS reply_id  BIGINT;

-- 2. match_votes — clean invalid data, then add the missing constraints

-- 2a. Drop orphan rows (user_id not present in public.users), else the FK fails
DELETE FROM public.match_votes
WHERE user_id NOT IN (SELECT id FROM public.users);

-- 2b. Drop duplicate votes (keep newest per match+user), else UNIQUE fails
DELETE FROM public.match_votes a
USING public.match_votes b
WHERE a.match_id = b.match_id
  AND a.user_id  = b.user_id
  AND a.id < b.id;

-- 2c. UNIQUE (match_id, user_id) — required by the vote upsert onConflict
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.match_votes'::regclass
      AND conname  = 'match_votes_match_id_user_id_key'
  ) THEN
    ALTER TABLE public.match_votes
      ADD CONSTRAINT match_votes_match_id_user_id_key UNIQUE (match_id, user_id);
  END IF;
END $$;

-- 2d. FK user_id → public.users(id) — required by the fan-map users!inner embed
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.match_votes'::regclass
      AND conname  = 'match_votes_user_id_fkey'
  ) THEN
    ALTER TABLE public.match_votes
      ADD CONSTRAINT match_votes_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Force PostgREST to reload its schema cache so the new FK relationship is
--    immediately usable for embedding (users!inner). Without this the fan map
--    can keep failing until the cache refreshes on its own.
NOTIFY pgrst, 'reload schema';
