import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { grantForumGc } from "@/lib/forumRewards";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { post_id, content, parent_id } = await req.json();

  if (!post_id || !content?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (content.length > 2000) {
    return NextResponse.json({ error: "Content too long" }, { status: 400 });
  }

  // Check post exists and is not locked
  const { data: post } = await supabase
    .from("forum_posts")
    .select("id, is_locked, user_id")
    .eq("id", post_id)
    .single();

  if (!post)           return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.is_locked)  return NextResponse.json({ error: "Post is locked" }, { status: 403 });

  const { data: reply, error } = await supabase
    .from("forum_replies")
    .insert({
      post_id,
      user_id:   user.id,
      content:   content.trim(),
      parent_id: parent_id ?? null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── GC reward for replying (fire-and-forget) ──────────────────────────────
  grantForumGc(supabase, user.id, "forum_reply", 5_000_000, 30).catch(() => null);

  // ── Notifications (fire-and-forget) ────────────────────────────────────────
  const notifyIds = new Set<string>();

  // 1. Notify post author (unless they are the replier)
  if (post.user_id && post.user_id !== user.id) {
    notifyIds.add(post.user_id);
    supabase.from("notifications").insert({
      user_id:  post.user_id,
      type:     "reply",
      actor_id: user.id,
      post_id,
      reply_id: reply.id,
    }).then(() => {});
  }

  // 2. If this is a nested reply, also notify the parent reply's author
  if (parent_id) {
    const { data: parentReply } = await supabase
      .from("forum_replies")
      .select("user_id")
      .eq("id", parent_id)
      .single();
    const pAuthor = parentReply?.user_id;
    if (pAuthor && pAuthor !== user.id && !notifyIds.has(pAuthor)) {
      supabase.from("notifications").insert({
        user_id:  pAuthor,
        type:     "reply",
        actor_id: user.id,
        post_id,
        reply_id: reply.id,
      }).then(() => {});
    }
  }

  // 3. Notify @mentioned users (fire-and-forget)
  const mentionedNicknames = extractMentions(content);
  if (mentionedNicknames.length > 0) {
    const { data: mentionedUsers } = await supabase
      .from("users")
      .select("id")
      .in("nickname", mentionedNicknames)
      .neq("id", user.id)
      .limit(10);
    for (const mu of mentionedUsers ?? []) {
      if (!notifyIds.has(mu.id)) {
        notifyIds.add(mu.id);
        supabase.from("notifications").insert({
          user_id:  mu.id,
          type:     "mention",
          actor_id: user.id,
          post_id,
          reply_id: reply.id,
        }).then(() => {});
      }
    }
  }

  return NextResponse.json({ id: reply.id });
}

// Extract @nickname from HTML content
function extractMentions(html: string): string[] {
  const mentionRegex = /data-user-id="[^"]*">@([\w一-鿿㐀-䶿]+)</g;
  const plainRegex   = /@([\w一-鿿㐀-䶿]{1,30})/g;
  const names = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = mentionRegex.exec(html)) !== null) names.add(m[1]);
  while ((m = plainRegex.exec(html.replace(/<[^>]*>/g, " "))) !== null) names.add(m[1]);
  return [...names].slice(0, 10);
}
