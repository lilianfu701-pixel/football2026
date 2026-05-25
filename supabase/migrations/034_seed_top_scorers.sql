-- ── 034: Seed top scorers (pre-tournament candidates) ──────────────────────
-- Initial 5 candidates; goals/assists start at 0 and are updated during the tournament

TRUNCATE TABLE public.top_scorers RESTART IDENTITY;

INSERT INTO public.top_scorers
  (player_name, player_name_zh, team, photo_url, goals, assists, matches_played, sort_order, is_visible)
VALUES
  ('Kylian Mbappé',  '基利安·姆巴佩',  'France',    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/2019-07-17_SEM_%2848518954437%29_%28cropped%29.jpg/240px-2019-07-17_SEM_%2848518954437%29_%28cropped%29.jpg', 0, 0, 0, 1, TRUE),
  ('Harry Kane',     '哈里·凯恩',      'England',   'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Harry_Kane_vs_Belgium_%28cropped%29.jpg/240px-Harry_Kane_vs_Belgium_%28cropped%29.jpg', 0, 0, 0, 2, TRUE),
  ('Vinicius Jr.',   '维尼修斯',       'Brazil',    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Vinicius_Junior_2023.jpg/240px-Vinicius_Junior_2023.jpg', 0, 0, 0, 3, TRUE),
  ('Lionel Messi',   '莱昂内尔·梅西',  'Argentina', 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg/240px-Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg', 0, 0, 0, 4, TRUE),
  ('Lamine Yamal',   '亚马尔',         'Spain',     'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Lamine_Yamal_2024.jpg/240px-Lamine_Yamal_2024.jpg', 0, 0, 0, 5, TRUE);
