import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const matchId = Number(request.nextUrl.searchParams.get("matchId"));
  if (!Number.isInteger(matchId) || matchId <= 0) {
    return NextResponse.json({ error: "Invalid matchId" }, { status: 400 });
  }

  const sb = createServiceClient();
  const { data, error } = await sb
    .from("matches")
    .select("home_score, away_score, status")
    .eq("id", matchId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    homeScore: data.home_score as number | null,
    awayScore: data.away_score as number | null,
    status: data.status as string | null,
  });
}
