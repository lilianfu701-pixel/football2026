-- ─────────────────────────────────────────────────────────────────────────────
-- 015_force_public_user_fk.sql
-- Drop EVERY FK constraint on user_id in forum tables (regardless of name),
-- then re-add clean ones pointing to public.users.
-- This ensures no stale auth.users FK remains for PostgREST to pick.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tc.table_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema   = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema    = 'public'
      AND tc.table_name IN ('forum_posts','forum_replies','forum_ratings','forum_likes','forum_follows')
      AND kcu.column_name    = 'user_id'
  ) LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.table_name, r.constraint_name);
    RAISE NOTICE 'Dropped % on %', r.constraint_name, r.table_name;
  END LOOP;
END $$;

-- Re-add with canonical names pointing to public.users only
ALTER TABLE public.forum_posts
  ADD CONSTRAINT forum_posts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.forum_replies
  ADD CONSTRAINT forum_replies_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.forum_ratings
  ADD CONSTRAINT forum_ratings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.forum_likes
  ADD CONSTRAINT forum_likes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.forum_follows
  ADD CONSTRAINT forum_follows_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
