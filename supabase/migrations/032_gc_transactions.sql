-- ── GoalCoin Transaction Log ─────────────────────────────────────────────────
-- Tracks every GC credit/debit for audit and duplicate-payment prevention.

CREATE TABLE IF NOT EXISTS public.gc_transactions (
  id                BIGSERIAL    PRIMARY KEY,
  user_id           UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type              TEXT         NOT NULL,   -- 'topup' | 'checkin' | 'bet_win' | 'refund' | …
  amount            BIGINT       NOT NULL,   -- positive = credit, negative = debit
  note              TEXT,
  stripe_session_id TEXT         UNIQUE,     -- prevents double-crediting
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gc_tx_user_idx    ON public.gc_transactions(user_id);
CREATE INDEX IF NOT EXISTS gc_tx_type_idx    ON public.gc_transactions(type);
CREATE INDEX IF NOT EXISTS gc_tx_stripe_idx  ON public.gc_transactions(stripe_session_id);

ALTER TABLE public.gc_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gc_tx_select" ON public.gc_transactions
  FOR SELECT USING (auth.uid() = user_id);
-- INSERT/UPDATE done via service role only (webhooks), so no user-level insert policy.
