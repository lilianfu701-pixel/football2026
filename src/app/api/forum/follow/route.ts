import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { post_id, following } = await req.json();
  if (!post_id) return NextResponse.json({ error: "Invalid params" }, { status: 400 });

  if (following) {
    await supabase.from("forum_follows").upsert(
      { user_id: user.id, post_id },
      { onConflict: "user_id,post_id" }
    );
  } else {
    await supabase.from("forum_follows")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", post_id);
  }

  return NextResponse.json({ ok: true });
}
