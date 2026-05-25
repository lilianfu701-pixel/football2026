import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/match-vote
 * Body: { match_id: number, vote: "home" | "neutral" | "away" }
 * Upserts the user's vote (one per match).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { match_id, vote } = (await req.json()) as { match_id: number; vote: string };

  if (!match_id || !["home", "neutral", "away"].includes(vote)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  // Upsert: insert or update existing vote
  const { error } = await supabase
    .from("match_votes")
    .upsert(
      { match_id, user_id: user.id, vote },
      { onConflict: "match_id,user_id" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
