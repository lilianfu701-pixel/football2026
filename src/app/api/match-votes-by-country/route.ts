import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// GET /api/match-votes-by-country?match_id=xxx
// Returns vote breakdown by country_code.
// Uses the service client so the aggregation counts EVERY user's vote — RLS on
// `users` only exposes the caller's own row, which would otherwise hide the full
// fan distribution from guests (and show logged-in users only their own vote).
// Only aggregated country/vote counts are returned, so no PII is exposed.
export async function GET(req: NextRequest) {
  const match_id = req.nextUrl.searchParams.get("match_id");
  if (!match_id) return NextResponse.json({ error: "match_id required" }, { status: 400 });

  const supabase = createServiceClient();

  // Main aggregation — omits lat/lng so the query works even if migration 050
  // (which adds those columns) has not been applied to Supabase yet.
  const { data, error } = await supabase
    .from("match_votes")
    .select("vote, users!inner(country_code)")
    .eq("match_id", match_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate by country_code + vote
  const countryVotes: Record<string, { home: number; neutral: number; away: number }> = {};

  for (const row of (data ?? []) as { vote: string; users: { country_code: string | null } | { country_code: string | null }[] }[]) {
    const u = Array.isArray(row.users) ? row.users[0] : row.users;
    const code = u?.country_code ?? "XX";
    if (!countryVotes[code]) countryVotes[code] = { home: 0, neutral: 0, away: 0 };
    if (row.vote === "home")    countryVotes[code].home++;
    else if (row.vote === "neutral") countryVotes[code].neutral++;
    else if (row.vote === "away")    countryVotes[code].away++;
  }

  // Convert to array: for each country, dominant vote direction
  const result = Object.entries(countryVotes).map(([country_code, counts]) => {
    const total   = counts.home + counts.neutral + counts.away;
    const dominant =
      counts.home >= counts.away && counts.home >= counts.neutral ? "home" :
      counts.away >= counts.home && counts.away >= counts.neutral ? "away" : "neutral";
    return { country_code, dominant, ...counts, total };
  });

  const totals = (data ?? []).reduce(
    (acc, row) => {
      if ((row as { vote: string }).vote === "home")    acc.home++;
      else if ((row as { vote: string }).vote === "neutral") acc.neutral++;
      else if ((row as { vote: string }).vote === "away")    acc.away++;
      return acc;
    },
    { home: 0, neutral: 0, away: 0 }
  );

  // Precise dots — separate query so a missing lat/lng column (migration 050 not yet
  // applied) silently returns an empty array instead of breaking the whole endpoint.
  interface PreciseDotRow {
    vote: string; lat: number; lng: number;
    users: { country_code: string | null } | { country_code: string | null }[];
  }
  let dots: { vote: "home" | "away"; lat: number; lng: number; country_code: string }[] = [];
  const { data: geoData, error: geoError } = await supabase
    .from("match_votes")
    .select("vote, lat, lng, users!inner(country_code)")
    .eq("match_id", match_id)
    .not("lat", "is", null)
    .not("lng", "is", null);

  if (!geoError && geoData) {
    dots = (geoData as unknown as PreciseDotRow[])
      .filter((r) => r.vote === "home" || r.vote === "away")
      .map((r) => {
        const u = Array.isArray(r.users) ? r.users[0] : r.users;
        return {
          vote:         r.vote as "home" | "away",
          lat:          r.lat,
          lng:          r.lng,
          country_code: u?.country_code ?? "XX",
        };
      });
  }

  return NextResponse.json({ countries: result, totals, dots });
}
