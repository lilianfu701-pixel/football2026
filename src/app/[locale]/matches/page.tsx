import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { getFlagUrl, isTBD } from "@/lib/flags";
import TeamFilter from "./TeamFilter";

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
};

// City → country abbreviation
const CITY_COUNTRY: Record<string, string> = {
  "Mexico City": "MEX", "Guadalajara": "MEX", "Monterrey": "MEX",
  "New York": "USA", "Los Angeles": "USA", "Dallas": "USA",
  "Houston": "USA", "Atlanta": "USA", "Seattle": "USA",
  "Philadelphia": "USA", "Miami": "USA", "Kansas City": "USA",
  "Santa Clara": "USA", "Boston": "USA",
  "Toronto": "CAN", "Vancouver": "CAN",
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

function formatMatchDate(dateStr: string, locale: string) {
  const d = new Date(dateStr);
  const lang = locale === "zh" ? "zh-CN" : "en-US";
  return {
    dateLabel: d.toLocaleDateString(lang, { weekday: "long", month: "long", day: "numeric" }),
    time: d.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit", timeZoneName: "short" }),
  };
}

const STAGE_KEYS: Record<string, string> = {
  group: "group", round32: "round32", round16: "round16",
  quarter: "quarter", semi: "semi", third: "third", final: "final",
};

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

  // Group by date
  const matchesByDate: Record<string, Match[]> = {};
  (matches ?? []).forEach((m) => {
    const lang = locale === "zh" ? "zh-CN" : "en-US";
    const dateKey = new Date(m.kickoff_time).toLocaleDateString(lang, {
      weekday: "long", month: "long", day: "numeric",
    });
    if (!matchesByDate[dateKey]) matchesByDate[dateKey] = [];
    matchesByDate[dateKey].push(m);
  });

  const { data: predCounts } = await supabase.from("bets").select("match_id");
  const totalPredictions = predCounts?.length ?? 0;

  const { data: upcomingMatches } = await supabase
    .from("matches")
    .select("id, home_team, away_team, kickoff_time, group_name, stage, match_number")
    .eq("status", "upcoming")
    .order("kickoff_time", { ascending: true })
    .limit(4);

  const stages = ["group", "round32", "round16", "quarter", "semi", "third", "final"];

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-16">
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <div className="flex gap-6">

          {/* ── Main Content ── */}
          <div className="flex-1 min-w-0">

            {/* Header */}
            <div className="mb-5">
              <h1 className="text-2xl font-black text-white">⚽ {t("title")}</h1>
              <p className="text-gray-500 text-sm mt-0.5">{t("subtitle")}</p>
            </div>

            {/* Stage Tabs + Team Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
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
              {/* Divider */}
              <div className="h-6 w-px bg-[#1E3A5F] shrink-0 mx-1" />
              {/* Team Filter — always visible after Final tab */}
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
                    ? `正在显示：${selectedTeams.join("、")} 的赛事`
                    : `Showing: ${selectedTeams.join(", ")} matches`}
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
                        const { time } = formatMatchDate(match.kickoff_time, locale);
                        const isFinished = match.status === "finished";
                        const isLive = match.status === "live";
                        const countdown = !isFinished && !isLive ? getCountdown(match.kickoff_time, locale) : "";
                        const countryCode = match.city ? CITY_COUNTRY[match.city] : null;

                        return (
                          <Link
                            key={match.id}
                            href={`/${locale}/matches/${match.id}`}
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
                                <p className="text-white font-bold text-sm text-center leading-tight">{match.home_team}</p>
                              </div>

                              {/* Center */}
                              <div className="px-2 text-center shrink-0 min-w-[80px]">
                                {isFinished || isLive ? (
                                  <div className="flex items-center gap-2 justify-center">
                                    <span className="text-2xl font-black text-white">{match.home_score ?? 0}</span>
                                    <span className="text-gray-600 font-bold">:</span>
                                    <span className="text-2xl font-black text-white">{match.away_score ?? 0}</span>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-[#FFD700] font-black text-xl">{tMatch("vs")}</p>
                                    {/* City \ Country */}
                                    <p className="text-gray-600 text-xs mt-0.5">
                                      {match.city}{countryCode ? ` \\ ${countryCode}` : ""}
                                    </p>
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
                                <p className="text-white font-bold text-sm text-center leading-tight">{match.away_team}</p>
                              </div>
                            </div>

                            {/* Bottom row */}
                            {!isFinished && (
                              <div className="mt-3 pt-3 border-t border-[#1E3A5F] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {match.venue && (
                                    <p className="text-xs text-gray-600 truncate">📍 {match.venue}</p>
                                  )}
                                  {countdown && (
                                    <span className="text-xs text-orange-400/80 font-medium shrink-0">⏱ {countdown}</span>
                                  )}
                                </div>
                                <span className="text-xs text-[#FFD700] font-semibold shrink-0 group-hover:underline">
                                  {t("predict_cta")}
                                </span>
                              </div>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Right Sidebar ── */}
          <div className="hidden lg:flex flex-col gap-4 w-72 shrink-0">

            {/* World Cup Info */}
            <div className="bg-gradient-to-br from-[#FFD700]/20 to-[#FF6B00]/10 border border-[#FFD700]/30 rounded-2xl p-5">
              <p className="text-xs text-[#FFD700] font-bold uppercase tracking-widest mb-2">FIFA World Cup 2026</p>
              <p className="text-white font-black text-lg leading-tight">{t("wc_dates")}</p>
              <p className="text-gray-400 text-xs mt-1">{t("wc_hosts")}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="text-white font-bold text-sm">{t("teams_count")}</p>
                  <p className="text-gray-500 text-xs">{t("matches_total")}</p>
                </div>
              </div>
            </div>

            {/* Platform Stats */}
            <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-3">📊 {t("platform_stats")}</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">{t("total_predictions")}</span>
                  <span className="text-sm font-black text-[#FFD700]">{totalPredictions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">{t("matches_available")}</span>
                  <span className="text-sm font-black text-white">72</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">{t("groups_label")}</span>
                  <span className="text-sm font-black text-white">A – L</span>
                </div>
              </div>
              <Link
                href={`/${locale}/matches`}
                className="mt-4 block w-full text-center bg-[#FFD700] text-[#0A1628] font-bold py-2.5 rounded-xl text-sm hover:bg-[#FFC200] transition-colors"
              >
                {t("start_predicting")}
              </Link>
            </div>

            {/* Next Matches */}
            {upcomingMatches && upcomingMatches.length > 0 && (
              <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-3">📅 {t("next_matches")}</h3>
                <div className="space-y-3">
                  {upcomingMatches.map((m) => {
                    const d = new Date(m.kickoff_time);
                    const lang = locale === "zh" ? "zh-CN" : "en-US";
                    const dateStr = d.toLocaleDateString(lang, { month: "short", day: "numeric" });
                    return (
                      <Link key={m.id} href={`/${locale}/matches/${m.id}`} className="block">
                        <div className="flex items-center justify-between gap-2 hover:opacity-80 transition-opacity">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {!isTBD(m.home_team) && (
                              <div className="w-6 h-4 relative overflow-hidden rounded-sm shrink-0">
                                <Image src={getFlagUrl(m.home_team, 40)} alt={m.home_team} fill className="object-cover" unoptimized />
                              </div>
                            )}
                            <span className="text-xs text-gray-300 font-medium truncate">{m.home_team}</span>
                          </div>
                          <span className="text-xs text-gray-600 shrink-0 px-1">vs</span>
                          <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
                            <span className="text-xs text-gray-300 font-medium truncate text-right">{m.away_team}</span>
                            {!isTBD(m.away_team) && (
                              <div className="w-6 h-4 relative overflow-hidden rounded-sm shrink-0">
                                <Image src={getFlagUrl(m.away_team, 40)} alt={m.away_team} fill className="object-cover" unoptimized />
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5 text-center">
                          {m.match_number && <span className="mr-1">{m.match_number}</span>}
                          {dateStr}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Groups Quick Nav */}
            <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-3">🗂 {t("groups_nav")}</h3>
              <div className="grid grid-cols-4 gap-1.5">
                {["A","B","C","D","E","F","G","H","I","J","K","L"].map((g) => (
                  <Link
                    key={g}
                    href={`/${locale}/matches?stage=group&group=${g.toLowerCase()}`}
                    className="flex items-center justify-center h-8 rounded-lg bg-[#0A1628] border border-[#1E3A5F] text-xs font-bold text-gray-400 hover:border-[#FFD700]/50 hover:text-[#FFD700] transition-colors"
                  >
                    {g}
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
