import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// ── GET /api/notifications ────────────────────────────────────────────────────
// Returns latest 20 notifications for the logged-in user, with actor nickname
// and post title joined in-code (avoids PostgREST FK ambiguity).
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. Raw notification rows
  const { data: rows, error } = await supabase
    .from("notifications")
    .select("id, type, is_read, gc_amount, reason, created_at, post_id, reply_id, actor_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const notifs = rows ?? [];

  // 2. Batch-fetch actor nicknames + avatars
  const actorIds = [...new Set(notifs.map((n) => n.actor_id).filter(Boolean))] as string[];
  const actorsMap = new Map<string, { nickname: string; avatar_url: string | null }>();
  if (actorIds.length) {
    const { data: actors } = await supabase
      .from("users")
      .select("id, nickname, avatar_url")
      .in("id", actorIds);
    for (const a of actors ?? []) actorsMap.set(a.id, a);
  }

  // 3. Batch-fetch post titles
  const postIds = [...new Set(notifs.map((n) => n.post_id).filter(Boolean))] as number[];
  const postsMap = new Map<number, string>();
  if (postIds.length) {
    const { data: posts } = await supabase
      .from("forum_posts")
      .select("id, title")
      .in("id", postIds);
    for (const p of posts ?? []) postsMap.set(p.id, p.title);
  }

  // 4. Join
  const notifications = notifs.map((n) => ({
    ...n,
    actor:      n.actor_id ? (actorsMap.get(n.actor_id) ?? null) : null,
    post_title: n.post_id  ? (postsMap.get(n.post_id)  ?? null) : null,
  }));

  const unread = notifications.filter((n) => !n.is_read).length;
  return NextResponse.json({ notifications, unread });
}

// ── PATCH /api/notifications ──────────────────────────────────────────────────
// Mark all unread notifications as read.
export async function PATCH() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return NextResponse.json({ ok: true });
}
