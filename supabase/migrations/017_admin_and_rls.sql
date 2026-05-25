-- ─────────────────────────────────────────────────────────────────────────────
-- 017_admin_and_rls.sql
-- 1. Add is_admin column to public.users
-- 2. Grant zeximail@gmail.com super-admin
-- 3. Add public SELECT policy on users (fixes "用户已注销" — RLS was blocking reads)
-- 4. Add is_deleted soft-delete columns to posts & replies
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. is_admin
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Grant admin to the owner account
UPDATE public.users SET is_admin = TRUE WHERE email = 'zeximail@gmail.com';

-- 3. Allow anyone to read public user profiles (forum author display)
--    Drop any conflicting policy first, then create the permissive one.
DROP POLICY IF EXISTS "users_read_public"  ON public.users;
DROP POLICY IF EXISTS "users_public_read"  ON public.users;
-- Some projects have a "Users can view own profile" SELECT policy — keep it;
-- we just add a broader one that covers all rows.
DO $$ BEGIN
  CREATE POLICY "users_select_all" ON public.users
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Soft-delete on posts
ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- 4b. Soft-delete on replies
ALTER TABLE public.forum_replies
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- 5. RLS policies: only admins / row owners can delete
--    (API enforces admin check, but let's also lock down via RLS)
DROP POLICY IF EXISTS "forum_posts_admin_delete"   ON public.forum_posts;
DROP POLICY IF EXISTS "forum_replies_admin_delete" ON public.forum_replies;

CREATE POLICY "forum_posts_admin_delete" ON public.forum_posts
  FOR UPDATE USING (
    (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE
  );

CREATE POLICY "forum_replies_admin_delete" ON public.forum_replies
  FOR UPDATE USING (
    (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE
    OR auth.uid() = user_id
  );
