-- ─────────────────────────────────────────────────────────────────────────────
-- 008_match_thread_fn.sql  —  RPC to lazily get-or-create a system match thread
-- ─────────────────────────────────────────────────────────────────────────────

-- Returns the forum_post.id for the given match's pinned system thread.
-- Creates it (SECURITY DEFINER → bypasses RLS) if it doesn't exist yet.
CREATE OR REPLACE FUNCTION public.get_or_create_match_thread(p_match_id INTEGER)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cat_id  INTEGER;
  v_post_id BIGINT;
  v_match   RECORD;
  v_title   TEXT;
BEGIN
  -- Fetch match
  SELECT id, home_team, away_team, stage
    INTO v_match
    FROM public.matches
   WHERE id = p_match_id;

  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Fetch match category
  SELECT id INTO v_cat_id
    FROM public.forum_categories
   WHERE slug = 'match';

  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Check existing thread
  SELECT id INTO v_post_id
    FROM public.forum_posts
   WHERE category_id = v_cat_id
     AND match_id    = p_match_id
   LIMIT 1;

  IF FOUND THEN RETURN v_post_id; END IF;

  -- Build title
  v_title := v_match.home_team || ' vs ' || v_match.away_team;

  -- Create pinned system thread (user_id NULL = system post)
  INSERT INTO public.forum_posts
    (category_id, match_id, stage, title, content, is_pinned, is_locked, user_id)
  VALUES
    (v_cat_id, p_match_id, v_match.stage, v_title,
     'Official match discussion thread. Share your predictions and reactions!',
     TRUE, FALSE, NULL)
  RETURNING id INTO v_post_id;

  RETURN v_post_id;
END;
$$;

-- Grant execute to anon + authenticated so any visitor can trigger lazy creation
GRANT EXECUTE ON FUNCTION public.get_or_create_match_thread(INTEGER) TO anon, authenticated;
