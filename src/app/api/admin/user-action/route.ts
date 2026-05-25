import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { user_id, action } = (await req.json()) as { user_id: string; action: string };
  if (!user_id || user_id === user.id) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const updates: Record<string, boolean> = {};
  switch (action) {
    case "ban":     updates.is_banned = true;  break;
    case "unban":   updates.is_banned = false; break;
    case "admin":   updates.is_admin  = true;  break;
    case "unadmin": updates.is_admin  = false; break;
    default: return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { error } = await supabase.from("users").update(updates).eq("id", user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
