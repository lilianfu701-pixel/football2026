-- ─────────────────────────────────────────────────────────────────────────────
-- 016_ratings_reply_support.sql
-- Allow forum_ratings to target individual replies (not just posts).
-- Also add GC-transfer trigger so every rating atomically updates balances.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add reply_id column
ALTER TABLE public.forum_ratings
  ADD COLUMN IF NOT EXISTS reply_id BIGINT
    REFERENCES public.forum_replies(id) ON DELETE CASCADE;

-- 2. Drop old unique constraint (user_id, post_id) so we can replace it
ALTER TABLE public.forum_ratings
  DROP CONSTRAINT IF EXISTS forum_ratings_user_id_post_id_key;

-- 3. New unique index: one rating per (user, post-or-reply target)
--    COALESCE(reply_id, 0) treats NULL as 0 so NULLs don't bypass uniqueness
DROP INDEX IF EXISTS public.forum_ratings_unique_target;
CREATE UNIQUE INDEX forum_ratings_unique_target
  ON public.forum_ratings (user_id, post_id, COALESCE(reply_id, 0));

-- 4. Recipient column (denormalised for the GC-transfer trigger)
ALTER TABLE public.forum_ratings
  ADD COLUMN IF NOT EXISTS recipient_id UUID
    REFERENCES public.users(id) ON DELETE SET NULL;

-- 5. GC-transfer trigger function
CREATE OR REPLACE FUNCTION public.apply_rating_gc()
RETURNS TRIGGER AS $$
DECLARE
  v_amount    INTEGER := NEW.gc_amount;
  v_rater     UUID    := NEW.user_id;
  v_recipient UUID    := NEW.recipient_id;
  v_fee       INTEGER;
BEGIN
  IF v_recipient IS NULL OR v_rater IS NULL OR v_amount = 0 THEN
    RETURN NEW;
  END IF;

  IF v_amount > 0 THEN
    -- 赏 (reward): rater's GC goes to recipient
    UPDATE public.users SET gc_balance = GREATEST(gc_balance - v_amount, 0) WHERE id = v_rater;
    UPDATE public.users SET gc_balance = gc_balance + v_amount              WHERE id = v_recipient;
  ELSE
    -- 罚 (punish): recipient loses |amount|, rater pays a small fee (half, max 500)
    v_fee := LEAST(ABS(v_amount) / 2, 500);
    UPDATE public.users SET gc_balance = GREATEST(gc_balance - ABS(v_amount), 0) WHERE id = v_recipient;
    UPDATE public.users SET gc_balance = GREATEST(gc_balance - v_fee,          0) WHERE id = v_rater;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach trigger
DROP TRIGGER IF EXISTS trg_apply_rating_gc ON public.forum_ratings;
CREATE TRIGGER trg_apply_rating_gc
  AFTER INSERT ON public.forum_ratings
  FOR EACH ROW EXECUTE FUNCTION public.apply_rating_gc();
