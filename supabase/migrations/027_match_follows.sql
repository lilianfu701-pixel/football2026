-- Match follows: users can follow a match to get notifications
CREATE TABLE IF NOT EXISTS match_follows (
  user_id   UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id  INTEGER NOT NULL REFERENCES matches(id)    ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, match_id)
);

ALTER TABLE match_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own match follows"
  ON match_follows FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
