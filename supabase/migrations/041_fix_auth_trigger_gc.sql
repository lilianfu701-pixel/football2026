-- Migration 041: Fix handle_new_user and grant_welcome_gc to use 10万 GC (100000)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $f$
DECLARE
  base_username  TEXT;
  final_username TEXT;
  suffix         INT := 0;
BEGIN
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'preferred_username',
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1)
  );
  base_username := REGEXP_REPLACE(base_username, '[^a-zA-Z0-9_]', '', 'g');
  IF LENGTH(base_username) < 3 THEN base_username := 'user'; END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = final_username) LOOP
    suffix := suffix + 1;
    final_username := base_username || suffix::TEXT;
  END LOOP;
  INSERT INTO public.users (
    id, email, username, avatar_url, country_code,
    gc_balance, honor_points, wealth_level, honor_level, created_at
  ) VALUES (
    NEW.id, NEW.email, final_username,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    COALESCE(NEW.raw_user_meta_data->>'country_code', 'UN'),
    100000,  -- 10万 GC welcome gift
    0, 'Common', 'Rookie', NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$f$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.grant_welcome_gc(user_id UUID)
RETURNS VOID AS $f$
BEGIN
  INSERT INTO public.transactions (user_id, type, amount, balance_after, description)
  SELECT user_id, 'welcome_bonus', 100000, gc_balance, 'Welcome bonus 10万 GC gift'
  FROM public.users WHERE id = user_id
  ON CONFLICT DO NOTHING;
END;
$f$ LANGUAGE plpgsql SECURITY DEFINER;
