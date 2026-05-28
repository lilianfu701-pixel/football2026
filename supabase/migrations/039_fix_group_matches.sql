-- Fix group stage matches: replace placeholder data with actual 2026 World Cup draw
-- Draw held December 5, 2025 in Washington D.C.

DELETE FROM public.matches WHERE stage = 'group';

-- Group A: Mexico · South Africa · South Korea · Czechia
INSERT INTO public.matches (match_code, home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('A1', 'Mexico',       'South Africa', '2026-06-11 20:00:00+00', 'A', 'group', 'Estadio Azteca',     'Mexico City',  '🇲🇽', '🇿🇦', 'upcoming'),
('A2', 'South Korea',  'Czechia',      '2026-06-12 00:00:00+00', 'A', 'group', 'SoFi Stadium',       'Los Angeles',  '🇰🇷', '🇨🇿', 'upcoming'),
('A3', 'Mexico',       'South Korea',  '2026-06-16 20:00:00+00', 'A', 'group', 'Estadio Azteca',     'Mexico City',  '🇲🇽', '🇰🇷', 'upcoming'),
('A4', 'South Africa', 'Czechia',      '2026-06-17 00:00:00+00', 'A', 'group', 'AT&T Stadium',       'Dallas',       '🇿🇦', '🇨🇿', 'upcoming'),
('A5', 'Czechia',      'Mexico',       '2026-06-22 20:00:00+00', 'A', 'group', 'Rose Bowl',          'Los Angeles',  '🇨🇿', '🇲🇽', 'upcoming'),
('A6', 'South Africa', 'South Korea',  '2026-06-22 20:00:00+00', 'A', 'group', 'MetLife Stadium',    'New York',     '🇿🇦', '🇰🇷', 'upcoming');

-- Group B: Canada · Bosnia-Herzegovina · Qatar · Switzerland
INSERT INTO public.matches (match_code, home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('B1', 'Canada',             'Bosnia-Herzegovina', '2026-06-12 20:00:00+00', 'B', 'group', 'BMO Field',          'Toronto',      '🇨🇦', '🇧🇦', 'upcoming'),
('B2', 'Qatar',              'Switzerland',        '2026-06-13 00:00:00+00', 'B', 'group', 'Arrowhead Stadium',  'Kansas City',  '🇶🇦', '🇨🇭', 'upcoming'),
('B3', 'Canada',             'Qatar',              '2026-06-17 20:00:00+00', 'B', 'group', 'BMO Field',          'Toronto',      '🇨🇦', '🇶🇦', 'upcoming'),
('B4', 'Bosnia-Herzegovina', 'Switzerland',        '2026-06-18 00:00:00+00', 'B', 'group', 'Gillette Stadium',   'Boston',       '🇧🇦', '🇨🇭', 'upcoming'),
('B5', 'Switzerland',        'Canada',             '2026-06-23 20:00:00+00', 'B', 'group', 'Hard Rock Stadium',  'Miami',        '🇨🇭', '🇨🇦', 'upcoming'),
('B6', 'Bosnia-Herzegovina', 'Qatar',              '2026-06-23 20:00:00+00', 'B', 'group', 'Lincoln Financial',  'Philadelphia', '🇧🇦', '🇶🇦', 'upcoming');

-- Group C: Brazil · Morocco · Haiti · Scotland
INSERT INTO public.matches (match_code, home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('C1', 'Brazil',   'Morocco',  '2026-06-13 20:00:00+00', 'C', 'group', 'SoFi Stadium',       'Los Angeles',  '🇧🇷', '🇲🇦', 'upcoming'),
('C2', 'Haiti',    'Scotland', '2026-06-14 00:00:00+00', 'C', 'group', 'MetLife Stadium',    'New York',     '🇭🇹', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'upcoming'),
('C3', 'Brazil',   'Haiti',    '2026-06-18 20:00:00+00', 'C', 'group', 'AT&T Stadium',       'Dallas',       '🇧🇷', '🇭🇹', 'upcoming'),
('C4', 'Morocco',  'Scotland', '2026-06-19 00:00:00+00', 'C', 'group', 'Rose Bowl',          'Los Angeles',  '🇲🇦', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'upcoming'),
('C5', 'Scotland', 'Brazil',   '2026-06-24 20:00:00+00', 'C', 'group', 'Hard Rock Stadium',  'Miami',        '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '🇧🇷', 'upcoming'),
('C6', 'Morocco',  'Haiti',    '2026-06-24 20:00:00+00', 'C', 'group', 'Arrowhead Stadium',  'Kansas City',  '🇲🇦', '🇭🇹', 'upcoming');

-- Group D: USA · Paraguay · Australia · Turkey
INSERT INTO public.matches (match_code, home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('D1', 'USA',       'Paraguay',   '2026-06-14 20:00:00+00', 'D', 'group', 'MetLife Stadium',    'New York',     '🇺🇸', '🇵🇾', 'upcoming'),
('D2', 'Australia', 'Turkey',     '2026-06-15 00:00:00+00', 'D', 'group', 'Levi''s Stadium',    'San Francisco','🇦🇺', '🇹🇷', 'upcoming'),
('D3', 'USA',       'Australia',  '2026-06-19 20:00:00+00', 'D', 'group', 'AT&T Stadium',       'Dallas',       '🇺🇸', '🇦🇺', 'upcoming'),
('D4', 'Paraguay',  'Turkey',     '2026-06-20 00:00:00+00', 'D', 'group', 'SoFi Stadium',       'Los Angeles',  '🇵🇾', '🇹🇷', 'upcoming'),
('D5', 'Turkey',    'USA',        '2026-06-25 20:00:00+00', 'D', 'group', 'Rose Bowl',          'Los Angeles',  '🇹🇷', '🇺🇸', 'upcoming'),
('D6', 'Paraguay',  'Australia',  '2026-06-25 20:00:00+00', 'D', 'group', 'Gillette Stadium',   'Boston',       '🇵🇾', '🇦🇺', 'upcoming');

-- Group E: Germany · Curacao · Ivory Coast · Ecuador
INSERT INTO public.matches (match_code, home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('E1', 'Germany',     'Curacao',     '2026-06-15 20:00:00+00', 'E', 'group', 'Lincoln Financial',  'Philadelphia', '🇩🇪', '🇨🇼', 'upcoming'),
('E2', 'Ivory Coast', 'Ecuador',     '2026-06-16 00:00:00+00', 'E', 'group', 'BMO Field',          'Toronto',      '🇨🇮', '🇪🇨', 'upcoming'),
('E3', 'Germany',     'Ivory Coast', '2026-06-20 20:00:00+00', 'E', 'group', 'MetLife Stadium',    'New York',     '🇩🇪', '🇨🇮', 'upcoming'),
('E4', 'Curacao',     'Ecuador',     '2026-06-21 00:00:00+00', 'E', 'group', 'Arrowhead Stadium',  'Kansas City',  '🇨🇼', '🇪🇨', 'upcoming'),
('E5', 'Ecuador',     'Germany',     '2026-06-26 20:00:00+00', 'E', 'group', 'Hard Rock Stadium',  'Miami',        '🇪🇨', '🇩🇪', 'upcoming'),
('E6', 'Curacao',     'Ivory Coast', '2026-06-26 20:00:00+00', 'E', 'group', 'AT&T Stadium',       'Dallas',       '🇨🇼', '🇨🇮', 'upcoming');

-- Group F: Netherlands · Japan · Sweden · Tunisia
INSERT INTO public.matches (match_code, home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('F1', 'Netherlands', 'Japan',       '2026-06-16 20:00:00+00', 'F', 'group', 'SoFi Stadium',       'Los Angeles',  '🇳🇱', '🇯🇵', 'upcoming'),
('F2', 'Sweden',      'Tunisia',     '2026-06-17 00:00:00+00', 'F', 'group', 'Gillette Stadium',   'Boston',       '🇸🇪', '🇹🇳', 'upcoming'),
('F3', 'Netherlands', 'Sweden',      '2026-06-21 20:00:00+00', 'F', 'group', 'Rose Bowl',          'Los Angeles',  '🇳🇱', '🇸🇪', 'upcoming'),
('F4', 'Japan',       'Tunisia',     '2026-06-22 00:00:00+00', 'F', 'group', 'Lincoln Financial',  'Philadelphia', '🇯🇵', '🇹🇳', 'upcoming'),
('F5', 'Tunisia',     'Netherlands', '2026-06-27 20:00:00+00', 'F', 'group', 'MetLife Stadium',    'New York',     '🇹🇳', '🇳🇱', 'upcoming'),
('F6', 'Japan',       'Sweden',      '2026-06-27 20:00:00+00', 'F', 'group', 'BMO Field',          'Toronto',      '🇯🇵', '🇸🇪', 'upcoming');

-- Group G: Belgium · Egypt · Iran · New Zealand
INSERT INTO public.matches (match_code, home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('G1', 'Belgium',     'Egypt',        '2026-06-17 20:00:00+00', 'G', 'group', 'AT&T Stadium',       'Dallas',       '🇧🇪', '🇪🇬', 'upcoming'),
('G2', 'Iran',        'New Zealand',  '2026-06-18 00:00:00+00', 'G', 'group', 'Hard Rock Stadium',  'Miami',        '🇮🇷', '🇳🇿', 'upcoming'),
('G3', 'Belgium',     'Iran',         '2026-06-22 20:00:00+00', 'G', 'group', 'SoFi Stadium',       'Los Angeles',  '🇧🇪', '🇮🇷', 'upcoming'),
('G4', 'Egypt',       'New Zealand',  '2026-06-23 00:00:00+00', 'G', 'group', 'Arrowhead Stadium',  'Kansas City',  '🇪🇬', '🇳🇿', 'upcoming'),
('G5', 'New Zealand', 'Belgium',      '2026-06-28 20:00:00+00', 'G', 'group', 'Rose Bowl',          'Los Angeles',  '🇳🇿', '🇧🇪', 'upcoming'),
('G6', 'Egypt',       'Iran',         '2026-06-28 20:00:00+00', 'G', 'group', 'Gillette Stadium',   'Boston',       '🇪🇬', '🇮🇷', 'upcoming');

-- Group H: Spain · Cape Verde · Saudi Arabia · Uruguay
INSERT INTO public.matches (match_code, home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('H1', 'Spain',        'Cape Verde',   '2026-06-18 20:00:00+00', 'H', 'group', 'Lincoln Financial',  'Philadelphia', '🇪🇸', '🇨🇻', 'upcoming'),
('H2', 'Saudi Arabia', 'Uruguay',      '2026-06-19 00:00:00+00', 'H', 'group', 'BMO Field',          'Toronto',      '🇸🇦', '🇺🇾', 'upcoming'),
('H3', 'Spain',        'Saudi Arabia', '2026-06-23 20:00:00+00', 'H', 'group', 'MetLife Stadium',    'New York',     '🇪🇸', '🇸🇦', 'upcoming'),
('H4', 'Cape Verde',   'Uruguay',      '2026-06-24 00:00:00+00', 'H', 'group', 'AT&T Stadium',       'Dallas',       '🇨🇻', '🇺🇾', 'upcoming'),
('H5', 'Uruguay',      'Spain',        '2026-06-29 20:00:00+00', 'H', 'group', 'Hard Rock Stadium',  'Miami',        '🇺🇾', '🇪🇸', 'upcoming'),
('H6', 'Cape Verde',   'Saudi Arabia', '2026-06-29 20:00:00+00', 'H', 'group', 'SoFi Stadium',       'Los Angeles',  '🇨🇻', '🇸🇦', 'upcoming');

-- Group I: France · Senegal · Iraq · Norway
INSERT INTO public.matches (match_code, home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('I1', 'France',  'Senegal', '2026-06-19 20:00:00+00', 'I', 'group', 'Rose Bowl',          'Los Angeles',  '🇫🇷', '🇸🇳', 'upcoming'),
('I2', 'Iraq',    'Norway',  '2026-06-20 00:00:00+00', 'I', 'group', 'Gillette Stadium',   'Boston',       '🇮🇶', '🇳🇴', 'upcoming'),
('I3', 'France',  'Iraq',    '2026-06-24 20:00:00+00', 'I', 'group', 'Arrowhead Stadium',  'Kansas City',  '🇫🇷', '🇮🇶', 'upcoming'),
('I4', 'Senegal', 'Norway',  '2026-06-25 00:00:00+00', 'I', 'group', 'Lincoln Financial',  'Philadelphia', '🇸🇳', '🇳🇴', 'upcoming'),
('I5', 'Norway',  'France',  '2026-06-30 20:00:00+00', 'I', 'group', 'BMO Field',          'Toronto',      '🇳🇴', '🇫🇷', 'upcoming'),
('I6', 'Senegal', 'Iraq',    '2026-06-30 20:00:00+00', 'I', 'group', 'MetLife Stadium',    'New York',     '🇸🇳', '🇮🇶', 'upcoming');

-- Group J: Argentina · Algeria · Austria · Jordan
INSERT INTO public.matches (match_code, home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('J1', 'Argentina', 'Algeria', '2026-06-20 20:00:00+00', 'J', 'group', 'AT&T Stadium',       'Dallas',       '🇦🇷', '🇩🇿', 'upcoming'),
('J2', 'Austria',   'Jordan',  '2026-06-21 00:00:00+00', 'J', 'group', 'Hard Rock Stadium',  'Miami',        '🇦🇹', '🇯🇴', 'upcoming'),
('J3', 'Argentina', 'Austria', '2026-06-25 20:00:00+00', 'J', 'group', 'SoFi Stadium',       'Los Angeles',  '🇦🇷', '🇦🇹', 'upcoming'),
('J4', 'Algeria',   'Jordan',  '2026-06-26 00:00:00+00', 'J', 'group', 'Rose Bowl',          'Los Angeles',  '🇩🇿', '🇯🇴', 'upcoming'),
('J5', 'Jordan',    'Argentina','2026-07-01 20:00:00+00', 'J', 'group', 'Gillette Stadium',  'Boston',       '🇯🇴', '🇦🇷', 'upcoming'),
('J6', 'Algeria',   'Austria', '2026-07-01 20:00:00+00', 'J', 'group', 'Arrowhead Stadium',  'Kansas City',  '🇩🇿', '🇦🇹', 'upcoming');

-- Group K: Portugal · DR Congo · Uzbekistan · Colombia
INSERT INTO public.matches (match_code, home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('K1', 'Portugal',   'DR Congo',   '2026-06-21 20:00:00+00', 'K', 'group', 'Lincoln Financial',  'Philadelphia', '🇵🇹', '🇨🇩', 'upcoming'),
('K2', 'Uzbekistan', 'Colombia',   '2026-06-22 00:00:00+00', 'K', 'group', 'BMO Field',          'Toronto',      '🇺🇿', '🇨🇴', 'upcoming'),
('K3', 'Portugal',   'Uzbekistan', '2026-06-26 20:00:00+00', 'K', 'group', 'MetLife Stadium',    'New York',     '🇵🇹', '🇺🇿', 'upcoming'),
('K4', 'DR Congo',   'Colombia',   '2026-06-27 00:00:00+00', 'K', 'group', 'AT&T Stadium',       'Dallas',       '🇨🇩', '🇨🇴', 'upcoming'),
('K5', 'Colombia',   'Portugal',   '2026-07-02 20:00:00+00', 'K', 'group', 'Hard Rock Stadium',  'Miami',        '🇨🇴', '🇵🇹', 'upcoming'),
('K6', 'DR Congo',   'Uzbekistan', '2026-07-02 20:00:00+00', 'K', 'group', 'SoFi Stadium',       'Los Angeles',  '🇨🇩', '🇺🇿', 'upcoming');

-- Group L: England · Croatia · Ghana · Panama
INSERT INTO public.matches (match_code, home_team, away_team, kickoff_time, group_name, stage, venue, city, home_flag, away_flag, status) VALUES
('L1', 'England', 'Croatia', '2026-06-22 20:00:00+00', 'L', 'group', 'Rose Bowl',          'Los Angeles',  '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇭🇷', 'upcoming'),
('L2', 'Ghana',   'Panama',  '2026-06-23 00:00:00+00', 'L', 'group', 'Gillette Stadium',   'Boston',       '🇬🇭', '🇵🇦', 'upcoming'),
('L3', 'England', 'Ghana',   '2026-06-27 20:00:00+00', 'L', 'group', 'Arrowhead Stadium',  'Kansas City',  '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇬🇭', 'upcoming'),
('L4', 'Croatia', 'Panama',  '2026-06-28 00:00:00+00', 'L', 'group', 'Lincoln Financial',  'Philadelphia', '🇭🇷', '🇵🇦', 'upcoming'),
('L5', 'Panama',  'England', '2026-07-03 20:00:00+00', 'L', 'group', 'BMO Field',          'Toronto',      '🇵🇦', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'upcoming'),
('L6', 'Croatia', 'Ghana',   '2026-07-03 20:00:00+00', 'L', 'group', 'MetLife Stadium',    'New York',     '🇭🇷', '🇬🇭', 'upcoming');
