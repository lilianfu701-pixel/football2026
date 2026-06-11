import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { getFlagUrl, isTBD, getTeamDisplayName } from "@/lib/flags";
import TeamFilter from "./TeamFilter";
import MatchFollowButton from "@/components/matches/MatchFollowButton";

interface MatchesPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ stage?: string; group?: string; teams?: string }>;
}

type Match = {
  id: number;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  kickoff_time: string;
  status: string;
  stage: string;
  group_name: string | null;
  venue: string | null;
  city: string | null;
  match_number: string | null;
  odds_home: number | null;
  odds_draw: number | null;
  odds_away: number | null;
};


function getCountdown(kickoffStr: string, locale: string): string {
  const now = new Date();
  const kickoff = new Date(kickoffStr);
  const diffMs = kickoff.getTime() - now.getTime();
  if (diffMs <= 0) return "";
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffDays >= 1) {
    return locale === "zh" ? `距开赛${diffDays}天` : `In ${diffDays}d`;
  }
  if (diffHours >= 1) {
    return locale === "zh" ? `距开赛${diffHours}小时` : `In ${diffHours}h`;
  }
  return locale === "zh" ? "即将开赛" : "Soon";
}


// Venue UTC offsets — summer 2026 (DST in effect for all North American cities)
const CITY_OFFSET: Record<string, number> = {
  // CDT = UTC−5
  "Mexico City": -5, "Guadalajara": -5, "Monterrey": -5,
  "Dallas": -5, "Houston": -5, "Kansas City": -5,
  // EDT = UTC−4
  "New York": -4, "Philadelphia": -4, "Miami": -4,
  "Atlanta": -4, "Boston": -4, "Toronto": -4,
  // PDT = UTC−7
  "Los Angeles": -7, "Santa Clara": -7, "San Francisco": -7,
  "Seattle": -7, "Vancouver": -7,
};

// Returns a Date shifted to venue local time; use getUTC* methods on the result
function getVenueDate(kickoffStr: string, city?: string | null): Date {
  const offsetHours = city ? (CITY_OFFSET[city] ?? 0) : 0;
  return new Date(new Date(kickoffStr).getTime() + offsetHours * 60 * 60 * 1000);
}

function formatMatchTime(kickoffStr: string, city?: string | null): string {
  const d  = getVenueDate(kickoffStr, city);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}


export default async function MatchesPage({ params, searchParams }: MatchesPageProps) {
  const { locale } = await params;
  const { stage = "group", group, teams: teamsParam = "" } = await searchParams;
  const selectedTeams = teamsParam ? teamsParam.split(",").filter(Boolean) : [];
  const t = await getTranslations({ locale, namespace: "matches" });
  const tMatch = await getTranslations({ locale, namespace: "match" });

  const STAGE_LABELS: Record<string, string> = {
    group: tMatch("group"), round32: tMatch("round32"), round16: tMatch("round16"),
    quarter: tMatch("quarter"), semi: tMatch("semi"), third: tMatch("third"), final: tMatch("final"),
  };

  const supabase = await createClient();

  let query = supabase
    .from("matches")
    .select("*")
    .order("kickoff_time", { ascending: true });

  if (selectedTeams.length > 0) {
    // Team filter: search across ALL stages, ignore current stage tab
    const teamList = selectedTeams.map((t) => `"${t}"`).join(",");
    query = query.or(`home_team.in.(${teamList}),away_team.in.(${teamList})`);
  } else {
    // No team filter: apply stage + optional group filter
    query = query.eq("stage", stage);
    if (stage === "group" && group) {
      query = query.eq("group_name", group.toUpperCase());
    }
  }

  const { data: matches } = await query;

  const { data: groupData } = await supabase
    .from("matches")
    .select("group_name")
    .eq("stage", "group")
    .not("group_name", "is", null);

  const availableGroups = [...new Set(groupData?.map((m) => m.group_name))].sort() as string[];

  // Fetch all unique teams for search dropdown
  const { data: teamsData } = await supabase
    .from("matches")
    .select("home_team, away_team")
    .eq("stage", "group");

  const allTeams = [...new Set([
    ...(teamsData?.map((m) => m.home_team) ?? []),
    ...(teamsData?.map((m) => m.away_team) ?? []),
  ])].filter((t) => !isTBD(t)).sort() as string[];

  // Group by venue-local date
  const matchesByDate: Record<string, Match[]> = {};
  (matches ?? []).forEach((m) => {
    const venueDate = getVenueDate(m.kickoff_time, m.city);
    const lang = locale === "zh" ? "zh-CN" : "en-US";
    // venueDate is already offset; read calendar fields via UTC methods
    const dateKey = venueDate.toLocaleDateString(lang, {
      weekday: "long", month: "long", day: "numeric",
      timeZone: "UTC",
    });
    if (!matchesByDate[dateKey]) matchesByDate[dateKey] = [];
    matchesByDate[dateKey].push(m);
  });

  const stages = ["group", "round32", "round16", "quarter", "semi", "third", "final"];

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-16">
      <div className="pt-8">

            {/* Header */}
            <div className="mb-5">
              <h1 className="text-2xl font-black text-white">⚽ {t("title")}</h1>
              <p className="text-gray-500 text-sm mt-0.5">{t("subtitle")}</p>
            </div>

            {/* Stage Tabs + Team Filter */}
            <div className="flex items-center gap-2 mb-4">
              {/* Scrollable stage tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-0 scrollbar-hide flex-1 min-w-0">
                {stages.map((s) => (
                  <Link
                    key={s}
                    href={`/${locale}/matches?stage=${s}`}
                    className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      stage === s
                        ? "bg-[#FFD700] text-[#0A1628]"
                        : "bg-[#0F2040] border border-[#1E3A5F] text-gray-400 hover:text-white"
                    }`}
                  >
                    {STAGE_LABELS[s]}
                  </Link>
                ))}
              </div>
              {/* Divider */}
              <div className="h-6 w-px bg-[#1E3A5F] shrink-0 mx-1" />
              {/* Team Filter — outside overflow container so dropdown is never clipped */}
              <Suspense fallback={<div className="h-10 w-40 bg-[#0F2040] rounded-xl animate-pulse shrink-0" />}>
                <TeamFilter
                  teams={allTeams}
                  selectedTeams={selectedTeams}
                  locale={locale}
                />
              </Suspense>
            </div>

            {/* Active team filter badge */}
            {selectedTeams.length > 0 && (
              <div className="mb-2">
                <span className="text-xs text-orange-400 bg-orange-400/10 px-3 py-1.5 rounded-lg font-medium">
                  {locale === "zh"
                    ? `正在显示：${selectedTeams.map((t) => getTeamDisplayName(t, locale)).join("、")} 的赛事`
                    : `Showing: ${selectedTeams.map((t) => getTeamDisplayName(t, locale)).join(", ")} matches`}
                </span>
              </div>
            )}

            {/* Group Filter */}
            {stage === "group" && selectedTeams.length === 0 && availableGroups.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
                <Link
                  href={`/${locale}/matches?stage=group`}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    !group ? "bg-[#1E3A5F] text-white" : "text-gray-500 hover:text-white"
                  }`}
                >
                  {t("all_groups")}
                </Link>
                {availableGroups.map((g) => (
                  <Link
                    key={g}
                    href={`/${locale}/matches?stage=group&group=${g.toLowerCase()}`}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      group?.toUpperCase() === g
                        ? "bg-[#1E3A5F] text-white border border-[#FFD700]/50"
                        : "text-gray-500 hover:text-white"
                    }`}
                  >
                    {locale === "zh" ? `${g}组` : `Group ${g}`}
                  </Link>
                ))}
              </div>
            )}

            {/* Match List */}
            {Object.keys(matchesByDate).length === 0 ? (
              <div className="text-center py-20 text-gray-600">
                <div className="text-5xl mb-4">📅</div>
                <p>{t("no_matches")}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(matchesByDate).map(([dateLabel, dayMatches]) => (
                  <div key={dateLabel}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-px flex-1 bg-[#1E3A5F]" />
                      <span className="text-xs text-gray-500 font-medium tracking-wide">{dateLabel}</span>
                      <div className="h-px flex-1 bg-[#1E3A5F]" />
                    </div>

                    <div className="space-y-3">
                      {dayMatches.map((match) => {
                        const time = formatMatchTime(match.kickoff_time, match.city);
                        const isFinished = match.status === "finished";
                        const isLive = match.status === "live";
                        const countdown = !isFinished && !isLive ? getCountdown(match.kickoff_time, locale) : "";

                        return (
                          <Link
                            key={match.id}
                            href={`/${locale}/matches/${match.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-4 hover:border-[#FFD700]/40 transition-all group"
                          >
                            {/* Top row */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-[#FFD700]">
                                  {match.group_name
                                    ? (locale === "zh" ? `${match.group_name}组` : `Group ${match.group_name}`)
                                    : STAGE_LABELS[match.stage]}
                                </span>
                                {match.match_number && (
                                  <span className="text-xs text-gray-600 font-medium">{match.match_number}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Status badge */}
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                                  isLive ? "text-green-400 bg-green-400/10 animate-pulse" :
                                  isFinished ? "text-gray-500 bg-gray-500/10" :
                                  "text-blue-400 bg-blue-400/10"
                                }`}>
                                  {isLive ? `🔴 ${tMatch("live")}` : isFinished ? tMatch("finished") : time}
                                </span>
                              </div>
                            </div>

                            {/* Teams */}
                            <div className="flex items-center justify-between gap-2">
                              {/* Home */}
                              <div className="flex-1 flex flex-col items-center gap-2">
                                {isTBD(match.home_team) ? (
                                  <div className="w-12 h-8 rounded-sm bg-[#1E3A5F] flex items-center justify-center">
                                    <span className="text-gray-500 text-xs font-bold">TBD</span>
                                  </div>
                                ) : (
                                  <div className="w-12 h-8 relative overflow-hidden rounded-sm shadow">
                                    <Image src={getFlagUrl(match.home_team, 80)} alt={match.home_team} fill className="object-cover" unoptimized />
                                  </div>
                                )}
                                <p className="text-white font-bold text-sm text-center leading-tight">{getTeamDisplayName(match.home_team, locale)}</p>
                              </div>

                              {/* Center — score for finished/live, blank for upcoming */}
                              <div className="px-4 text-center shrink-0 flex items-center justify-center">
                                {(isFinished || isLive) && (
                                  <div className="flex items-center gap-2 justify-center">
                                    <span className="text-2xl font-black text-white">{match.home_score ?? 0}</span>
                                    <span className="text-gray-600 font-bold">:</span>
                                    <span className="text-2xl font-black text-white">{match.away_score ?? 0}</span>
                                  </div>
                                )}
                              </div>

                              {/* Away */}
                              <div className="flex-1 flex flex-col items-center gap-2">
                                {isTBD(match.away_team) ? (
                                  <div className="w-12 h-8 rounded-sm bg-[#1E3A5F] flex items-center justify-center">
                                    <span className="text-gray-500 text-xs font-bold">TBD</span>
                                  </div>
                                ) : (
                                  <div className="w-12 h-8 relative overflow-hidden rounded-sm shadow">
                                    <Image src={getFlagUrl(match.away_team, 80)} alt={match.away_team} fill className="object-cover" unoptimized />
                                  </div>
                                )}
                                <p className="text-white font-bold text-sm text-center leading-tight">{getTeamDisplayName(match.away_team, locale)}</p>
                              </div>
                            </div>


                            {/* Bottom row */}
                            <div className="mt-2 pt-1.5 border-t border-[#1E3A5F] flex items-center justify-between gap-2">
                              {/* Left: countdown */}
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {countdown && (
                                  <span className="text-xs text-orange-400/80 font-medium shrink-0">⏱ {countdown}</span>
                                )}
                                {isFinished && (
                                  <span className="text-xs text-gray-500 font-medium">
                                    {locale === "zh" ? "已结束" : "Full Time"}
                                  </span>
                                )}
                              </div>
                              {/* Right: buttons */}
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-[#FFD700] font-semibold group-hover:underline">
                                  {locale === "zh" ? "比赛详情 →" : "Details →"}
                                </span>
                                <MatchFollowButton
                                  matchId={match.id}
                                  initialFollowing={false}
                                  homeTeam={getTeamDisplayName(match.home_team, locale)}
                                  awayTeam={getTeamDisplayName(match.away_team, locale)}
                                  zh={locale === "zh"}
                                />
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
      </div>
    </div>
  );
}
