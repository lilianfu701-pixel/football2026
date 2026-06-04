-- ── 044: World Cup 2026 Players table ─────────────────────────────────────
-- Stores squad data for all qualified teams.
-- Seeded from src/data/players.ts via /api/admin/players/import.

CREATE TABLE IF NOT EXISTS public.players (
  id               SERIAL PRIMARY KEY,
  static_id        INTEGER UNIQUE,            -- ID from src/data/players.ts
  fd_id            INTEGER UNIQUE,            -- football-data.org player ID (if known)
  name             TEXT NOT NULL,             -- English name
  name_zh          TEXT,                      -- Chinese transliteration
  team             TEXT NOT NULL,             -- English team (matches matches.home_team / away_team)
  country_code     TEXT,                      -- ISO 3166-1 alpha-2 lowercase (for flagcdn)
  position         TEXT,                      -- GK | DF | MF | FW
  shirt_number     INTEGER,
  club             TEXT,                      -- Current club
  age              INTEGER,                   -- Age at WC 2026 (June 11, 2026)
  date_of_birth    DATE,
  height_cm        INTEGER,
  market_value     TEXT,                      -- e.g. "€75M" – manual entry
  photo_url        TEXT,
  bio_en           TEXT,
  bio_zh           TEXT,
  golden_boot      BOOLEAN DEFAULT false,
  golden_ball      BOOLEAN DEFAULT false,
  golden_glove     BOOLEAN DEFAULT false,
  best_young       BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Fast lookups by team
CREATE INDEX IF NOT EXISTS players_team_idx     ON public.players (team);
CREATE INDEX IF NOT EXISTS players_position_idx ON public.players (position);

-- RLS
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Anyone can read players
CREATE POLICY "players_public_read" ON public.players
  FOR SELECT TO anon, authenticated USING (true);

-- Service role (used by admin API routes) bypasses RLS automatically.
-- No extra INSERT/UPDATE/DELETE policies needed.

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_players_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION update_players_updated_at();
