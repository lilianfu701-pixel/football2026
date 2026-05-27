-- Migration 038: Rescale all GC amounts ÷1000
-- Welcome bonus: 100M → 100K
-- Daily checkin base: scales via levels.ts (app-side)

-- Update the new-user trigger: welcome bonus 100,000 GC
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    nickname,
    gc_balance,
    gc_total,
    created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    100000,   -- 10万 GC welcome gift
    100000,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Update the welcome GC grant function (used on first login)
CREATE OR REPLACE FUNCTION public.grant_welcome_gc(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO gc_transactions (user_id, type, amount, note)
  VALUES (user_id, 'welcome_bonus', 100000, '注册欢迎礼包 10万 GC');
END;
$$;
