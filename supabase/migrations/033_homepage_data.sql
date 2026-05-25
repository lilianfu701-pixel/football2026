-- ── 033: Homepage data tables ─────────────────────────────────────────────────

-- ── 1. Top Scorers (射手榜) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.top_scorers (
  id            SERIAL PRIMARY KEY,
  player_name   TEXT        NOT NULL,
  player_name_zh TEXT,
  team          TEXT        NOT NULL,          -- English team name (matches flag mapping)
  photo_url     TEXT,                          -- CDN URL for player headshot
  goals         INTEGER     NOT NULL DEFAULT 0,
  assists       INTEGER     NOT NULL DEFAULT 0,
  matches_played INTEGER    NOT NULL DEFAULT 0,
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  is_visible    BOOLEAN     NOT NULL DEFAULT TRUE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.top_scorers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scorers_public_read" ON public.top_scorers FOR SELECT USING (is_visible = TRUE);

-- ── 2. Featured Matches (焦点对决) ───────────────────────────────────────────
-- Admin fills match_ids to highlight on homepage (up to 4 active at a time)
CREATE TABLE IF NOT EXISTS public.featured_matches (
  id          SERIAL   PRIMARY KEY,
  match_id    INTEGER  NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sort_order  INTEGER  NOT NULL DEFAULT 0,
  is_active   BOOLEAN  NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS featured_matches_match_id_idx ON public.featured_matches(match_id);

ALTER TABLE public.featured_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "featured_public_read" ON public.featured_matches FOR SELECT USING (TRUE);

-- ── 3. Homepage config (homepage_config) ──────────────────────────────────
-- Key-value store for homepage settings (e.g., phase override, video URL)
CREATE TABLE IF NOT EXISTS public.homepage_config (
  key   TEXT PRIMARY KEY,
  value TEXT
);

ALTER TABLE public.homepage_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_public_read" ON public.homepage_config FOR SELECT USING (TRUE);

-- Seed default config
INSERT INTO public.homepage_config (key, value) VALUES
  ('phase_override', ''),          -- '' = auto, 'pre' | 'during' | 'post'
  ('celebration_video_url', ''),   -- YouTube embed URL for 赛后 phase
  ('show_featured', 'true')
ON CONFLICT (key) DO NOTHING;
