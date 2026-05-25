import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST { post_id, bookmarked: true/false }
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { post_id, bookmarked } = (await req.json()) as { post_id: number; bookmarked: boolean };
  if (!post_id) return NextResponse.json({ error: "Missing post_id" }, { status: 400 });

  if (bookmarked) {
    const { error } = await supabase.from("forum_bookmarks")
      .upsert({ user_id: user.id, post_id }, { onConflict: "user_id,post_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase.from("forum_bookmarks")
      .delete().eq("user_id", user.id).eq("post_id", post_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
