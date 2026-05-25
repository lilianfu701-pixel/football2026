-- ─────────────────────────────────────────────────────────────────────────────
-- 012_forum_categories.sql  —  Full forum board setup (12 boards, 5 groups)
-- Safe to re-run: uses ON CONFLICT DO UPDATE / ADD COLUMN IF NOT EXISTS
-- Run in Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Add group columns to forum_categories ─────────────────────────────────
ALTER TABLE public.forum_categories
  ADD COLUMN IF NOT EXISTS cat_group    TEXT NOT NULL DEFAULT 'community',
  ADD COLUMN IF NOT EXISTS cat_group_zh TEXT NOT NULL DEFAULT '球迷社区';

-- ── 2. Upsert all 12 boards ───────────────────────────────────────────────────
--
-- Groups:
--   match      赛事竞技  Match & Competition   (sort 1-4)
--   predict    GC竞猜    GC Predictions        (sort 5-6)
--   news       资讯动态  News & Media          (sort 7-8)
--   special    2026专题  2026 Special          (sort 9-10)
--   community  球迷社区  Fan Community         (sort 11-12)

INSERT INTO public.forum_categories
  (slug, name, name_zh, icon, description, description_zh,
   sort_order, cat_group, cat_group_zh)
VALUES

  -- ── 赛事竞技 / Match & Competition ──────────────────────────────────────────
  ('match',
   'Match Talk',    '赛事讨论',
   '⚽',
   'Pre-match previews, live chat and post-match reviews for every game',
   '赛前预测、比赛直播讨论与赛后复盘，每场比赛一个专属帖',
   1, 'match', '赛事竞技'),

  ('teams',
   'Team Analysis', '各队分析',
   '🏴',
   'Deep dives on all 48 World Cup nations: squads, form & prospects',
   '48支参赛国家队阵容深度分析、状态评估与晋级前景',
   2, 'match', '赛事竞技'),

  ('tactical',
   'Tactics',       '战术解析',
   '🧠',
   'Formations, pressing traps, set pieces and in-depth tactical breakdowns',
   '阵型拆解、压迫陷阱、定位球战术与技战术深度分析',
   3, 'match', '赛事竞技'),

  ('stars',
   'Stars & Players','风云人物',
   '⭐',
   'Player performances, rankings, controversies and GOAT debates',
   '球星表现点评、排名争议、GOAT之争与赛场外动态',
   4, 'match', '赛事竞技'),

  -- ── GC竞猜 / GC Predictions ─────────────────────────────────────────────────
  ('predict',
   'Predictions',   '竞猜交流',
   '🎯',
   'Share GC bet results, winning streaks, tips and strategies',
   '晒竞猜战绩、分享必胜技巧、探讨GC下注策略与赔率分析',
   5, 'predict', 'GC竞猜'),

  ('gc-guide',
   'GC Strategy',   'GC攻略',
   '💡',
   'How to earn GC coins, wealth level guides and platform tips',
   '如何快速积累GC币、财富等级攻略与平台使用技巧',
   6, 'predict', 'GC竞猜'),

  -- ── 资讯动态 / News & Media ──────────────────────────────────────────────────
  ('breaking',
   'Breaking News', '热点新闻',
   '🔥',
   'Latest injuries, suspensions, transfers and squad controversies',
   '最新伤病、禁赛、转会动态与球队内部争议话题',
   7, 'news', '资讯动态'),

  ('media',
   'Media & Commentary', '转播解说',
   '📺',
   'TV broadcast reviews, commentator moments and media coverage debates',
   '各国转播解说点评、经典解说名场面与媒体报道争议',
   8, 'news', '资讯动态'),

  -- ── 2026专题 / 2026 Special ──────────────────────────────────────────────────
  ('history',
   'WC History',    '世界杯历史',
   '📜',
   'Classic matches, records, legends and the history of World Cup football',
   '经典比赛回顾、历史纪录、世界杯传奇与冷知识分享',
   9, 'special', '2026专题'),

  ('hosts',
   'USA · Canada · Mexico', '三国举办地',
   '🌎',
   '2026 host cities, 16 stadiums, travel tips and venue guides',
   '2026年美加墨三国举办城市、16座球场介绍、看球旅行攻略',
   10, 'special', '2026专题'),

  -- ── 球迷社区 / Fan Community ─────────────────────────────────────────────────
  ('lounge',
   'Fan Lounge',    '球迷休息室',
   '🎉',
   'Memes, banter, predictions games and off-topic fan chat',
   '表情包、段子、趣味竞猜小游戏与球迷日常闲聊',
   11, 'community', '球迷社区'),

  ('fanzone',
   'Fan Zone',      '球迷风采',
   '📸',
   'Share your match day photos, watch party setups and fan costumes',
   '晒看球现场照片、客厅观赛布置、球衣收藏与球迷风采',
   12, 'community', '球迷社区')

ON CONFLICT (slug) DO UPDATE SET
  name           = EXCLUDED.name,
  name_zh        = EXCLUDED.name_zh,
  icon           = EXCLUDED.icon,
  description    = EXCLUDED.description,
  description_zh = EXCLUDED.description_zh,
  sort_order     = EXCLUDED.sort_order,
  cat_group      = EXCLUDED.cat_group,
  cat_group_zh   = EXCLUDED.cat_group_zh;

-- ── 3. Remove the old 'break' duplicate if it crept in ───────────────────────
-- (safe no-op if it doesn't exist)
DELETE FROM public.forum_categories WHERE slug NOT IN (
  'match','teams','tactical','stars','predict','gc-guide',
  'breaking','media','history','hosts','lounge','fanzone'
);
