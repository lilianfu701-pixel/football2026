-- 023: Add profile completion fields + rewards tracking
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio             TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS favorite_team   TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS slogan          TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender          TEXT CHECK (gender IN ('male','female','other'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birthday        DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS social_x        TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS social_telegram TEXT;
-- Tracks which fields have already been rewarded: {"avatar":true,"country":true,...}
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_rewards JSONB NOT NULL DEFAULT '{}';
