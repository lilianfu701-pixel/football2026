export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getFlagUrl, getTeamDisplayName } from "@/lib/flags";
import { computeGroupStandings } from "@/lib/groupStandings";
import CountdownHero from "@/components/home/CountdownHero";
import MobileAppBanner from "@/components/home/MobileAppBanner";
import MatchHero from "@/components/forum/MatchHero";
import MatchFanSection from "@/components/matches/MatchFanSection";
import { getTeamColor } from "@/lib/teamColors";
import { lc } from "@/i18n/content";

/* ─── Phase detection ────────────────────────────────────────────────────── */
const WC_START = new Date("2026-06-11T20:00:00+00:00");
const WC_END   = new Date("2026-07-19T23:59:59+00:00");

function getPhase(): "pre" | "during" | "post" {
  const now = new Date();
  if (now < WC_START) return "pre";
  if (now <= WC_END)  return "during";
  return "post";
}

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface MatchRow {
  id: number;
  match_code: string | null;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  home_flag: string | null;
  away_flag: string | null;
  kickoff_time: string;
  venue: string | null;
  city: string | null;
  status: string;
  group_name: string | null;
  stage: string | null;
  is_featured?: boolean;
}

interface Scorer {
  id: number;
  player_name: string;
  player_name_zh: string | null;
  team: string;
  photo_url: string | null;
  goals: number;
  assists: number;
  matches_played: number;
}

interface LeaderUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  gc_balance: number;
  rank: number;
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function SectionTitle({ en, zh, locale }: { en: string; zh: string; locale: string }) {
  return (
    <h2 className="text-2xl sm:text-3xl font-black text-white mb-6">
      {locale === "zh" ? zh : en}
    </h2>
  );
}

function MatchCard({ match, locale }: { match: MatchRow; locale: string }) {
  const zh = locale === "zh";
  const dt = new Date(match.kickoff_time);
  const dateStr = dt.toLocaleDateString(zh ? "zh-CN" : "en-US", {
    month: "short", day: "numeric", timeZone: "UTC",
  });
  const timeStr = dt.toLocaleTimeString(zh ? "zh-CN" : "en-US", {
    hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  });
  const isFinished = match.status === "finished";

  return (
    <Link href={`/${locale}/matches/${match.id}`}
      className="block rounded-2xl border border-white/10 bg-[#0A1628] hover:border-[#FFD700]/30 hover:bg-[#0d1e36] transition-all p-4">
      <div className="flex items-center justify-between text-[11px] text-gray-500 mb-3 uppercase tracking-wider">
        <span>{match.group_name ? (zh ? `小组 ${match.group_name}` : `Group ${match.group_name}`) : (match.stage ?? "")}</span>
        <span>{dateStr} {timeStr}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        {/* Home */}
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <img src={getFlagUrl(match.home_team)} alt={match.home_team}
            className="w-10 h-7 rounded object-cover" />
          <span className="text-xs font-bold text-white text-center leading-tight">{getTeamDisplayName(match.home_team, locale)}</span>
        </div>
        {/* Score / VS */}
        <div className="flex flex-col items-center gap-1">
          {isFinished && match.home_score !== null && match.away_score !== null ? (
            <span className="text-2xl font-black text-[#FFD700]">
              {match.home_score} – {match.away_score}
            </span>
          ) : (
            <span className="text-base font-black text-gray-500">VS</span>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
            match.status === "live"     ? "bg-red-500/20 text-red-400" :
            match.status === "finished" ? "bg-gray-700 text-gray-400" :
                                          "bg-[#FFD700]/10 text-[#FFD700]"
          }`}>
            {match.status === "live"     ? (lc(locale, "直播中", "LIVE")) :
             match.status === "finished" ? (lc(locale, "已结束", "FT")) :
                                           timeStr}
          </span>
        </div>
        {/* Away */}
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <img src={getFlagUrl(match.away_team)} alt={match.away_team}
            className="w-10 h-7 rounded object-cover" />
          <span className="text-xs font-bold text-white text-center leading-tight">{getTeamDisplayName(match.away_team, locale)}</span>
        </div>
      </div>
      {match.venue && (
        <p className="text-center text-[10px] text-gray-600 mt-3">📍 {match.venue}</p>
      )}
    </Link>
  );
}

function MatchCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0A1628] p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-2.5 w-16 rounded bg-white/10" />
        <div className="h-2.5 w-20 rounded bg-white/10" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="w-10 h-7 rounded bg-white/10" />
          <div className="h-2.5 w-14 rounded bg-white/10" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="h-4 w-8 rounded bg-white/10" />
          <div className="h-4 w-14 rounded bg-white/10" />
        </div>
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="w-10 h-7 rounded bg-white/10" />
          <div className="h-2.5 w-14 rounded bg-white/10" />
        </div>
      </div>
      <div className="mt-3 h-2 w-24 rounded bg-white/10 mx-auto" />
    </div>
  );
}

function ScorerRowSkeleton({ rank }: { rank: number }) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-3.5 border-b border-white/5 last:border-0 items-center animate-pulse">
      <span className={`w-6 text-sm font-black ${
        rank === 1 ? "text-[#FFD700]/30" : rank === 2 ? "text-gray-700" : rank === 3 ? "text-amber-900" : "text-gray-800"
      }`}>{rank}</span>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/10 flex-shrink-0" />
        <div className="space-y-1.5">
          <div className="h-3 w-24 rounded bg-white/10" />
          <div className="h-2.5 w-16 rounded bg-white/10" />
        </div>
      </div>
      <div className="w-12 flex justify-center"><div className="h-5 w-5 rounded bg-white/10" /></div>
      <div className="w-12 flex justify-center"><div className="h-4 w-4 rounded bg-white/10" /></div>
      <div className="w-16 flex justify-center"><div className="h-3 w-4 rounded bg-white/10" /></div>
    </div>
  );
}


function DuringLeaderboard({
  title, users, locale,
}: { title: string; users: LeaderUser[]; locale: string }) {
  function formatGC(n: number) {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
    if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000)         return (n / 1_000).toFixed(0) + "K";
    return String(n);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0A1628] p-5">
      <h3 className="text-base font-black text-white mb-4">{title}</h3>
      <div className="space-y-2">
        {users.slice(0, 5).map((u, i) => (
          <div key={u.user_id} className="flex items-center gap-3">
            <span className={`text-xs font-black w-5 text-center ${
              i === 0 ? "text-[#FFD700]" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-gray-600"
            }`}>{i + 1}</span>
            <div className="w-7 h-7 rounded-full overflow-hidden bg-[#FFD700]/10 flex-shrink-0">
              {u.avatar_url
                ? <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-[#FFD700]">
                    {u.username?.[0]?.toUpperCase() ?? "?"}
                  </div>
              }
            </div>
            <span className="flex-1 text-xs font-semibold text-white truncate">{u.username}</span>
            <span className="text-xs font-black text-[#FFD700]">{formatGC(u.gc_balance)} GC</span>
          </div>
        ))}
        {users.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-4">
            {locale === "zh" ? "暂无数据" : "No data yet"}
          </p>
        )}
      </div>
      <Link href={`/${locale}/leaderboard`}
        className="block text-center text-xs text-[#FFD700]/70 hover:text-[#FFD700] mt-4 transition-colors">
        {locale === "zh" ? "查看完整排行榜 →" : "View full leaderboard →"}
      </Link>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const zh = locale === "zh";
  const phase = getPhase();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  /* ── Parallel data fetches ── */
  const [
    allUpcomingResult,
    featuredResult,
    scorersResult,
    groupMatchesResult,
    wealthResult,
    recentFinishedResult,
  ] = await Promise.all([
    // 1. Upcoming + any live/paused matches (limit 8 so after filtering live out we have 4 upcoming)
    supabase
      .from("matches")
      .select("id,match_code,home_team,away_team,home_score,away_score,home_flag,away_flag,kickoff_time,venue,city,status,group_name,stage")
      .in("status", ["upcoming", "live", "paused"])
      .order("kickoff_time", { ascending: true })
      .limit(8),

    // 2. Manually curated featured matches (is_featured=true)
    supabase
      .from("matches")
      .select("id,match_code,home_team,away_team,home_score,away_score,home_flag,away_flag,kickoff_time,venue,city,status,group_name,stage")
      .eq("is_featured", true)
      .order("kickoff_time", { ascending: true })
      .limit(4),

    // 3. Top scorers
    supabase
      .from("top_scorers")
      .select("id,player_name,player_name_zh,team,photo_url,goals,assists,matches_played")
      .eq("is_visible", true)
      .order("sort_order", { ascending: true })
      .limit(5),

    // 4. All group-stage matches for standings
    supabase
      .from("matches")
      .select("home_team,away_team,home_score,away_score,group_name,status")
      .not("group_name", "is", null),

    // 5. Wealth leaderboard
    supabase
      .from("users")
      .select("id,nickname,avatar_url,gc_balance")
      .order("gc_balance", { ascending: false })
      .limit(5),

    // 6. Most recently finished match (fallback hero when nothing is live)
    supabase
      .from("matches")
      .select("id,match_code,home_team,away_team,home_score,away_score,home_flag,away_flag,kickoff_time,venue,city,status,group_name,stage")
      .eq("status", "finished")
      .order("kickoff_time", { ascending: false })
      .limit(1),
  ]);

  const allUpcoming: MatchRow[] = (allUpcomingResult.data ?? []) as MatchRow[];
  // Live match (if any) goes to the hero card — not shown in the upcoming grid
  const liveMatch: MatchRow | null =
    allUpcoming.find((m) => m.status === "live" || m.status === "paused") ?? null;
  // Upcoming grid: only truly-upcoming matches (started/live ones are excluded)
  const upcomingMatches: MatchRow[] = allUpcoming.filter((m) => m.status === "upcoming").slice(0, 4);
  // Featured: use manually curated if available, else fallback to next 4 after upcoming
  const featuredCurated: MatchRow[] = (featuredResult.data ?? []) as MatchRow[];
  const featuredMatches: MatchRow[] = featuredCurated.length > 0 ? featuredCurated : [];
  const scorers: Scorer[] = (scorersResult.data ?? []) as Scorer[];
  const groupMatches = (groupMatchesResult.data ?? []) as any[];
  const groupStandings = computeGroupStandings(groupMatches, locale);

  const wealthUsers: LeaderUser[] = ((wealthResult.data ?? []) as any[]).map((u, i) => ({
    user_id: u.id,
    username: u.nickname ?? "—",
    avatar_url: u.avatar_url,
    gc_balance: u.gc_balance ?? 0,
    rank: i + 1,
  }));

  // Hero featured match: live first, otherwise most recently finished
  const mostRecentFinished: MatchRow | null =
    (recentFinishedResult.data?.[0] as MatchRow | undefined) ?? null;
  const featuredMatch: MatchRow | null = liveMatch ?? mostRecentFinished;

  // Fan vote counts for the featured match (sequential — depends on featuredMatch)
  const featuredFanCounts = { home: 0, neutral: 0, away: 0 };
  if (featuredMatch) {
    const { data: voteRows } = await supabase
      .from("match_votes")
      .select("vote")
      .eq("match_id", featuredMatch.id);
    for (const v of (voteRows ?? []) as { vote: string }[]) {
      if (v.vote === "home")         featuredFanCounts.home++;
      else if (v.vote === "neutral") featuredFanCounts.neutral++;
      else if (v.vote === "away")    featuredFanCounts.away++;
    }
  }

  // Team accent colors for the featured match hero
  const featuredHomeColors = featuredMatch ? getTeamColor(featuredMatch.home_team) : null;
  const featuredAwayColors = featuredMatch ? getTeamColor(featuredMatch.away_team) : null;

  const totalMatches = upcomingMatches.length;

  return (
    <main className="min-h-screen bg-[#050D1E] text-white">

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      {phase === "pre" && (
        <CountdownHero
          locale={locale}
          zh={zh}
          isLoggedIn={!!user}
          totalMatches={totalMatches}
        />
      )}

      {phase === "during" && featuredMatch && featuredHomeColors && featuredAwayColors && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden mb-4">
            <div className="h-0.5 bg-gradient-to-r from-[#FFD700] via-[#FFD700]/60 to-transparent" />
            <div className="px-5 py-4">
              <MatchHero
                matchId={featuredMatch.id}
                homeTeam={featuredMatch.home_team}
                awayTeam={featuredMatch.away_team}
                homeFlag={featuredMatch.home_flag ?? "🏳️"}
                awayFlag={featuredMatch.away_flag ?? "🏳️"}
                groupName={featuredMatch.group_name}
                venue={featuredMatch.venue}
                city={featuredMatch.city}
                kickoff={featuredMatch.kickoff_time}
                homeScore={featuredMatch.home_score}
                awayScore={featuredMatch.away_score}
                status={featuredMatch.status}
                votes={featuredFanCounts}
                myVote={null}
                loggedIn={false}
                zh={zh}
                homeColors={featuredHomeColors}
                awayColors={featuredAwayColors}
                embedded
                hideVote
              />
            </div>
          </div>
          <MatchFanSection
            matchId={featuredMatch.id}
            homeTeam={featuredMatch.home_team}
            awayTeam={featuredMatch.away_team}
            homeColors={featuredHomeColors}
            awayColors={featuredAwayColors}
            zh={zh}
            loggedIn={false}
            userVote={null}
            initialVotes={featuredFanCounts}
          />
        </section>
      )}
      {phase === "during" && !featuredMatch && (
        <section className="bg-[#050D1E] border-b border-[#FFD700]/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xl font-black text-white">
                🏆 {lc(locale, "世界杯正在进行中！", "World Cup is LIVE!")}
              </span>
            </div>
            <Link href={`/${locale}/matches`}
              className="bg-[#FFD700] text-[#0A1628] font-black px-5 py-2.5 rounded-xl text-sm hover:bg-[#FFC200] transition-all">
              ⚽ {lc(locale, "立即助威", "Predict Now")}
            </Link>
          </div>
        </section>
      )}

      {phase === "post" && (
        <section className="bg-[#050D1E] border-b border-[#FFD700]/20 py-8 text-center">
          <p className="text-4xl font-black text-[#FFD700]">🏆 {lc(locale, "感谢参与 2026 世界杯助威！", "Thanks for playing Football 2026!")}</p>
          <p className="text-gray-400 mt-2 text-lg">{lc(locale, "决赛已结束，查看最终排行榜", "The final is over — check the final standings")}</p>
          <Link href={`/${locale}/leaderboard`}
            className="inline-block mt-5 bg-[#FFD700] text-[#0A1628] font-black px-8 py-3 rounded-2xl hover:bg-[#FFC200] transition-all">
            {lc(locale, "查看排行榜", "View Leaderboard")}
          </Link>
        </section>
      )}

      {/* ── Mobile App Banner (fixed bottom, client component) ──────────── */}
      <MobileAppBanner locale={locale} zh={zh} />

      {/* ── During-phase leaderboards ─────────────────────────────────── */}
      {phase === "during" && wealthUsers.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center justify-between mb-6">
            <SectionTitle en="Live Leaderboard" zh="实时排行榜" locale={locale} />
            <Link href={`/${locale}/leaderboard`}
              className="text-xs text-[#FFD700] hover:underline">
              {lc(locale, "完整榜单 →", "Full board →")}
            </Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <DuringLeaderboard
              title={lc(locale, "💰 财富榜 Top 5", "💰 Wealth Top 5")}
              users={wealthUsers}
              locale={locale}
            />
            <DuringLeaderboard
              title={lc(locale, "🏅 荣誉榜 Top 5", "🏅 Honor Top 5")}
              users={wealthUsers} // same data as fallback
              locale={locale}
            />
            <DuringLeaderboard
              title={lc(locale, "🌍 国家榜 Top 5", "🌍 Country Top 5")}
              users={wealthUsers} // same data as fallback
              locale={locale}
            />
          </div>
        </section>
      )}

      {/* ── Section 1: Upcoming Matches ──────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <SectionTitle en="⚽ Upcoming Matches" zh="⚽ 即将开赛" locale={locale} />
          <Link href={`/${locale}/matches`}
            className="text-xs text-[#FFD700] hover:underline">
            {lc(locale, "全部赛程 →", "All matches →")}
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) =>
            upcomingMatches[i]
              ? <MatchCard key={upcomingMatches[i].id} match={upcomingMatches[i]} locale={locale} />
              : <MatchCardSkeleton key={`upcoming-sk-${i}`} />
          )}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="border-t border-white/5" />
      </div>

      {/* ── Section 2: Featured Matches ──────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-6">
          <SectionTitle en="🔥 Featured Matches" zh="🔥 焦点对决" locale={locale} />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) =>
            featuredMatches[i]
              ? <MatchCard key={featuredMatches[i].id} match={featuredMatches[i]} locale={locale} />
              : <MatchCardSkeleton key={`featured-sk-${i}`} />
          )}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="border-t border-white/5" />
      </div>



      {/* ── Section 4: Top Scorers ────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <SectionTitle en="⚽ Top Scorers" zh="⚽ 射手榜 Top 5" locale={locale} />
        {scorers.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#0A1628] overflow-hidden">
            {/* Table header skeleton */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-3 border-b border-white/10 text-[11px] text-gray-500 uppercase tracking-wider">
              <span className="w-6">#</span>
              <span>{lc(locale, "球员", "Player")}</span>
              <span className="w-12 text-center">{lc(locale, "进球", "Goals")}</span>
              <span className="w-12 text-center">{lc(locale, "助攻", "Assists")}</span>
              <span className="w-16 text-center">{lc(locale, "出场", "Apps")}</span>
            </div>
            {[1, 2, 3, 4, 5].map((r) => <ScorerRowSkeleton key={r} rank={r} />)}
            <div className="px-4 py-3 text-center">
              <span className="text-[11px] text-gray-700 tracking-wide">
                {lc(locale, "赛事开始后自动更新", "Updates automatically after matches begin")}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#0A1628] overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-3 border-b border-white/10 text-[11px] text-gray-500 uppercase tracking-wider">
              <span className="w-6">#</span>
              <span>{lc(locale, "球员", "Player")}</span>
              <span className="w-12 text-center">{lc(locale, "进球", "Goals")}</span>
              <span className="w-12 text-center">{lc(locale, "助攻", "Assists")}</span>
              <span className="w-16 text-center">{lc(locale, "出场", "Apps")}</span>
            </div>
            {scorers.map((s, i) => (
              <div key={s.id}
                className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-3.5 border-b border-white/5 last:border-0 items-center hover:bg-white/[0.02] transition-colors">
                {/* Rank */}
                <span className={`w-6 text-sm font-black ${
                  i === 0 ? "text-[#FFD700]" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-gray-600"
                }`}>{i + 1}</span>
                {/* Player info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-[#FFD700]/10 flex-shrink-0 relative">
                    {s.photo_url
                      ? <img src={s.photo_url} alt={s.player_name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-sm font-black text-[#FFD700]">
                          {s.player_name[0]}
                        </div>
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {zh && s.player_name_zh ? s.player_name_zh : s.player_name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <img src={getFlagUrl(s.team)} alt={s.team} className="w-5 h-3.5 rounded-sm object-cover" />
                      <span className="text-[11px] text-gray-500 truncate">{s.team}</span>
                    </div>
                  </div>
                </div>
                {/* Goals */}
                <span className="w-12 text-center text-base font-black text-[#FFD700]">{s.goals}</span>
                {/* Assists */}
                <span className="w-12 text-center text-sm font-semibold text-gray-400">{s.assists}</span>
                {/* Appearances */}
                <span className="w-16 text-center text-xs text-gray-600">{s.matches_played}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="border-t border-white/5" />
      </div>

      {/* ── Section 5: Group Standings ───────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 pb-16">
        <SectionTitle en="📊 Group Standings" zh="📊 小组积分榜" locale={locale} />
        {groupStandings.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#0A1628] p-8 text-center">
            <p className="text-gray-600 text-sm">
              {lc(locale, "积分榜将在小组赛开始后更新", "Group standings will appear after group stage matches begin")}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupStandings.map(({ group, teams }) => (
              <div key={group} className="rounded-2xl border border-white/10 bg-[#0A1628] overflow-hidden">
                {/* Group header */}
                <div className="bg-[#FFD700]/10 border-b border-[#FFD700]/15 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-sm font-black text-[#FFD700]">
                    {zh ? `小组 ${group}` : `Group ${group}`}
                  </span>
                  <div className="flex gap-4 text-[10px] text-gray-500 uppercase tracking-wider">
                    <span className="w-5 text-center">{lc(locale, "积", "Pts")}</span>
                    <span className="w-5 text-center">{lc(locale, "赛", "P")}</span>
                    <span className="w-5 text-center">{lc(locale, "差", "GD")}</span>
                  </div>
                </div>
                {/* Teams */}
                {teams.map((t, i) => (
                  <div key={t.team}
                    className={`flex items-center px-4 py-2.5 border-b border-white/5 last:border-0 ${
                      i < 2 ? "bg-[#FFD700]/[0.02]" : ""
                    }`}>
                    {/* Rank dot */}
                    <span className={`w-1.5 h-1.5 rounded-full mr-2.5 flex-shrink-0 ${
                      i === 0 ? "bg-[#FFD700]" :
                      i === 1 ? "bg-[#FFD700]/50" :
                      "bg-gray-700"
                    }`} />
                    {/* Flag + name */}
                    <img src={getFlagUrl(t.team)} alt={t.team} className="w-6 h-4 rounded-sm object-cover mr-2 flex-shrink-0" />
                    <span className="flex-1 text-xs font-semibold text-white truncate">{getTeamDisplayName(t.team, locale)}</span>
                    {/* Stats */}
                    <div className="flex gap-4 text-xs">
                      <span className="w-5 text-center font-black text-[#FFD700]">{t.pts}</span>
                      <span className="w-5 text-center text-gray-500">{t.played}</span>
                      <span className={`w-5 text-center font-bold ${t.gd > 0 ? "text-green-400" : t.gd < 0 ? "text-red-400" : "text-gray-500"}`}>
                        {t.gd > 0 ? `+${t.gd}` : t.gd}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── How It Works ────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {
              icon: "⚽",
              en: "Predict Matches",
              zh: "预测比赛",
              descEn: "Pick the winner or score for all 48 World Cup 2026 matches and lock in your prediction before kick-off.",
              descZh: "为全部 48 场世界杯比赛预测结果，开球前锁定你的答案。",
              color: "#2B6CFF",
            },
            {
              icon: "💰",
              en: "Earn GoalCoins",
              zh: "赢取 GoalCoin",
              descEn: "Every correct prediction earns you GoalCoins. The more you predict, the more GC you stack up.",
              descZh: "每次猜对都能获得 GoalCoin 奖励。预测越多，积累越多。",
              color: "#FFD700",
            },
            {
              icon: "🏆",
              en: "Dominate the Leaderboard",
              zh: "登顶排行榜",
              descEn: "Climb the global rankings, compete with fans worldwide, and prove you know football best.",
              descZh: "冲击全球排行榜，与世界各地球迷同台竞技，证明你最懂球。",
              color: "#0E9F6E",
            },
          ].map((item) => (
            <div
              key={item.en}
              className="rounded-2xl border border-white/10 bg-[#0A1628] p-6 flex flex-col gap-4 hover:border-white/20 transition-colors"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: item.color + "18" }}
              >
                {item.icon}
              </div>
              <div>
                <h3 className="text-base font-black text-white mb-1.5">
                  {zh ? item.zh : item.en}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {zh ? item.descZh : item.descEn}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-[#030912] px-4 py-10 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs leading-6 text-gray-600">
            {lc(locale, "GoalCoin (GC) 是 Football2026 平台内的娱乐虚拟积分，不可提现或兑换真实货币。平台仅供娱乐，18+。", "GoalCoin (GC) is a virtual entertainment currency on Football2026. It cannot be withdrawn or exchanged for real money. Entertainment only. 18+.")}
          </p>
          <p className="text-xs text-gray-700 mt-3">
            {lc(locale, "© 2026 Football2026. 保留所有权利。", "© 2026 Football2026. All rights reserved.")}
          </p>
          <div className="flex justify-center gap-6 mt-5 text-xs text-gray-600">
            <Link href={`/${locale}/matches`} className="hover:text-gray-400 transition-colors">
              {lc(locale, "赛程", "Matches")}
            </Link>
            <Link href={`/${locale}/leaderboard`} className="hover:text-gray-400 transition-colors">
              {lc(locale, "排行榜", "Leaderboard")}
            </Link>
            <Link href={`/${locale}/forum`} className="hover:text-gray-400 transition-colors">
              {lc(locale, "论坛", "Forum")}
            </Link>
            <Link href={`/${locale}/profile`} className="hover:text-gray-400 transition-colors">
              {lc(locale, "个人中心", "Profile")}
            </Link>
          </div>
        </div>
      </footer>

    </main>
  );
}
