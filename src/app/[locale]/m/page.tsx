import MobileHome, { type MobileMatch } from "@/components/mobile/MobileHome";
import { createClient } from "@/lib/supabase/server";

interface MobileHomePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ preview?: string }>;
}

type DbMatch = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff_time: string;
  group_name: string | null;
  stage: string | null;
  venue: string | null;
  city: string | null;
  status: string | null;
  pool_home: number | null;
  pool_draw: number | null;
  pool_away: number | null;
  odds_home: number | null;
  odds_draw: number | null;
  odds_away: number | null;
};

const MATCH_COLUMNS = "id, home_team, away_team, kickoff_time, group_name, stage, venue, city, status, pool_home, pool_draw, pool_away, odds_home, odds_draw, odds_away";
// TODO: Replace this placeholder with the admin-provided match codes from the backend.
// For now an empty list means "fill with four real matches from the current database".
const FEATURED_MATCH_CODES: number[] = [];

function toMobileMatch(match: DbMatch, followCount = 0): MobileMatch {
  return {
    id: match.id,
    homeTeam: match.home_team,
    awayTeam: match.away_team,
    kickoffTime: match.kickoff_time,
    groupName: match.group_name,
    stage: match.stage,
    venue: match.venue,
    city: match.city,
    status: match.status,
    poolHome: match.pool_home,
    poolDraw: match.pool_draw,
    poolAway: match.pool_away,
    oddsHome: match.odds_home,
    oddsDraw: match.odds_draw,
    oddsAway: match.odds_away,
    followCount,
  };
}

function fallbackDaysLeft(matches: MobileMatch[]) {
  const kickoff = matches[0]?.kickoffTime ? new Date(matches[0].kickoffTime) : new Date("2026-06-11T19:00:00Z");
  return Math.max(0, Math.ceil((kickoff.getTime() - Date.now()) / 86_400_000))
    .toString()
    .padStart(2, "0");
}

export default async function MobileHomePage({ params, searchParams }: MobileHomePageProps) {
  const { locale } = await params;
  const { preview } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const previewEmail = preview === "app" ? "zeximail@gmail.com" : undefined;
  const userEmail = user?.email ?? previewEmail;

  const nowIso = new Date().toISOString();
  let { data: upcomingRows } = await supabase
    .from("matches")
    .select(MATCH_COLUMNS)
    .gte("kickoff_time", nowIso)
    .order("kickoff_time", { ascending: true })
    .limit(12)
    .returns<DbMatch[]>();

  if (!upcomingRows?.length) {
    const fallback = await supabase
      .from("matches")
      .select(MATCH_COLUMNS)
      .order("kickoff_time", { ascending: true })
      .limit(12)
      .returns<DbMatch[]>();
    upcomingRows = fallback.data ?? [];
  }

  const rows = upcomingRows ?? [];
  const upcomingMatches = rows.slice(0, 4).map((match) => toMobileMatch(match));
  const codeOrder = new Map(FEATURED_MATCH_CODES.map((code, index) => [code, index]));
  const featuredSource = FEATURED_MATCH_CODES.length > 0
    ? rows
        .filter((match) => codeOrder.has(match.id))
        .sort((a, b) => (codeOrder.get(a.id) ?? 0) - (codeOrder.get(b.id) ?? 0))
        .slice(0, 4)
    : rows.slice(4, 8);
  const followedMatches = featuredSource.map((match) => toMobileMatch(match));

  return (
    <MobileHome
      locale={locale}
      isLoggedIn={Boolean(userEmail)}
      userEmail={userEmail}
      daysLeft={fallbackDaysLeft(upcomingMatches)}
      upcomingMatches={upcomingMatches}
      followedMatches={followedMatches}
    />
  );
}
