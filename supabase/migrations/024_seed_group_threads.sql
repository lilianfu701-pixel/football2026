-- 024: Batch-create forum threads for every group-stage match
-- Skips matches that already have a thread (idempotent).

DO $$
DECLARE
  v_cat_id  INTEGER;
  v_match   RECORD;
  v_title   TEXT;
  v_title_zh TEXT;
  v_content TEXT;
  v_content_zh TEXT;
  v_kickoff TEXT;
  v_kickoff_zh TEXT;
  v_hf TEXT;
  v_af TEXT;
  v_ht TEXT;
  v_at TEXT;
BEGIN
  -- Get the "match" category id
  SELECT id INTO v_cat_id FROM public.forum_categories WHERE slug = 'match';
  IF NOT FOUND THEN
    RAISE NOTICE 'match category not found, skipping';
    RETURN;
  END IF;

  FOR v_match IN
    SELECT id, home_team, away_team, home_flag, away_flag,
           group_name, stage, venue, city, kickoff_time
      FROM public.matches
     WHERE stage = 'group'
       AND home_team IS NOT NULL
       AND away_team IS NOT NULL
     ORDER BY kickoff_time, id
  LOOP
    -- Skip if thread already exists
    IF EXISTS (
      SELECT 1 FROM public.forum_posts
       WHERE category_id = v_cat_id AND match_id = v_match.id
    ) THEN
      CONTINUE;
    END IF;

    -- Safe values
    v_hf := COALESCE(v_match.home_flag, '');
    v_af := COALESCE(v_match.away_flag, '');
    v_ht := COALESCE(v_match.home_team, 'TBA');
    v_at := COALESCE(v_match.away_team, 'TBA');

    -- Format kickoff
    v_kickoff    := to_char(v_match.kickoff_time AT TIME ZONE 'UTC', 'Mon DD, YYYY HH24:MI') || ' UTC';
    v_kickoff_zh := to_char(v_match.kickoff_time AT TIME ZONE 'Asia/Shanghai', 'YYYY"年"MM"月"DD"日" HH24:MI') || ' 北京时间';

    -- English title & content
    v_title := v_hf || ' ' || v_ht || ' vs ' || v_at || ' ' || v_af
            || ' | Group ' || COALESCE(v_match.group_name, '?');

    v_content := '<h2>' || v_hf || ' ' || v_ht || ' vs ' || v_at || ' ' || v_af || '</h2>'
              || '<p><strong>🏟 Venue:</strong> ' || COALESCE(v_match.venue, 'TBA') || ', ' || COALESCE(v_match.city, '') || '</p>'
              || '<p><strong>📅 Kickoff:</strong> ' || v_kickoff || '</p>'
              || '<p><strong>🏆 Stage:</strong> Group ' || COALESCE(v_match.group_name, '?') || '</p>'
              || '<hr/>'
              || '<p>Share your predictions, lineups analysis, and live reactions below! ⚽</p>'
              || '<ul>'
              || '<li>🔮 Who will win?</li>'
              || '<li>⚽ Scoreline prediction?</li>'
              || '<li>⭐ Key player to watch?</li>'
              || '</ul>';

    -- Chinese title & content
    v_title_zh := v_hf || ' ' || v_ht || ' vs ' || v_at || ' ' || v_af
               || ' | ' || COALESCE(v_match.group_name, '?') || '组';

    v_content_zh := '<h2>' || v_hf || ' ' || v_ht || ' vs ' || v_at || ' ' || v_af || '</h2>'
                 || '<p><strong>🏟 球场：</strong>' || COALESCE(v_match.venue, '待定') || '，' || COALESCE(v_match.city, '') || '</p>'
                 || '<p><strong>📅 开球：</strong>' || v_kickoff_zh || '</p>'
                 || '<p><strong>🏆 阶段：</strong>' || COALESCE(v_match.group_name, '?') || '组小组赛</p>'
                 || '<hr/>'
                 || '<p>在下方分享你的预测、阵容分析和实时反应！⚽</p>'
                 || '<ul>'
                 || '<li>🔮 你看好谁赢？</li>'
                 || '<li>⚽ 预测比分？</li>'
                 || '<li>⭐ 关键球员？</li>'
                 || '</ul>';

    INSERT INTO public.forum_posts
      (category_id, match_id, stage, title, title_zh, content, content_zh,
       is_pinned, is_locked, user_id)
    VALUES
      (v_cat_id, v_match.id, v_match.stage, v_title, v_title_zh, v_content, v_content_zh,
       TRUE, FALSE, NULL);

  END LOOP;

  -- Update post_count on the match category
  UPDATE public.forum_categories
     SET post_count = (SELECT COUNT(*) FROM public.forum_posts WHERE category_id = v_cat_id AND is_deleted = false)
   WHERE id = v_cat_id;

  RAISE NOTICE 'Group stage threads seeded successfully';
END;
$$;
