-- Migration 048: usdt_payments table for NOWPayments automatic detection
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS usdt_payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id   TEXT UNIQUE NOT NULL,          -- NOWPayments payment_id
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id   TEXT NOT NULL,
  gc_amount    BIGINT NOT NULL,               -- GC to credit on completion
  price_usdt   NUMERIC(10,2) NOT NULL,        -- package price (USD)
  pay_amount   NUMERIC(12,6),                 -- exact amount to send (set by NOWPayments)
  pay_address  TEXT,                          -- unique per-order TRC-20 address
  status       TEXT NOT NULL DEFAULT 'pending', -- pending | completed | expired
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- RLS: users can only read their own payments
ALTER TABLE usdt_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own usdt_payments"
  ON usdt_payments FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update (webhook + API routes use service client)
CREATE INDEX IF NOT EXISTS idx_usdt_payments_payment_id ON usdt_payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_usdt_payments_user_id    ON usdt_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_usdt_payments_status     ON usdt_payments(status);

NOTIFY pgrst, 'reload schema';
