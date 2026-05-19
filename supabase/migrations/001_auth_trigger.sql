-- Auto-create user profile when someone signs up (including OAuth)
-- This function runs after a new user is created in auth.users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_username TEXT;
  final_username TEXT;
  counter INT := 0;
BEGIN
  -- Extract username from metadata or email
  raw_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Sanitize: keep only letters, numbers, underscores; max 20 chars
  raw_username := regexp_replace(raw_username, '[^a-zA-Z0-9_]', '', 'g');
  raw_username := left(raw_username, 20);
  IF length(raw_username) < 3 THEN
    raw_username := 'user' || left(replace(NEW.id::text, '-', ''), 8);
  END IF;

  final_username := raw_username;

  -- Ensure username is unique
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := left(raw_username, 17) || counter::text;
  END LOOP;

  -- Insert user profile
  INSERT INTO public.users (
    id,
    email,
    username,
    avatar_url,
    country_code,
    gc_balance,
    honor_points,
    wealth_level,
    honor_level,
    created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    final_username,
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    COALESCE(NEW.raw_user_meta_data->>'country_code', 'UN'),
    100000000,  -- 1亿 GC welcome gift
    0,
    'Common',
    'Rookie',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;  -- Don't overwrite if already exists

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also grant daily free GC on first login (via welcome transaction)
CREATE OR REPLACE FUNCTION public.grant_welcome_gc(user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.transactions (
    user_id,
    type,
    amount,
    balance_after,
    description
  )
  SELECT
    user_id,
    'welcome_bonus',
    100000000,
    gc_balance,
    'Welcome bonus - 100M GC gift'
  FROM public.users WHERE id = user_id
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
