-- ─────────────────────────────────────────────────────────────────────────────
-- 013_remove_community.sql  —  Remove Fan Community boards (lounge, fanzone)
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM public.forum_categories
WHERE slug IN ('lounge', 'fanzone');
