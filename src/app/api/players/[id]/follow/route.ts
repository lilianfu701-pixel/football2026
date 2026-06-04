/**
 * GET    /api/players/[id]/follow  — is the current user following this player?
 * POST   /api/players/[id]/follow  — follow this player
 * DELETE /api/players/[id]/follow  — unfollow this player
 *
 * Auth-bound via the cookie server client so RLS (auth.uid() = user_id) applies.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function parsePlayerId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const playerId = parsePlayerId(id);
  if (playerId === null) {
    return NextResponse.json({ error: "Invalid player id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ following: false, loggedIn: false });

  const { data } = await supabase
    .from("player_follows")
    .select("id")
    .eq("user_id", user.id)
    .eq("player_id", playerId)
    .maybeSingle();

  return NextResponse.json({ following: Boolean(data), loggedIn: true });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const playerId = parsePlayerId(id);
  if (playerId === null) {
    return NextResponse.json({ error: "Invalid player id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Upsert-style: ignore duplicate (unique constraint) so repeated POST is idempotent.
  const { error } = await supabase
    .from("player_follows")
    .upsert({ user_id: user.id, player_id: playerId }, { onConflict: "user_id,player_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ following: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const playerId = parsePlayerId(id);
  if (playerId === null) {
    return NextResponse.json({ error: "Invalid player id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("player_follows")
    .delete()
    .eq("user_id", user.id)
    .eq("player_id", playerId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ following: false });
}
