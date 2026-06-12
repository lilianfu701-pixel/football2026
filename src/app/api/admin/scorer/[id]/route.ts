import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const scorerId = parseInt(id, 10);
  if (isNaN(scorerId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json() as {
    goals?:          number;
    assists?:        number;
    matches_played?: number;
    is_visible?:     boolean;
    sort_order?:     number;
  };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.goals          !== undefined) updates.goals          = body.goals;
  if (body.assists        !== undefined) updates.assists        = body.assists;
  if (body.matches_played !== undefined) updates.matches_played = body.matches_played;
  if (body.is_visible     !== undefined) updates.is_visible     = body.is_visible;
  if (body.sort_order     !== undefined) updates.sort_order     = body.sort_order;

  const { error } = await supabase.from("top_scorers").update(updates).eq("id", scorerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
