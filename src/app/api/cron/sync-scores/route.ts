import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const FD_BASE = "https://api.football-data.org/v4";
const COMPETITION_CODE = "WC";

const TEAM_MAP: Record<string, string> = {
  "Korea Republic":      "South Korea",
  "United States":       "USA",
  "Côte d'Ivoire":       "Ivory Coast",
  "Türkiye":             "Turkey",
  "Congo DR":            "DR Congo",
};

function mapStatus(s: string): string {
  if (s === "FINISHED")                  return "finished";
  if (s === "IN_PLAY" || s === "PAUSED") return "live";
  if (s === "POSTPONED")                 return "postponed";
  if (s === "CANCELLED")                 return "cancelled";
  return "upcoming";
}

function normTeam(name: string): string {
  return TEAM_MAP[name] ?? name;
}

export async function GET(req: Request) {
  // Vercel Cron 鉴权
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FOOTBALL_DATA_API_KEY not set" }, { status: 500 });
  }

  try {
    // 只拉今天前后 2 天内的比赛，减少 API 用量
    const today = new Date();
    const from  = new Date(today); from.setDate(today.getDate() - 1);
    const to    = new Date(today); to.setDate(today.getDate() + 2);
    const fmt   = (d: Date) => d.toISOString().slice(0, 10);

    const url = `${FD_BASE}/competitions/${COMPETITION_CODE}/matches?dateFrom=${fmt(from)}&dateTo=${fmt(to)}`;
    const fdRes = await fetch(url, {
      headers: { "X-Auth-Token": apiKey },
      next: { revalidate: 0 },
    });

    if (fdRes.status === 404) {
      return NextResponse.json({ ok: true, message: "Competition not started yet" });
    }
    if (!fdRes.ok) {
      const txt = await fdRes.text();
      return NextResponse.json({ error: `football-data API: ${fdRes.status} ${txt}` }, { status: 502 });
    }

    const { matches: apiMatches } = await fdRes.json() as { matches: any[] };

    const supabase = createServiceClient();
    const { data: dbMatches } = await supabase
      .from("matches")
      .select("id, home_team, away_team, status, home_score, away_score");

    let updated = 0;
    for (const m of apiMatches) {
      const home   = normTeam(m.homeTeam?.name ?? "");
      const away   = normTeam(m.awayTeam?.name ?? "");
      const status = mapStatus(m.status);
      const hs     = m.score?.fullTime?.home ?? null;
      const as_    = m.score?.fullTime?.away ?? null;

      const db = dbMatches?.find((d) => d.home_team === home && d.away_team === away);
      if (!db) continue;

      if (db.status === status && db.home_score === hs && db.away_score === as_) continue;

      await supabase.from("matches").update({ status, home_score: hs, away_score: as_ }).eq("id", db.id);
      updated++;
    }

    return NextResponse.json({ ok: true, updated, total: apiMatches.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
