import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/match-vote
 * Body: { match_id: number, vote: "home" | "neutral" | "away", lat?: number, lng?: number }
 * Upserts the user's vote (one per match). Stores precise geolocation when provided.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { match_id, vote, lat, lng } = (await req.json()) as {
    match_id: number; vote: string; lat?: number; lng?: number;
  };

  if (!match_id || !["home", "neutral", "away"].includes(vote)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  // Include precise coordinates only when both are valid finite numbers
  const coords = typeof lat === "number" && isFinite(lat) &&
                 typeof lng === "number" && isFinite(lng)
    ? { lat, lng }
    : {};

  // Upsert: insert or update existing vote (coordinates are merged when present)
  const { error } = await supabase
    .from("match_votes")
    .upsert(
      { match_id, user_id: user.id, vote, ...coords },
      { onConflict: "match_id,user_id" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
