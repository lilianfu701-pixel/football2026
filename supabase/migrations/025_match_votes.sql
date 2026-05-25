-- 025: Fan support votes on match threads (home / neutral / away)
CREATE TABLE IF NOT EXISTS public.match_votes (
  id         BIGSERIAL PRIMARY KEY,
  match_id   INTEGER NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id    UUID    NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  vote       TEXT    NOT NULL CHECK (vote IN ('home', 'neutral', 'away')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, user_id)
);

CREATE INDEX IF NOT EXISTS match_votes_match_idx ON public.match_votes(match_id);

ALTER TABLE public.match_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read votes
CREATE POLICY "votes_select" ON public.match_votes FOR SELECT USING (true);
-- Authenticated users can insert/update their own vote
CREATE POLICY "votes_insert" ON public.match_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes_update" ON public.match_votes FOR UPDATE USING (auth.uid() = user_id);
