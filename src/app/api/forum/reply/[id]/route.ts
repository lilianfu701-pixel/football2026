import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// PATCH /api/forum/reply/[id]  — edit reply content (author only)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { content } = await req.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }
  if (content.length > 10_000) {
    return NextResponse.json({ error: "Content too long" }, { status: 400 });
  }

  // Fetch reply to check ownership + post lock
  const { data: reply } = await supabase
    .from("forum_replies")
    .select("user_id, post_id")
    .eq("id", id)
    .single();

  if (!reply) return NextResponse.json({ error: "Reply not found" }, { status: 404 });
  if (reply.user_id !== user.id)
    return NextResponse.json({ error: "You can only edit your own replies" }, { status: 403 });

  // Check post isn't locked
  const { data: post } = await supabase
    .from("forum_posts")
    .select("is_locked")
    .eq("id", reply.post_id)
    .single();

  if (post?.is_locked) return NextResponse.json({ error: "Post is locked" }, { status: 403 });

  const { error } = await supabase
    .from("forum_replies")
    .update({ content: content.trim(), edited_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
