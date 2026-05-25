-- ── 036: Restrict users table — hide email from anon/authenticated ────────────
-- Problem: users_select_all policy (FOR SELECT USING true) exposes ALL columns
-- including email to any logged-in or anonymous user who knows another user's ID.
--
-- Fix: revoke the email column from anon and authenticated roles.
-- Service role retains full access (admin pages must use service client).
-- Authenticated users can still read all public profile fields for
-- forum display, leaderboard, etc.

REVOKE SELECT (email) ON public.users FROM anon;
REVOKE SELECT (email) ON public.users FROM authenticated;

-- Also hide stripe_customer_id if the column exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'users'
      AND column_name  = 'stripe_customer_id'
  ) THEN
    EXECUTE 'REVOKE SELECT (stripe_customer_id) ON public.users FROM anon';
    EXECUTE 'REVOKE SELECT (stripe_customer_id) ON public.users FROM authenticated';
  END IF;
END $$;
