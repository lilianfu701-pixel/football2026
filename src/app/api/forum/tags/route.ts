import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET — list all tags
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forum_tags")
    .select("id, name, name_zh, color, post_count")
    .order("post_count", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST { post_id, tag_ids: number[] } — set tags on a post (author/admin only)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { post_id, tag_ids } = (await req.json()) as { post_id: number; tag_ids: number[] };
  if (!post_id || !Array.isArray(tag_ids)) return NextResponse.json({ error: "Invalid params" }, { status: 400 });

  // Verify ownership or admin
  const { data: post } = await supabase.from("forum_posts").select("user_id").eq("id", post_id).single();
  const { data: me }   = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.user_id !== user.id && !me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Replace all tags for this post
  await supabase.from("forum_post_tags").delete().eq("post_id", post_id);

  if (tag_ids.length > 0) {
    const rows = tag_ids.slice(0, 5).map((tag_id) => ({ post_id, tag_id }));
    const { error } = await supabase.from("forum_post_tags").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update post_count for each tag
    await Promise.all(tag_ids.map((tid) =>
      supabase.rpc("increment_tag_count", { tid }).then(() => null, () => null)
    ));
  }

  return NextResponse.json({ ok: true });
}
