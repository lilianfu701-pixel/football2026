import MobileHome, { type MobileMatch, type MobileTopScorer } from "@/components/mobile/MobileHome";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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
  is_featured: boolean | null;
};

type DbTopScorer = {
  id: number;
  player_name: string;
  player_name_zh: string | null;
  team: string;
  goals: number;
  assists: number;
  matches_played: number;
};

const MATCH_COLUMNS = "id, home_team, away_team, kickoff_time, group_name, stage, venue, city, status, pool_home, pool_draw, pool_away, odds_home, odds_draw, odds_away, is_featured";

function toMobileMatch(match: DbMatch, followCount = 0, isFollowing = false): MobileMatch {
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
    isFollowing,
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
  const previewEmail = preview === "app" && process.env.NODE_ENV !== "production" ? "zeximail@gmail.com" : undefined;
  const userEmail = user?.email ?? previewEmail;
  const profileClient = user ? supabase : previewEmail ? createServiceClient() : null;
  const { data: profile } = profileClient
    ? await profileClient
        .from("users")
        .select("id, nickname, gc_balance")
        .eq(user ? "id" : "email", user ? user.id : previewEmail!)
        .maybeSingle()
    : { data: null };
  const userDisplayName =
    profile?.nickname ??
    (user?.user_metadata?.display_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    userEmail?.split("@")[0];
  const { data: followRows } = profileClient && profile?.id
    ? await profileClient.from("match_follows").select("match_id").eq("user_id", profile.id)
    : { data: [] };
  const followedIds = new Set((followRows ?? []).map((row) => row.match_id));
  const toVisibleMobileMatch = (match: DbMatch) => toMobileMatch(match, 0, followedIds.has(match.id));

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
  const { data: scheduleRows } = await supabase
    .from("matches")
    .select(MATCH_COLUMNS)
    .order("kickoff_time", { ascending: true })
    .returns<DbMatch[]>();
  const [{ data: featuredRows }, { data: topScorerRows }] = await Promise.all([
    supabase
      .from("matches")
      .select(MATCH_COLUMNS)
      .eq("is_featured", true)
      .order("kickoff_time", { ascending: true })
      .limit(4)
      .returns<DbMatch[]>(),
    supabase
      .from("top_scorers")
      .select("id, player_name, player_name_zh, team, goals, assists, matches_played")
      .eq("is_visible", true)
      .order("sort_order", { ascending: true })
      .limit(5)
      .returns<DbTopScorer[]>(),
  ]);
  const upcomingMatches = rows.slice(0, 4).map(toVisibleMobileMatch);
  const featuredMatches = (featuredRows ?? []).map(toVisibleMobileMatch);
  const topScorers: MobileTopScorer[] = (topScorerRows ?? []).map((scorer) => ({
    id: scorer.id,
    playerName: scorer.player_name,
    playerNameZh: scorer.player_name_zh,
    team: scorer.team,
    goals: scorer.goals,
    assists: scorer.assists,
    matchesPlayed: scorer.matches_played,
  }));

  return (
    <MobileHome
      locale={locale}
      isLoggedIn={Boolean(userEmail)}
      canPersistActions={Boolean(user)}
      userEmail={userEmail}
      userDisplayName={userDisplayName}
      profileBalance={profile?.gc_balance ?? 0}
      daysLeft={fallbackDaysLeft(upcomingMatches)}
      upcomingMatches={upcomingMatches}
      featuredMatches={featuredMatches}
      scheduleMatches={(scheduleRows ?? rows).map(toVisibleMobileMatch)}
      topScorers={topScorers}
    />
  );
}
