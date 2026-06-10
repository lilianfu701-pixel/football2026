-- 050: Add precise geolocation columns to match_votes
-- Fans who share location after casting a team vote get their lat/lng stored here.
-- The fan map will use these to render accurate positions instead of country-centroid
-- jitter for those users. Columns are nullable — existing rows keep null.
ALTER TABLE match_votes
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;
