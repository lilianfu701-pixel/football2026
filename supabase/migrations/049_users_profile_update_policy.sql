-- ─────────────────────────────────────────────────────────────────────────────
-- 049: Add welcome_email_sent column + users UPDATE policy
--
-- Problems fixed:
--   1. welcome_email_sent column was missing — auth callback tried to SELECT/UPDATE
--      it, PostgREST returned an error, so the column was never written and welcome
--      emails could fire on every login.
--   2. No UPDATE policy existed on public.users — even though RLS is enabled (the
--      users_select_all SELECT policy proves it), there was no FOR UPDATE policy,
--      so ALL client-side profile saves (country_code, nickname, bio, etc.) were
--      silently rejected by RLS. The Supabase client returns no error on 0-row
--      updates, so the settings page showed "✓ Saved" even though nothing changed.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add welcome_email_sent column (idempotent)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Allow each authenticated user to update their own row.
--    GC balance and admin/ban status changes always go through SECURITY DEFINER
--    RPCs (gc_credit_atomic, gc_deduct_atomic) or the service-role admin API,
--    so a broad UPDATE USING policy is acceptable here.
DO $$ BEGIN
  CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
