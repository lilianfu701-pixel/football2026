-- Migration 028: Add ai_predictions JSONB column to matches table
-- Run this in Supabase SQL Editor or via `supabase db push`

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS ai_predictions JSONB;

-- Optional: index for fast JSON queries if needed in future
-- CREATE INDEX IF NOT EXISTS matches_ai_predictions_gin
--   ON matches USING GIN (ai_predictions);

-- Example of what the JSONB looks like when filled by admin:
-- {
--   "chatgpt":  {"home": 2, "away": 1},
--   "claude":   {"home": 1, "away": 1},
--   "gemini":   {"home": 2, "away": 0},
--   "deepseek": {"home": 1, "away": 2},
--   "qwen":     {"home": 2, "away": 1}
-- }
