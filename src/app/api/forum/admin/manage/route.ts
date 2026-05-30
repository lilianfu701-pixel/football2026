import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/forum/admin/manage
// body: { post_id: number, action: "pin"|"unpin"|"lock"|"unlock" }
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

  const { post_id, action } = await req.json();
  if (!post_id || !action) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const updates: Record<string, boolean> = {};
  switch (action) {
    case "pin":       updates.is_pinned   = true;  break;
    case "unpin":     updates.is_pinned   = false; break;
    case "lock":      updates.is_locked   = true;  break;
    case "unlock":    updates.is_locked   = false; break;
    case "feature":   updates.is_featured = true;  break;
    case "unfeature": updates.is_featured = false; break;
    case "restore":   updates.is_deleted  = false; break;
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { error } = await supabase
    .from("forum_posts")
    .update(updates)
    .eq("id", post_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
