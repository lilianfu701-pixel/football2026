-- 037: Lock down direct RLS writes for forum tags and messages.
--
-- API routes already enforce these rules. This migration makes direct Supabase
-- client access follow the same boundaries.

-- Only post owners and admins may attach or remove tags from a post.
DROP POLICY IF EXISTS "post_tags_insert" ON public.forum_post_tags;
DROP POLICY IF EXISTS "post_tags_delete" ON public.forum_post_tags;

CREATE POLICY "post_tags_insert" ON public.forum_post_tags
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.forum_posts p
      WHERE p.id = forum_post_tags.post_id
        AND (
          p.user_id = auth.uid()
          OR (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE
        )
    )
  );

CREATE POLICY "post_tags_delete" ON public.forum_post_tags
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.forum_posts p
      WHERE p.id = forum_post_tags.post_id
        AND (
          p.user_id = auth.uid()
          OR (SELECT is_admin FROM public.users WHERE id = auth.uid()) = TRUE
        )
    )
  );

-- Receivers may only mark messages as read through direct client access.
-- Sending messages still goes through the existing INSERT policy.
DROP POLICY IF EXISTS "messages_update" ON public.messages;

REVOKE UPDATE ON public.messages FROM anon;
REVOKE UPDATE ON public.messages FROM authenticated;
GRANT UPDATE (is_read) ON public.messages TO authenticated;

CREATE POLICY "messages_update_read_status" ON public.messages
  FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id AND is_read = TRUE);
