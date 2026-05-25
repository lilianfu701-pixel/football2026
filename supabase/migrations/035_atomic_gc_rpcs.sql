-- ── 035: Atomic GC deduct / credit RPCs ─────────────────────────────────────
-- Fixes concurrent race condition where two simultaneous requests could both
-- read the same gc_balance and both succeed in deducting from it.
-- All GC mutations now go through these two functions.

-- ── Ensure transactions table exists ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id           BIGSERIAL    PRIMARY KEY,
  user_id      UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type         TEXT         NOT NULL,
  amount       BIGINT       NOT NULL,
  balance_after BIGINT,
  description  TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS transactions_user_idx  ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_type_idx  ON public.transactions(type);
CREATE INDEX IF NOT EXISTS transactions_time_idx  ON public.transactions(created_at);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'transactions' AND policyname = 'transactions_select_own'
  ) THEN
    CREATE POLICY "transactions_select_own" ON public.transactions
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── gc_deduct_atomic ──────────────────────────────────────────────────────────
-- Atomically deducts p_amount from the user's gc_balance.
-- Raises an exception if gc_balance < p_amount (insufficient funds).
-- Logs the debit to transactions.
-- Returns the new gc_balance.
CREATE OR REPLACE FUNCTION public.gc_deduct_atomic(
  p_user_id    UUID,
  p_amount     BIGINT,
  p_tx_type    TEXT    DEFAULT 'debit',
  p_desc       TEXT    DEFAULT ''
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance BIGINT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount: p_amount must be positive';
  END IF;

  UPDATE users
  SET gc_balance = gc_balance - p_amount
  WHERE id = p_user_id
    AND gc_balance >= p_amount
  RETURNING gc_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  INSERT INTO transactions(user_id, type, amount, balance_after, description)
  VALUES (p_user_id, p_tx_type, -p_amount, v_new_balance, p_desc);

  RETURN v_new_balance;
END;
$$;

-- ── gc_credit_atomic ──────────────────────────────────────────────────────────
-- Atomically credits p_amount to the user's gc_balance.
-- Logs the credit to transactions.
-- Returns the new gc_balance.
CREATE OR REPLACE FUNCTION public.gc_credit_atomic(
  p_user_id    UUID,
  p_amount     BIGINT,
  p_tx_type    TEXT    DEFAULT 'credit',
  p_desc       TEXT    DEFAULT ''
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance BIGINT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount: p_amount must be positive';
  END IF;

  UPDATE users
  SET gc_balance = gc_balance + p_amount
  WHERE id = p_user_id
  RETURNING gc_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  INSERT INTO transactions(user_id, type, amount, balance_after, description)
  VALUES (p_user_id, p_tx_type, p_amount, v_new_balance, p_desc);

  RETURN v_new_balance;
END;
$$;

-- ── daily_checkin_atomic ──────────────────────────────────────────────────────
-- Atomically inserts check_in row + credits GC + updates gc_total/wealth_level.
-- UNIQUE(user_id, date) on check_ins prevents double-claim at DB level.
-- Returns new gc_balance, or raises 'already_claimed' if duplicate.
CREATE OR REPLACE FUNCTION public.daily_checkin_atomic(
  p_user_id     UUID,
  p_date        DATE,
  p_gc_amount   BIGINT,
  p_streak      INTEGER,
  p_wealth_rank INTEGER
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance BIGINT;
BEGIN
  -- UNIQUE(user_id, date) will raise unique_violation if already claimed
  INSERT INTO check_ins(user_id, date, gc_earned, streak)
  VALUES (p_user_id, p_date, p_gc_amount, p_streak);

  UPDATE users
  SET gc_balance   = gc_balance + p_gc_amount,
      gc_total     = COALESCE(gc_total, gc_balance) + p_gc_amount,
      wealth_level = p_wealth_rank
  WHERE id = p_user_id
  RETURNING gc_balance INTO v_new_balance;

  INSERT INTO transactions(user_id, type, amount, balance_after, description)
  VALUES (
    p_user_id,
    'daily_checkin',
    p_gc_amount,
    v_new_balance,
    format('Daily check-in (Day %s streak)', p_streak)
  );

  RETURN v_new_balance;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'already_claimed';
END;
$$;

-- ── share_reward_atomic ───────────────────────────────────────────────────────
-- Atomically checks daily rate-limit, credits GC, logs transaction.
-- Returns remaining count, or -1 if daily limit already reached.
CREATE OR REPLACE FUNCTION public.share_reward_atomic(
  p_user_id     UUID,
  p_gc_amount   BIGINT,
  p_max_per_day INTEGER,
  p_since       TIMESTAMPTZ,
  p_desc        TEXT DEFAULT ''
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count       INTEGER;
  v_new_balance BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM transactions
  WHERE user_id    = p_user_id
    AND type       = 'share_reward'
    AND created_at >= p_since;

  IF v_count >= p_max_per_day THEN
    RETURN -1;
  END IF;

  UPDATE users
  SET gc_balance = gc_balance + p_gc_amount
  WHERE id = p_user_id
  RETURNING gc_balance INTO v_new_balance;

  INSERT INTO transactions(user_id, type, amount, balance_after, description)
  VALUES (p_user_id, 'share_reward', p_gc_amount, v_new_balance, p_desc);

  RETURN p_max_per_day - v_count - 1;
END;
$$;

-- ── grant_forum_gc_atomic ─────────────────────────────────────────────────────
-- Atomically checks daily cap, credits GC, logs transaction.
-- Returns TRUE if awarded, FALSE if daily cap reached.
CREATE OR REPLACE FUNCTION public.grant_forum_gc_atomic(
  p_user_id   UUID,
  p_tx_type   TEXT,
  p_amount    BIGINT,
  p_daily_max INTEGER,
  p_since     TIMESTAMPTZ,
  p_desc      TEXT DEFAULT ''
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count       INTEGER;
  v_new_balance BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM transactions
  WHERE user_id    = p_user_id
    AND type       = p_tx_type
    AND created_at >= p_since;

  IF v_count >= p_daily_max THEN
    RETURN FALSE;
  END IF;

  UPDATE users
  SET gc_balance = gc_balance + p_amount
  WHERE id = p_user_id
  RETURNING gc_balance INTO v_new_balance;

  INSERT INTO transactions(user_id, type, amount, balance_after, description)
  VALUES (p_user_id, p_tx_type, p_amount, v_new_balance, p_desc);

  RETURN TRUE;
END;
$$;
