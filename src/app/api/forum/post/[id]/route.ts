import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// PATCH /api/forum/post/[id]  — edit title and/or content (author only)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { title, content } = await req.json();

  if (!content?.trim() && !title?.trim()) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }
  if (content && content.length > 50_000) {
    return NextResponse.json({ error: "Content too long" }, { status: 400 });
  }
  if (title && title.trim().length > 200) {
    return NextResponse.json({ error: "Title too long" }, { status: 400 });
  }

  // Fetch post to check ownership + lock status
  const { data: post } = await supabase
    .from("forum_posts")
    .select("user_id, is_locked")
    .eq("id", id)
    .single();

  if (!post)         return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.is_locked) return NextResponse.json({ error: "Post is locked" }, { status: 403 });
  if (post.user_id !== user.id)
    return NextResponse.json({ error: "You can only edit your own posts" }, { status: 403 });

  const updates: Record<string, string> = { edited_at: new Date().toISOString() };
  if (content?.trim()) updates.content = content.trim();
  if (title?.trim())   updates.title   = title.trim();

  const { error } = await supabase
    .from("forum_posts")
    .update(updates)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
