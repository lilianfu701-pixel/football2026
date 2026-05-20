-- 2026 World Cup Groups & Matches seed data
-- Today is ~May 19, 2026 — World Cup starts June 11, 2026

-- First, ensure matches table has all needed columns
-- Check existing columns first, add any missing ones

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS stage text DEFAULT 'group',
  ADD COLUMN IF NOT EXISTS venue text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS home_score integer,
  ADD COLUMN IF NOT EXISTS away_score integer;

-- Fix column types to support emoji flags and multi-char group names
ALTER TABLE public.matches
  ALTER COLUMN home_flag TYPE text,
  ALTER COLUMN away_flag TYPE text,
  ALTER COLUMN group_name TYPE text,
  ALTER COLUMN status TYPE text;

-- Group A (Mexico City + LA)
INSERT INTO public.matches (home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('Mexico', 'Poland', '2026-06-11 20:00:00+00', 'A', 'group', 'Estadio Azteca', 'Mexico City', '🇲🇽', '🇵🇱', 'upcoming'),
('Saudi Arabia', 'Argentina', '2026-06-12 20:00:00+00', 'A', 'group', 'SoFi Stadium', 'Los Angeles', '🇸🇦', '🇦🇷', 'upcoming'),
('Poland', 'Saudi Arabia', '2026-06-17 17:00:00+00', 'A', 'group', 'MetLife Stadium', 'New York', '🇵🇱', '🇸🇦', 'upcoming'),
('Argentina', 'Mexico', '2026-06-17 20:00:00+00', 'A', 'group', 'AT&T Stadium', 'Dallas', '🇦🇷', '🇲🇽', 'upcoming'),
('Poland', 'Argentina', '2026-06-22 20:00:00+00', 'A', 'group', 'Rose Bowl', 'Los Angeles', '🇵🇱', '🇦🇷', 'upcoming'),
('Saudi Arabia', 'Mexico', '2026-06-22 20:00:00+00', 'A', 'group', 'Levi''s Stadium', 'San Francisco', '🇸🇦', '🇲🇽', 'upcoming');

-- Group B (Toronto + LA)
INSERT INTO public.matches (home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('USA', 'Wales', '2026-06-13 18:00:00+00', 'B', 'group', 'MetLife Stadium', 'New York', '🇺🇸', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'upcoming'),
('England', 'Iran', '2026-06-13 21:00:00+00', 'B', 'group', 'AT&T Stadium', 'Dallas', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇮🇷', 'upcoming'),
('Wales', 'Iran', '2026-06-18 14:00:00+00', 'B', 'group', 'BMO Field', 'Toronto', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', '🇮🇷', 'upcoming'),
('England', 'USA', '2026-06-18 20:00:00+00', 'B', 'group', 'Rose Bowl', 'Los Angeles', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇺🇸', 'upcoming'),
('Iran', 'USA', '2026-06-23 20:00:00+00', 'B', 'group', 'Levi''s Stadium', 'San Francisco', '🇮🇷', '🇺🇸', 'upcoming'),
('Wales', 'England', '2026-06-23 20:00:00+00', 'B', 'group', 'BMO Field', 'Toronto', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'upcoming');

-- Group C
INSERT INTO public.matches (home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('France', 'Australia', '2026-06-14 17:00:00+00', 'C', 'group', 'Hard Rock Stadium', 'Miami', '🇫🇷', '🇦🇺', 'upcoming'),
('Denmark', 'Tunisia', '2026-06-14 20:00:00+00', 'C', 'group', 'Arrowhead Stadium', 'Kansas City', '🇩🇰', '🇹🇳', 'upcoming'),
('Australia', 'Denmark', '2026-06-19 17:00:00+00', 'C', 'group', 'Gillette Stadium', 'Boston', '🇦🇺', '🇩🇰', 'upcoming'),
('Tunisia', 'France', '2026-06-19 20:00:00+00', 'C', 'group', 'Lincoln Financial', 'Philadelphia', '🇹🇳', '🇫🇷', 'upcoming'),
('Australia', 'Tunisia', '2026-06-24 20:00:00+00', 'C', 'group', 'AT&T Stadium', 'Dallas', '🇦🇺', '🇹🇳', 'upcoming'),
('Denmark', 'France', '2026-06-24 20:00:00+00', 'C', 'group', 'Hard Rock Stadium', 'Miami', '🇩🇰', '🇫🇷', 'upcoming');

-- Group D
INSERT INTO public.matches (home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('Brazil', 'Serbia', '2026-06-14 23:00:00+00', 'D', 'group', 'SoFi Stadium', 'Los Angeles', '🇧🇷', '🇷🇸', 'upcoming'),
('Switzerland', 'Cameroon', '2026-06-15 17:00:00+00', 'D', 'group', 'MetLife Stadium', 'New York', '🇨🇭', '🇨🇲', 'upcoming'),
('Serbia', 'Switzerland', '2026-06-20 14:00:00+00', 'D', 'group', 'AT&T Stadium', 'Dallas', '🇷🇸', '🇨🇭', 'upcoming'),
('Cameroon', 'Brazil', '2026-06-20 20:00:00+00', 'D', 'group', 'Rose Bowl', 'Los Angeles', '🇨🇲', '🇧🇷', 'upcoming'),
('Serbia', 'Cameroon', '2026-06-25 20:00:00+00', 'D', 'group', 'Levi''s Stadium', 'San Francisco', '🇷🇸', '🇨🇲', 'upcoming'),
('Brazil', 'Switzerland', '2026-06-25 20:00:00+00', 'D', 'group', 'Arrowhead Stadium', 'Kansas City', '🇧🇷', '🇨🇭', 'upcoming');

-- Group E
INSERT INTO public.matches (home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('Spain', 'Costa Rica', '2026-06-15 20:00:00+00', 'E', 'group', 'Estadio Azteca', 'Mexico City', '🇪🇸', '🇨🇷', 'upcoming'),
('Germany', 'Japan', '2026-06-15 23:00:00+00', 'E', 'group', 'Hard Rock Stadium', 'Miami', '🇩🇪', '🇯🇵', 'upcoming'),
('Japan', 'Costa Rica', '2026-06-20 17:00:00+00', 'E', 'group', 'Estadio Azteca', 'Mexico City', '🇯🇵', '🇨🇷', 'upcoming'),
('Spain', 'Germany', '2026-06-21 20:00:00+00', 'E', 'group', 'MetLife Stadium', 'New York', '🇪🇸', '🇩🇪', 'upcoming'),
('Japan', 'Spain', '2026-06-26 20:00:00+00', 'E', 'group', 'AT&T Stadium', 'Dallas', '🇯🇵', '🇪🇸', 'upcoming'),
('Costa Rica', 'Germany', '2026-06-26 20:00:00+00', 'E', 'group', 'SoFi Stadium', 'Los Angeles', '🇨🇷', '🇩🇪', 'upcoming');

-- Group F
INSERT INTO public.matches (home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('Belgium', 'Canada', '2026-06-16 17:00:00+00', 'F', 'group', 'BMO Field', 'Toronto', '🇧🇪', '🇨🇦', 'upcoming'),
('Morocco', 'Croatia', '2026-06-16 20:00:00+00', 'F', 'group', 'Gillette Stadium', 'Boston', '🇲🇦', '🇭🇷', 'upcoming'),
('Belgium', 'Morocco', '2026-06-21 17:00:00+00', 'F', 'group', 'Lincoln Financial', 'Philadelphia', '🇧🇪', '🇲🇦', 'upcoming'),
('Croatia', 'Canada', '2026-06-21 20:00:00+00', 'F', 'group', 'Arrowhead Stadium', 'Kansas City', '🇭🇷', '🇨🇦', 'upcoming'),
('Croatia', 'Belgium', '2026-06-27 20:00:00+00', 'F', 'group', 'Hard Rock Stadium', 'Miami', '🇭🇷', '🇧🇪', 'upcoming'),
('Canada', 'Morocco', '2026-06-27 20:00:00+00', 'F', 'group', 'Rose Bowl', 'Los Angeles', '🇨🇦', '🇲🇦', 'upcoming');

-- Group G
INSERT INTO public.matches (home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('Portugal', 'Ghana', '2026-06-16 23:00:00+00', 'G', 'group', 'SoFi Stadium', 'Los Angeles', '🇵🇹', '🇬🇭', 'upcoming'),
('Uruguay', 'South Korea', '2026-06-17 14:00:00+00', 'G', 'group', 'MetLife Stadium', 'New York', '🇺🇾', '🇰🇷', 'upcoming'),
('Ghana', 'Uruguay', '2026-06-22 14:00:00+00', 'G', 'group', 'AT&T Stadium', 'Dallas', '🇬🇭', '🇺🇾', 'upcoming'),
('South Korea', 'Portugal', '2026-06-22 17:00:00+00', 'G', 'group', 'Hard Rock Stadium', 'Miami', '🇰🇷', '🇵🇹', 'upcoming'),
('South Korea', 'Ghana', '2026-06-27 16:00:00+00', 'G', 'group', 'Rose Bowl', 'Los Angeles', '🇰🇷', '🇬🇭', 'upcoming'),
('Uruguay', 'Portugal', '2026-06-27 16:00:00+00', 'G', 'group', 'Gillette Stadium', 'Boston', '🇺🇾', '🇵🇹', 'upcoming');

-- Group H
INSERT INTO public.matches (home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('Netherlands', 'Senegal', '2026-06-17 23:00:00+00', 'H', 'group', 'Lincoln Financial', 'Philadelphia', '🇳🇱', '🇸🇳', 'upcoming'),
('Ecuador', 'Qatar', '2026-06-18 17:00:00+00', 'H', 'group', 'Arrowhead Stadium', 'Kansas City', '🇪🇨', '🇶🇦', 'upcoming'),
('Senegal', 'Ecuador', '2026-06-23 14:00:00+00', 'H', 'group', 'BMO Field', 'Toronto', '🇸🇳', '🇪🇨', 'upcoming'),
('Qatar', 'Netherlands', '2026-06-23 17:00:00+00', 'H', 'group', 'Estadio Azteca', 'Mexico City', '🇶🇦', '🇳🇱', 'upcoming'),
('Qatar', 'Senegal', '2026-06-28 16:00:00+00', 'H', 'group', 'AT&T Stadium', 'Dallas', '🇶🇦', '🇸🇳', 'upcoming'),
('Ecuador', 'Netherlands', '2026-06-28 16:00:00+00', 'H', 'group', 'MetLife Stadium', 'New York', '🇪🇨', '🇳🇱', 'upcoming');

-- Group I
INSERT INTO public.matches (home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('Italy', 'Nigeria', '2026-06-18 23:00:00+00', 'I', 'group', 'SoFi Stadium', 'Los Angeles', '🇮🇹', '🇳🇬', 'upcoming'),
('Colombia', 'Algeria', '2026-06-19 14:00:00+00', 'I', 'group', 'Hard Rock Stadium', 'Miami', '🇨🇴', '🇩🇿', 'upcoming'),
('Nigeria', 'Colombia', '2026-06-24 14:00:00+00', 'I', 'group', 'Rose Bowl', 'Los Angeles', '🇳🇬', '🇨🇴', 'upcoming'),
('Algeria', 'Italy', '2026-06-24 17:00:00+00', 'I', 'group', 'Gillette Stadium', 'Boston', '🇩🇿', '🇮🇹', 'upcoming'),
('Algeria', 'Nigeria', '2026-06-29 16:00:00+00', 'I', 'group', 'Lincoln Financial', 'Philadelphia', '🇩🇿', '🇳🇬', 'upcoming'),
('Colombia', 'Italy', '2026-06-29 16:00:00+00', 'I', 'group', 'Arrowhead Stadium', 'Kansas City', '🇨🇴', '🇮🇹', 'upcoming');

-- Group J
INSERT INTO public.matches (home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('Argentina', 'Saudi Arabia', '2026-06-19 23:00:00+00', 'J', 'group', 'BMO Field', 'Toronto', '🇦🇷', '🇸🇦', 'upcoming'),
('Mexico', 'Poland', '2026-06-20 14:00:00+00', 'J', 'group', 'Estadio Azteca', 'Mexico City', '🇲🇽', '🇵🇱', 'upcoming'),
('Saudi Arabia', 'Mexico', '2026-06-25 14:00:00+00', 'J', 'group', 'MetLife Stadium', 'New York', '🇸🇦', '🇲🇽', 'upcoming'),
('Poland', 'Argentina', '2026-06-25 17:00:00+00', 'J', 'group', 'AT&T Stadium', 'Dallas', '🇵🇱', '🇦🇷', 'upcoming'),
('Poland', 'Saudi Arabia', '2026-06-30 16:00:00+00', 'J', 'group', 'SoFi Stadium', 'Los Angeles', '🇵🇱', '🇸🇦', 'upcoming'),
('Argentina', 'Mexico', '2026-06-30 16:00:00+00', 'J', 'group', 'Hard Rock Stadium', 'Miami', '🇦🇷', '🇲🇽', 'upcoming');

-- Group K
INSERT INTO public.matches (home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('Australia', 'Tunisia', '2026-06-19 17:00:00+00', 'K', 'group', 'Rose Bowl', 'Los Angeles', '🇦🇺', '🇹🇳', 'upcoming'),
('France', 'Denmark', '2026-06-20 23:00:00+00', 'K', 'group', 'Gillette Stadium', 'Boston', '🇫🇷', '🇩🇰', 'upcoming'),
('Tunisia', 'France', '2026-06-25 23:00:00+00', 'K', 'group', 'Lincoln Financial', 'Philadelphia', '🇹🇳', '🇫🇷', 'upcoming'),
('Denmark', 'Australia', '2026-06-26 14:00:00+00', 'K', 'group', 'Arrowhead Stadium', 'Kansas City', '🇩🇰', '🇦🇺', 'upcoming'),
('Denmark', 'Tunisia', '2026-07-01 16:00:00+00', 'K', 'group', 'BMO Field', 'Toronto', '🇩🇰', '🇹🇳', 'upcoming'),
('France', 'Australia', '2026-07-01 16:00:00+00', 'K', 'group', 'Estadio Azteca', 'Mexico City', '🇫🇷', '🇦🇺', 'upcoming');

-- Group L
INSERT INTO public.matches (home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('Brazil', 'Switzerland', '2026-06-20 17:00:00+00', 'L', 'group', 'MetLife Stadium', 'New York', '🇧🇷', '🇨🇭', 'upcoming'),
('Serbia', 'Cameroon', '2026-06-21 14:00:00+00', 'L', 'group', 'AT&T Stadium', 'Dallas', '🇷🇸', '🇨🇲', 'upcoming'),
('Switzerland', 'Serbia', '2026-06-26 17:00:00+00', 'L', 'group', 'SoFi Stadium', 'Los Angeles', '🇨🇭', '🇷🇸', 'upcoming'),
('Cameroon', 'Brazil', '2026-06-26 23:00:00+00', 'L', 'group', 'Hard Rock Stadium', 'Miami', '🇨🇲', '🇧🇷', 'upcoming'),
('Cameroon', 'Switzerland', '2026-07-01 20:00:00+00', 'L', 'group', 'Rose Bowl', 'Los Angeles', '🇨🇲', '🇨🇭', 'upcoming'),
('Brazil', 'Serbia', '2026-07-01 20:00:00+00', 'L', 'group', 'Gillette Stadium', 'Boston', '🇧🇷', '🇷🇸', 'upcoming');
