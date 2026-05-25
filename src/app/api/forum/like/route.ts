import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { target_type, target_id, liked } = await req.json();
  if (!["post", "reply"].includes(target_type) || !target_id) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  if (liked) {
    // Insert like (ignore duplicate)
    await supabase.from("forum_likes").upsert(
      { user_id: user.id, target_type, target_id },
      { onConflict: "user_id,target_type,target_id" }
    );
  } else {
    await supabase.from("forum_likes")
      .delete()
      .eq("user_id", user.id)
      .eq("target_type", target_type)
      .eq("target_id", target_id);
  }

  return NextResponse.json({ ok: true });
}
