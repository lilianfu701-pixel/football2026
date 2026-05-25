import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { grantForumGc } from "@/lib/forumRewards";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { category_id, title, content, match_id, stage, tag_ids } = await req.json();

  if (!category_id || !title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (title.length > 120)    return NextResponse.json({ error: "Title too long" },   { status: 400 });
  if (content.length > 10000) return NextResponse.json({ error: "Content too long" }, { status: 400 });

  // Verify category exists
  const { data: cat } = await supabase
    .from("forum_categories")
    .select("id, slug")
    .eq("id", category_id)
    .single();
  if (!cat) return NextResponse.json({ error: "Invalid category" }, { status: 400 });

  // Block system-only boards (hardcoded until migration 018 adds no_new_posts column)
  const LOCKED_SLUGS = ["match"];
  if (LOCKED_SLUGS.includes(cat.slug)) {
    return NextResponse.json({ error: "This board does not accept new posts" }, { status: 403 });
  }

  const { data: post, error } = await supabase
    .from("forum_posts")
    .insert({
      category_id,
      user_id:  user.id,
      title:    title.trim(),
      content:  content.trim(),
      match_id: match_id ?? null,
      stage:    stage    ?? null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // GC reward for posting (fire-and-forget)
  grantForumGc(supabase, user.id, "forum_post", 20_000_000, 5).catch(() => null);

  // Attach tags if provided
  if (Array.isArray(tag_ids) && tag_ids.length > 0) {
    const tagRows = tag_ids
      .slice(0, 3)
      .filter((id: unknown) => typeof id === "number")
      .map((tag_id: number) => ({ post_id: post.id, tag_id }));
    if (tagRows.length > 0) {
      await supabase.from("forum_post_tags").insert(tagRows);
    }
  }

  return NextResponse.json({ id: post.id });
}
