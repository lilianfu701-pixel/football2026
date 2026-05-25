import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/forum/admin/delete
// body: { type: "post" | "reply", id: number }
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify admin
  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { type, id } = await req.json();
  if (!type || !id) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  if (type === "post") {
    const { error } = await supabase
      .from("forum_posts")
      .update({ is_deleted: true })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (type === "reply") {
    const { error } = await supabase
      .from("forum_replies")
      .update({ is_deleted: true })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
