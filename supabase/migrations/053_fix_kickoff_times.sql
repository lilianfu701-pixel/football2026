-- 053_fix_kickoff_times.sql
-- Fix all 72 group-stage kickoff_time values to official UTC times
-- Source: football-data.org API (/v4/competitions/WC/matches?stage=GROUP_STAGE)
-- Fetched: 2026-06-11
--
-- The prior seed (039_fix_group_matches.sql) used estimated times that were
-- off by anywhere from 1 hour to 6 days.
-- This migration matches each fixture by team pair (both orientations supported)
-- so it works regardless of whether home/away is stored reversed in the DB.

-- ── GROUP A ──────────────────────────────────────────────────────────────────
-- Mexico vs South Africa  (was 20:00, correct 19:00)
UPDATE public.matches SET kickoff_time = '2026-06-11T19:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Mexico'       AND away_team = 'South Africa') OR
  (home_team = 'South Africa' AND away_team = 'Mexico'));

-- South Korea vs Czechia  (was 00:00, correct 02:00)
UPDATE public.matches SET kickoff_time = '2026-06-12T02:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'South Korea' AND away_team = 'Czechia') OR
  (home_team = 'Czechia'     AND away_team = 'South Korea'));

-- Czechia vs South Africa  (was Jun-17 00:00, correct Jun-18 16:00)
UPDATE public.matches SET kickoff_time = '2026-06-18T16:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Czechia'      AND away_team = 'South Africa') OR
  (home_team = 'South Africa' AND away_team = 'Czechia'));

-- Mexico vs South Korea  (was Jun-16 20:00, correct Jun-19 01:00)
UPDATE public.matches SET kickoff_time = '2026-06-19T01:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Mexico'      AND away_team = 'South Korea') OR
  (home_team = 'South Korea' AND away_team = 'Mexico'));

-- Czechia vs Mexico  (was Jun-22 20:00, correct Jun-25 01:00)
UPDATE public.matches SET kickoff_time = '2026-06-25T01:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Czechia' AND away_team = 'Mexico') OR
  (home_team = 'Mexico'  AND away_team = 'Czechia'));

-- South Africa vs South Korea  (was Jun-22 20:00, correct Jun-25 01:00)
UPDATE public.matches SET kickoff_time = '2026-06-25T01:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'South Africa' AND away_team = 'South Korea') OR
  (home_team = 'South Korea'  AND away_team = 'South Africa'));

-- ── GROUP B ──────────────────────────────────────────────────────────────────
-- Canada vs Bosnia & Herzegovina  (was 20:00, correct 19:00)
UPDATE public.matches SET kickoff_time = '2026-06-12T19:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Canada'               AND away_team = 'Bosnia & Herzegovina') OR
  (home_team = 'Bosnia & Herzegovina' AND away_team = 'Canada'));

-- Qatar vs Switzerland  (was Jun-13 00:00, correct Jun-13 19:00)
UPDATE public.matches SET kickoff_time = '2026-06-13T19:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Qatar'        AND away_team = 'Switzerland') OR
  (home_team = 'Switzerland'  AND away_team = 'Qatar'));

-- Switzerland vs Bosnia & Herzegovina  (was Jun-18 00:00, correct Jun-18 19:00)
UPDATE public.matches SET kickoff_time = '2026-06-18T19:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Switzerland'          AND away_team = 'Bosnia & Herzegovina') OR
  (home_team = 'Bosnia & Herzegovina' AND away_team = 'Switzerland'));

-- Canada vs Qatar  (was Jun-17 20:00, correct Jun-18 22:00)
UPDATE public.matches SET kickoff_time = '2026-06-18T22:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Canada' AND away_team = 'Qatar') OR
  (home_team = 'Qatar'  AND away_team = 'Canada'));

-- Switzerland vs Canada  (was Jun-23 20:00, correct Jun-24 19:00)
UPDATE public.matches SET kickoff_time = '2026-06-24T19:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Switzerland' AND away_team = 'Canada') OR
  (home_team = 'Canada'      AND away_team = 'Switzerland'));

-- Bosnia & Herzegovina vs Qatar  (was Jun-23 20:00, correct Jun-24 19:00)
UPDATE public.matches SET kickoff_time = '2026-06-24T19:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Bosnia & Herzegovina' AND away_team = 'Qatar') OR
  (home_team = 'Qatar'                AND away_team = 'Bosnia & Herzegovina'));

-- ── GROUP C ──────────────────────────────────────────────────────────────────
-- Brazil vs Morocco  (was 20:00, correct 22:00)
UPDATE public.matches SET kickoff_time = '2026-06-13T22:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Brazil'  AND away_team = 'Morocco') OR
  (home_team = 'Morocco' AND away_team = 'Brazil'));

-- Haiti vs Scotland  (was Jun-14 00:00, correct Jun-14 01:00)
UPDATE public.matches SET kickoff_time = '2026-06-14T01:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Haiti'    AND away_team = 'Scotland') OR
  (home_team = 'Scotland' AND away_team = 'Haiti'));

-- Scotland vs Morocco  (was Jun-19 00:00, correct Jun-19 22:00)
UPDATE public.matches SET kickoff_time = '2026-06-19T22:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Scotland' AND away_team = 'Morocco') OR
  (home_team = 'Morocco'  AND away_team = 'Scotland'));

-- Brazil vs Haiti  (was Jun-18 20:00, correct Jun-20 00:30)
UPDATE public.matches SET kickoff_time = '2026-06-20T00:30:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Brazil' AND away_team = 'Haiti') OR
  (home_team = 'Haiti'  AND away_team = 'Brazil'));

-- Morocco vs Haiti  (was Jun-24 20:00, correct Jun-24 22:00)
UPDATE public.matches SET kickoff_time = '2026-06-24T22:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Morocco' AND away_team = 'Haiti') OR
  (home_team = 'Haiti'   AND away_team = 'Morocco'));

-- Scotland vs Brazil  (was Jun-24 20:00, correct Jun-24 22:00)
UPDATE public.matches SET kickoff_time = '2026-06-24T22:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Scotland' AND away_team = 'Brazil') OR
  (home_team = 'Brazil'   AND away_team = 'Scotland'));

-- ── GROUP D ──────────────────────────────────────────────────────────────────
-- USA vs Paraguay  (was Jun-14 20:00, correct Jun-13 01:00)
UPDATE public.matches SET kickoff_time = '2026-06-13T01:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'USA'      AND away_team = 'Paraguay') OR
  (home_team = 'Paraguay' AND away_team = 'USA'));

-- Australia vs Turkey  (was Jun-15 00:00, correct Jun-14 04:00)
UPDATE public.matches SET kickoff_time = '2026-06-14T04:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Australia' AND away_team = 'Turkey') OR
  (home_team = 'Turkey'    AND away_team = 'Australia'));

-- USA vs Australia  (was Jun-19 20:00, correct Jun-19 19:00)
UPDATE public.matches SET kickoff_time = '2026-06-19T19:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'USA'       AND away_team = 'Australia') OR
  (home_team = 'Australia' AND away_team = 'USA'));

-- Turkey vs Paraguay  (was Jun-20 00:00, correct Jun-20 03:00)
UPDATE public.matches SET kickoff_time = '2026-06-20T03:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Turkey'   AND away_team = 'Paraguay') OR
  (home_team = 'Paraguay' AND away_team = 'Turkey'));

-- Turkey vs USA  (was Jun-25 20:00, correct Jun-26 02:00)
UPDATE public.matches SET kickoff_time = '2026-06-26T02:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Turkey' AND away_team = 'USA') OR
  (home_team = 'USA'    AND away_team = 'Turkey'));

-- Paraguay vs Australia  (was Jun-25 20:00, correct Jun-26 02:00)
UPDATE public.matches SET kickoff_time = '2026-06-26T02:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Paraguay'  AND away_team = 'Australia') OR
  (home_team = 'Australia' AND away_team = 'Paraguay'));

-- ── GROUP E ──────────────────────────────────────────────────────────────────
-- Germany vs Curacao  (was Jun-15 20:00, correct Jun-14 17:00)
UPDATE public.matches SET kickoff_time = '2026-06-14T17:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Germany' AND away_team = 'Curacao') OR
  (home_team = 'Curacao' AND away_team = 'Germany'));

-- Ivory Coast vs Ecuador  (was Jun-16 00:00, correct Jun-14 23:00)
UPDATE public.matches SET kickoff_time = '2026-06-14T23:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Ivory Coast' AND away_team = 'Ecuador') OR
  (home_team = 'Ecuador'     AND away_team = 'Ivory Coast'));

-- Germany vs Ivory Coast  (was Jun-20 20:00, correct Jun-20 20:00 — ALREADY CORRECT)
UPDATE public.matches SET kickoff_time = '2026-06-20T20:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Germany'     AND away_team = 'Ivory Coast') OR
  (home_team = 'Ivory Coast' AND away_team = 'Germany'));

-- Ecuador vs Curacao  (was Jun-21 00:00, correct Jun-21 00:00 — ALREADY CORRECT)
UPDATE public.matches SET kickoff_time = '2026-06-21T00:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Ecuador' AND away_team = 'Curacao') OR
  (home_team = 'Curacao' AND away_team = 'Ecuador'));

-- Ecuador vs Germany  (was Jun-26 20:00, correct Jun-25 20:00)
UPDATE public.matches SET kickoff_time = '2026-06-25T20:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Ecuador' AND away_team = 'Germany') OR
  (home_team = 'Germany' AND away_team = 'Ecuador'));

-- Curacao vs Ivory Coast  (was Jun-26 20:00, correct Jun-25 20:00)
UPDATE public.matches SET kickoff_time = '2026-06-25T20:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Curacao'     AND away_team = 'Ivory Coast') OR
  (home_team = 'Ivory Coast' AND away_team = 'Curacao'));

-- ── GROUP F ──────────────────────────────────────────────────────────────────
-- Netherlands vs Japan  (was Jun-16 20:00, correct Jun-14 20:00)
UPDATE public.matches SET kickoff_time = '2026-06-14T20:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Netherlands' AND away_team = 'Japan') OR
  (home_team = 'Japan'       AND away_team = 'Netherlands'));

-- Sweden vs Tunisia  (was Jun-17 00:00, correct Jun-15 02:00)
UPDATE public.matches SET kickoff_time = '2026-06-15T02:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Sweden'  AND away_team = 'Tunisia') OR
  (home_team = 'Tunisia' AND away_team = 'Sweden'));

-- Netherlands vs Sweden  (was Jun-21 20:00, correct Jun-20 17:00)
UPDATE public.matches SET kickoff_time = '2026-06-20T17:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Netherlands' AND away_team = 'Sweden') OR
  (home_team = 'Sweden'      AND away_team = 'Netherlands'));

-- Japan vs Tunisia  (was Jun-22 00:00, correct Jun-21 04:00)
UPDATE public.matches SET kickoff_time = '2026-06-21T04:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Japan'   AND away_team = 'Tunisia') OR
  (home_team = 'Tunisia' AND away_team = 'Japan'));

-- Tunisia vs Netherlands  (was Jun-27 20:00, correct Jun-25 23:00)
UPDATE public.matches SET kickoff_time = '2026-06-25T23:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Tunisia'     AND away_team = 'Netherlands') OR
  (home_team = 'Netherlands' AND away_team = 'Tunisia'));

-- Japan vs Sweden  (was Jun-27 20:00, correct Jun-25 23:00)
UPDATE public.matches SET kickoff_time = '2026-06-25T23:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Japan'  AND away_team = 'Sweden') OR
  (home_team = 'Sweden' AND away_team = 'Japan'));

-- ── GROUP G ──────────────────────────────────────────────────────────────────
-- Belgium vs Egypt  (was Jun-17 20:00, correct Jun-15 19:00)
UPDATE public.matches SET kickoff_time = '2026-06-15T19:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Belgium' AND away_team = 'Egypt') OR
  (home_team = 'Egypt'   AND away_team = 'Belgium'));

-- Iran vs New Zealand  (was Jun-18 00:00, correct Jun-16 01:00)
UPDATE public.matches SET kickoff_time = '2026-06-16T01:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Iran'        AND away_team = 'New Zealand') OR
  (home_team = 'New Zealand' AND away_team = 'Iran'));

-- Belgium vs Iran  (was Jun-22 20:00, correct Jun-21 19:00)
UPDATE public.matches SET kickoff_time = '2026-06-21T19:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Belgium' AND away_team = 'Iran') OR
  (home_team = 'Iran'    AND away_team = 'Belgium'));

-- New Zealand vs Egypt  (was Jun-23 00:00, correct Jun-22 01:00)
UPDATE public.matches SET kickoff_time = '2026-06-22T01:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'New Zealand' AND away_team = 'Egypt') OR
  (home_team = 'Egypt'       AND away_team = 'New Zealand'));

-- New Zealand vs Belgium  (was Jun-28 20:00, correct Jun-27 03:00)
UPDATE public.matches SET kickoff_time = '2026-06-27T03:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'New Zealand' AND away_team = 'Belgium') OR
  (home_team = 'Belgium'     AND away_team = 'New Zealand'));

-- Egypt vs Iran  (was Jun-28 20:00, correct Jun-27 03:00)
UPDATE public.matches SET kickoff_time = '2026-06-27T03:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Egypt' AND away_team = 'Iran') OR
  (home_team = 'Iran'  AND away_team = 'Egypt'));

-- ── GROUP H ──────────────────────────────────────────────────────────────────
-- Spain vs Cape Verde  (was Jun-18 20:00, correct Jun-15 16:00)
UPDATE public.matches SET kickoff_time = '2026-06-15T16:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Spain'       AND away_team = 'Cape Verde') OR
  (home_team = 'Cape Verde'  AND away_team = 'Spain'));

-- Saudi Arabia vs Uruguay  (was Jun-19 00:00, correct Jun-15 22:00)
UPDATE public.matches SET kickoff_time = '2026-06-15T22:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Saudi Arabia' AND away_team = 'Uruguay') OR
  (home_team = 'Uruguay'      AND away_team = 'Saudi Arabia'));

-- Spain vs Saudi Arabia  (was Jun-23 20:00, correct Jun-21 16:00)
UPDATE public.matches SET kickoff_time = '2026-06-21T16:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Spain'        AND away_team = 'Saudi Arabia') OR
  (home_team = 'Saudi Arabia' AND away_team = 'Spain'));

-- Uruguay vs Cape Verde  (was Jun-24 00:00, correct Jun-21 22:00)
UPDATE public.matches SET kickoff_time = '2026-06-21T22:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Uruguay'    AND away_team = 'Cape Verde') OR
  (home_team = 'Cape Verde' AND away_team = 'Uruguay'));

-- Uruguay vs Spain  (was Jun-29 20:00, correct Jun-27 00:00)
UPDATE public.matches SET kickoff_time = '2026-06-27T00:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Uruguay' AND away_team = 'Spain') OR
  (home_team = 'Spain'   AND away_team = 'Uruguay'));

-- Cape Verde vs Saudi Arabia  (was Jun-29 20:00, correct Jun-27 00:00)
UPDATE public.matches SET kickoff_time = '2026-06-27T00:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Cape Verde'   AND away_team = 'Saudi Arabia') OR
  (home_team = 'Saudi Arabia' AND away_team = 'Cape Verde'));

-- ── GROUP I ──────────────────────────────────────────────────────────────────
-- France vs Senegal  (was Jun-19 20:00, correct Jun-16 19:00)
UPDATE public.matches SET kickoff_time = '2026-06-16T19:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'France'  AND away_team = 'Senegal') OR
  (home_team = 'Senegal' AND away_team = 'France'));

-- Iraq vs Norway  (was Jun-20 00:00, correct Jun-16 22:00)
UPDATE public.matches SET kickoff_time = '2026-06-16T22:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Iraq'   AND away_team = 'Norway') OR
  (home_team = 'Norway' AND away_team = 'Iraq'));

-- France vs Iraq  (was Jun-24 20:00, correct Jun-22 21:00)
UPDATE public.matches SET kickoff_time = '2026-06-22T21:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'France' AND away_team = 'Iraq') OR
  (home_team = 'Iraq'   AND away_team = 'France'));

-- Norway vs Senegal  (was Jun-25 00:00, correct Jun-23 00:00)
UPDATE public.matches SET kickoff_time = '2026-06-23T00:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Norway'  AND away_team = 'Senegal') OR
  (home_team = 'Senegal' AND away_team = 'Norway'));

-- Norway vs France  (was Jun-30 20:00, correct Jun-26 19:00)
UPDATE public.matches SET kickoff_time = '2026-06-26T19:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Norway' AND away_team = 'France') OR
  (home_team = 'France' AND away_team = 'Norway'));

-- Senegal vs Iraq  (was Jun-30 20:00, correct Jun-26 19:00)
UPDATE public.matches SET kickoff_time = '2026-06-26T19:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Senegal' AND away_team = 'Iraq') OR
  (home_team = 'Iraq'    AND away_team = 'Senegal'));

-- ── GROUP J ──────────────────────────────────────────────────────────────────
-- Argentina vs Algeria  (was Jun-20 20:00, correct Jun-17 01:00)
UPDATE public.matches SET kickoff_time = '2026-06-17T01:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Argentina' AND away_team = 'Algeria') OR
  (home_team = 'Algeria'   AND away_team = 'Argentina'));

-- Austria vs Jordan  (was Jun-21 00:00, correct Jun-17 04:00)
UPDATE public.matches SET kickoff_time = '2026-06-17T04:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Austria' AND away_team = 'Jordan') OR
  (home_team = 'Jordan'  AND away_team = 'Austria'));

-- Argentina vs Austria  (was Jun-25 20:00, correct Jun-22 17:00)
UPDATE public.matches SET kickoff_time = '2026-06-22T17:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Argentina' AND away_team = 'Austria') OR
  (home_team = 'Austria'   AND away_team = 'Argentina'));

-- Jordan vs Algeria  (was Jun-26 00:00, correct Jun-23 03:00)
UPDATE public.matches SET kickoff_time = '2026-06-23T03:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Jordan'  AND away_team = 'Algeria') OR
  (home_team = 'Algeria' AND away_team = 'Jordan'));

-- Jordan vs Argentina  (was Jul-01 20:00, correct Jun-28 02:00)
UPDATE public.matches SET kickoff_time = '2026-06-28T02:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Jordan'    AND away_team = 'Argentina') OR
  (home_team = 'Argentina' AND away_team = 'Jordan'));

-- Algeria vs Austria  (was Jul-01 20:00, correct Jun-28 02:00)
UPDATE public.matches SET kickoff_time = '2026-06-28T02:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Algeria' AND away_team = 'Austria') OR
  (home_team = 'Austria' AND away_team = 'Algeria'));

-- ── GROUP K ──────────────────────────────────────────────────────────────────
-- Portugal vs DR Congo  (was Jun-21 20:00, correct Jun-17 17:00)
UPDATE public.matches SET kickoff_time = '2026-06-17T17:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Portugal' AND away_team = 'DR Congo') OR
  (home_team = 'DR Congo' AND away_team = 'Portugal'));

-- Uzbekistan vs Colombia  (was Jun-22 00:00, correct Jun-18 02:00)
UPDATE public.matches SET kickoff_time = '2026-06-18T02:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Uzbekistan' AND away_team = 'Colombia') OR
  (home_team = 'Colombia'   AND away_team = 'Uzbekistan'));

-- Portugal vs Uzbekistan  (was Jun-26 20:00, correct Jun-23 17:00)
UPDATE public.matches SET kickoff_time = '2026-06-23T17:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Portugal'   AND away_team = 'Uzbekistan') OR
  (home_team = 'Uzbekistan' AND away_team = 'Portugal'));

-- Colombia vs DR Congo  (was Jun-27 00:00, correct Jun-24 02:00)
UPDATE public.matches SET kickoff_time = '2026-06-24T02:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Colombia' AND away_team = 'DR Congo') OR
  (home_team = 'DR Congo' AND away_team = 'Colombia'));

-- Colombia vs Portugal  (was Jul-02 20:00, correct Jun-27 23:30)
UPDATE public.matches SET kickoff_time = '2026-06-27T23:30:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Colombia' AND away_team = 'Portugal') OR
  (home_team = 'Portugal' AND away_team = 'Colombia'));

-- DR Congo vs Uzbekistan  (was Jul-02 20:00, correct Jun-27 23:30)
UPDATE public.matches SET kickoff_time = '2026-06-27T23:30:00Z'
WHERE stage = 'group' AND (
  (home_team = 'DR Congo'   AND away_team = 'Uzbekistan') OR
  (home_team = 'Uzbekistan' AND away_team = 'DR Congo'));

-- ── GROUP L ──────────────────────────────────────────────────────────────────
-- England vs Croatia  (was Jun-22 20:00, correct Jun-17 20:00)
UPDATE public.matches SET kickoff_time = '2026-06-17T20:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'England' AND away_team = 'Croatia') OR
  (home_team = 'Croatia' AND away_team = 'England'));

-- Ghana vs Panama  (was Jun-23 00:00, correct Jun-17 23:00)
UPDATE public.matches SET kickoff_time = '2026-06-17T23:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Ghana'  AND away_team = 'Panama') OR
  (home_team = 'Panama' AND away_team = 'Ghana'));

-- England vs Ghana  (was Jun-27 20:00, correct Jun-23 20:00)
UPDATE public.matches SET kickoff_time = '2026-06-23T20:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'England' AND away_team = 'Ghana') OR
  (home_team = 'Ghana'   AND away_team = 'England'));

-- Panama vs Croatia  (was Jun-28 00:00, correct Jun-23 23:00)
UPDATE public.matches SET kickoff_time = '2026-06-23T23:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Panama'  AND away_team = 'Croatia') OR
  (home_team = 'Croatia' AND away_team = 'Panama'));

-- Panama vs England  (was Jul-03 20:00, correct Jun-27 21:00)
UPDATE public.matches SET kickoff_time = '2026-06-27T21:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Panama'  AND away_team = 'England') OR
  (home_team = 'England' AND away_team = 'Panama'));

-- Croatia vs Ghana  (was Jul-03 20:00, correct Jun-27 21:00)
UPDATE public.matches SET kickoff_time = '2026-06-27T21:00:00Z'
WHERE stage = 'group' AND (
  (home_team = 'Croatia' AND away_team = 'Ghana') OR
  (home_team = 'Ghana'   AND away_team = 'Croatia'));
