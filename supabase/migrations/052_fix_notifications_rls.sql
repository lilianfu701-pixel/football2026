-- ─────────────────────────────────────────────────────────────────────────────
-- 052_fix_notifications_rls.sql — Restore lost RLS policies on notifications
--
-- Root cause: migration 021 created the notifications table + RLS policies, but
-- on the live DB the table pre-existed (schema drift, see migration 043), so the
-- CREATE TABLE / CREATE POLICY block was skipped. Result: RLS was ENABLED but had
-- ZERO policies → default deny → no user could ever SELECT their own notifications
-- (the bell always returned an empty list) and user-session INSERTs were blocked.
--
-- Service-role writes (Cron sync-scores) still worked because service_role bypasses
-- RLS. This migration re-adds the three policies idempotently.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications (powers the bell dropdown)
DROP POLICY IF EXISTS "notif_select_own" ON public.notifications;
CREATE POLICY "notif_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
DROP POLICY IF EXISTS "notif_update_own" ON public.notifications;
CREATE POLICY "notif_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Any authenticated user may insert (forum routes validate auth before inserting;
-- Cron uses service_role which bypasses RLS regardless)
DROP POLICY IF EXISTS "notif_insert_auth" ON public.notifications;
CREATE POLICY "notif_insert_auth" ON public.notifications
  FOR INSERT WITH CHECK (true);
