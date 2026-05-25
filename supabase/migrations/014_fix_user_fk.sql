-- ─────────────────────────────────────────────────────────────────────────────
-- 014_fix_user_fk.sql
-- PostgREST can only traverse FK relationships within the public schema.
-- forum_posts/replies/ratings.user_id currently reference auth.users(id),
-- which PostgREST cannot join. Re-point them to public.users(id).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── forum_posts ──────────────────────────────────────────────────────────────
ALTER TABLE public.forum_posts
  DROP CONSTRAINT IF EXISTS forum_posts_user_id_fkey;

ALTER TABLE public.forum_posts
  ADD CONSTRAINT forum_posts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- ── forum_replies ─────────────────────────────────────────────────────────────
ALTER TABLE public.forum_replies
  DROP CONSTRAINT IF EXISTS forum_replies_user_id_fkey;

ALTER TABLE public.forum_replies
  ADD CONSTRAINT forum_replies_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ── forum_ratings ─────────────────────────────────────────────────────────────
ALTER TABLE public.forum_ratings
  DROP CONSTRAINT IF EXISTS forum_ratings_user_id_fkey;

ALTER TABLE public.forum_ratings
  ADD CONSTRAINT forum_ratings_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ── forum_likes ───────────────────────────────────────────────────────────────
ALTER TABLE public.forum_likes
  DROP CONSTRAINT IF EXISTS forum_likes_user_id_fkey;

ALTER TABLE public.forum_likes
  ADD CONSTRAINT forum_likes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ── forum_follows ─────────────────────────────────────────────────────────────
ALTER TABLE public.forum_follows
  DROP CONSTRAINT IF EXISTS forum_follows_user_id_fkey;

ALTER TABLE public.forum_follows
  ADD CONSTRAINT forum_follows_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
