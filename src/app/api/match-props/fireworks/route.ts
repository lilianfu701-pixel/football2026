import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { COUNTRY_CENTROIDS } from "@/lib/countryCentroids";
import { getTeamColor } from "@/lib/teamColors";

const centroidMap = new Map(COUNTRY_CENTROIDS.map((c) => [c.code, c]));

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { match_id, prop_type = "firework" } = body;
  if (!match_id) {
    return NextResponse.json({ error: "match_id required" }, { status: 400 });
  }

  // Run all queries in parallel
  const [profileRes, voteRes, matchRes] = await Promise.all([
    supabase.from("users")
      .select("country_code, username, nickname")
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

  const vote      = voteRes.data?.vote as "home" | "away" | "neutral" | null;
  const homeTeam  = matchRes.data?.home_team ?? "";
  const awayTeam  = matchRes.data?.away_team ?? "";

  // Use team's representative color; neutral fans get home team color
  const teamColor = vote === "away"
    ? getTeamColor(awayTeam).primary
    : getTeamColor(homeTeam).primary;

  const countryCode = profileRes.data?.country_code ?? "US";
  const centroid    = centroidMap.get(countryCode);
  const username    =
    profileRes.data?.nickname ??
    profileRes.data?.username ??
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
  });
}
