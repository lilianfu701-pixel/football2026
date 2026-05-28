-- Migration 040: Update referral reward to 500K GC per side, share reward kept at 100K
CREATE OR REPLACE FUNCTION public.process_referral(
  new_user_id   UUID,
  referrer_name TEXT
)
RETURNS VOID AS $$
DECLARE
  referrer_id     UUID;
  referrer_bal    BIGINT;
  new_bal         BIGINT;
  new_invite_cnt  INTEGER;
  reward_per_side BIGINT := 500000;   -- 50万 GC each
  milestones      INTEGER[] := ARRAY[3, 10, 25, 50];
  bonuses         BIGINT[]  := ARRAY[50000, 200000, 500000, 1000000];
  i               INTEGER;
  already_claimed BOOLEAN;
BEGIN
  SELECT id, gc_balance INTO referrer_id, referrer_bal
  FROM public.users
  WHERE username = referrer_name
  LIMIT 1;

  IF referrer_id IS NULL THEN RETURN; END IF;
  IF referrer_id = new_user_id THEN RETURN; END IF;

  -- a) Mark new user as referred + award them
  UPDATE public.users
  SET referred_by = referrer_name,
      gc_balance  = gc_balance + reward_per_side,
      gc_total    = gc_total   + reward_per_side,
      invite_gc   = invite_gc  + reward_per_side
  WHERE id = new_user_id;

  -- b) Reward referrer + increment invite_count
  UPDATE public.users
  SET gc_balance   = gc_balance   + reward_per_side,
      gc_total     = gc_total     + reward_per_side,
      invite_count = invite_count + 1,
      invite_gc    = invite_gc   + reward_per_side
  WHERE id = referrer_id
  RETURNING invite_count INTO new_invite_cnt;

  -- c) Milestone bonuses
  FOR i IN 1..array_length(milestones, 1) LOOP
    IF new_invite_cnt >= milestones[i] THEN
      SELECT EXISTS(
        SELECT 1 FROM public.invite_milestone_claims
        WHERE user_id = referrer_id AND milestone = milestones[i]
      ) INTO already_claimed;

      IF NOT already_claimed THEN
        UPDATE public.users
        SET gc_balance = gc_balance + bonuses[i],
            gc_total   = gc_total   + bonuses[i],
            invite_gc  = invite_gc  + bonuses[i]
        WHERE id = referrer_id;

        INSERT INTO public.invite_milestone_claims (user_id, milestone, gc_reward)
        VALUES (referrer_id, milestones[i], bonuses[i]);
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
