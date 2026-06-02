import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { COUNTRY_CENTROIDS } from "@/lib/countryCentroids";
import { getTeamColor } from "@/lib/teamColors";

const centroidMap = new Map(COUNTRY_CENTROIDS.map((c) => [c.code, c]));

type PropType = "firework" | "goal" | "rally" | "boo";

const PROP_COSTS: Record<PropType, number> = {
  firework: 50_000,
  goal:     100_000,
  rally:    200_000,
  boo:      50_000,
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { match_id, prop_type = "firework" } = body as { match_id: number; prop_type: PropType };
  if (!match_id) {
    return NextResponse.json({ error: "match_id required" }, { status: 400 });
  }

  const cost = PROP_COSTS[prop_type] ?? PROP_COSTS.firework;

  // Run all queries in parallel
  const [profileRes, voteRes, matchRes] = await Promise.all([
    supabase.from("users")
      .select("country_code, nickname")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("match_votes")
      .select("vote")
      .eq("match_id", match_id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("matches")
      .select("home_team, away_team")
      .eq("id", match_id)
      .maybeSingle(),
  ]);

  const vote     = voteRes.data?.vote as "home" | "away" | "neutral" | null;
  const homeTeam = matchRes.data?.home_team ?? "";
  const awayTeam = matchRes.data?.away_team ?? "";

  // Only fans who chose a side (home or away) may use props
  if (!vote || vote === "neutral") {
    return NextResponse.json(
      { error: "neutral_vote", message: "You must support a team to use props" },
      { status: 403 },
    );
  }

  // Deduct GC atomically (will error if insufficient balance)
  const { error: deductError } = await supabase.rpc("gc_deduct_atomic", {
    p_user_id: user.id,
    p_amount:  cost,
    p_tx_type: "prop_used",
    p_desc:    `Match ${match_id} prop: ${prop_type}`,
  });

  if (deductError) {
    if (deductError.message?.includes("insufficient_balance")) {
      return NextResponse.json({ error: "insufficient_gc", message: "Insufficient GoalCoins" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to deduct GoalCoins" }, { status: 500 });
  }

  const teamColor = vote === "away"
    ? getTeamColor(awayTeam).primary
    : getTeamColor(homeTeam).primary;

  const countryCode = profileRes.data?.country_code ?? "US";
  const centroid    = centroidMap.get(countryCode);
  const username    =
    profileRes.data?.nickname ??
    user.email?.split("@")[0] ??
    "Fan";

  return NextResponse.json({
    ok: true,
    payload: {
      id:           `${user.id.slice(0, 8)}-${Date.now()}`,
      country_code: countryCode,
      lat:          centroid?.lat ?? 20,
      lng:          centroid?.lng ?? 10,
      color:        teamColor,
      username,
      prop_type,
    },
    cost_deducted: cost,
  });
}
