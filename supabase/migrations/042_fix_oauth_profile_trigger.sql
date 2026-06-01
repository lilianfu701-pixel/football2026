-- Migration 042: Align OAuth profile creation with the current public.users schema.
-- Existing user rows are not modified.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_nickname TEXT;
  final_nickname TEXT;
  final_referral_code TEXT;
  suffix INT := 0;
BEGIN
  base_nickname := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'preferred_username'), ''),
    NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), ''),
    'user' || LEFT(REPLACE(NEW.id::TEXT, '-', ''), 8)
  );
  base_nickname := LEFT(base_nickname, 20);
  final_nickname := base_nickname;

  WHILE EXISTS (SELECT 1 FROM public.users WHERE nickname = final_nickname) LOOP
    suffix := suffix + 1;
    final_nickname := LEFT(base_nickname, 17) || suffix::TEXT;
  END LOOP;

  LOOP
    final_referral_code := UPPER(
      LEFT(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT || NEW.id::TEXT), 6)
    );
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.users WHERE referral_code = final_referral_code
    );
  END LOOP;

  INSERT INTO public.users (
    id,
    email,
    nickname,
    avatar_url,
    country_code,
    gc_balance,
    gc_total,
    honor_points,
    wealth_level,
    honor_level,
    referral_code,
    created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    final_nickname,
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'country_code', ''), 'UN'),
    100000,
    100000,
    0,
    1,
    1,
    final_referral_code,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
