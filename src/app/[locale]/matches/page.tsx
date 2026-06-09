import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { getFlagUrl, isTBD, getTeamDisplayName } from "@/lib/flags";
import { getH2H } from "@/data/h2h";
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

// City → country abbreviation
const CITY_COUNTRY: Record<string, string> = {
  "Mexico City": "MEX", "Guadalajara": "MEX", "Monterrey": "MEX",
  "New York": "USA", "Los Angeles": "USA", "Dallas": "USA",
  "Houston": "USA", "Atlanta": "USA", "Seattle": "USA",
  "Philadelphia": "USA", "Miami": "USA", "Kansas City": "USA",
  "Santa Clara": "USA", "San Francisco": "USA", "Boston": "USA",
  "Toronto": "CAN", "Vancouver": "CAN",
};

// Country abbreviation → localized label
const COUNTRY_LABEL: Record<string, Record<string, string>> = {
  zh: { "USA": "美国",            "MEX": "墨西哥",       "CAN": "加拿大" },
  en: { "USA": "USA",             "MEX": "Mexico",       "CAN": "Canada" },
  es: { "USA": "EE. UU.",         "MEX": "México",       "CAN": "Canadá" },
  fr: { "USA": "États-Unis",      "MEX": "Mexique",      "CAN": "Canada" },
  de: { "USA": "USA",             "MEX": "Mexiko",       "CAN": "Kanada" },
  pt: { "USA": "EUA",             "MEX": "México",       "CAN": "Canadá" },
  ru: { "USA": "США",             "MEX": "Мексика",      "CAN": "Канада" },
  ar: { "USA": "الولايات المتحدة","MEX": "المكسيك",     "CAN": "كندا" },
  ja: { "USA": "アメリカ",         "MEX": "メキシコ",     "CAN": "カナダ" },
  ko: { "USA": "미국",             "MEX": "멕시코",       "CAN": "캐나다" },
  vi: { "USA": "Mỹ",              "MEX": "México",       "CAN": "Canada" },
  id: { "USA": "Amerika Serikat", "MEX": "Meksiko",      "CAN": "Kanada" },
};

// City → Chinese name
const CITY_ZH: Record<string, string> = {
  "Mexico City": "墨西哥城", "Guadalajara": "瓜达拉哈拉", "Monterrey": "蒙特雷",
  "New York": "纽约", "Los Angeles": "洛杉矶", "Dallas": "达拉斯",
  "Houston": "休斯顿", "Atlanta": "亚特兰大", "Seattle": "西雅图",
  "Philadelphia": "费城", "Miami": "迈阿密", "Kansas City": "堪萨斯城",
  "Santa Clara": "圣克拉拉", "San Francisco": "旧金山", "Boston": "波士顿",
  "Toronto": "多伦多", "Vancouver": "温哥华",
};

// Venue → Chinese name
const VENUE_ZH: Record<string, string> = {
  "Estadio Azteca":     "阿兹特克体育场",
  "SoFi Stadium":       "苏菲体育场",
  "MetLife Stadium":    "大都会人寿体育场",
  "AT&T Stadium":       "AT&T球场",
  "Rose Bowl":          "玫瑰碗体育场",
  "BMO Field":          "BMO球场",
  "Hard Rock Stadium":  "硬石体育场",
  "Arrowhead Stadium":  "箭头体育场",
  "Gillette Stadium":   "吉列体育场",
  "Levi's Stadium":     "李维斯体育场",
  "Lincoln Financial":  "林肯金融球场",
  "BC Place":           "BC广场",
  "Estadio Akron":      "阿克伦体育场",
  "Estadio BBVA":       "BBVA体育场",
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
  const d    = new Date(dateStr);
  const lang = locale === "zh" ? "zh-CN" : "en-US";
  const hh   = String(d.getHours()).padStart(2, "0");
  const mm   = String(d.getMinutes()).padStart(2, "0");

  let cardLabel: string;
  if (locale === "zh") {
    const ZH_DAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    cardLabel = `当地时间 ${d.getMonth() + 1}月${d.getDate()}日${ZH_DAYS[d.getDay()]} ${hh}:${mm}`;
  } else {
    const EN_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const EN_DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    cardLabel = `Local ${EN_MONTHS[d.getMonth()]} ${d.getDate()} ${EN_DAYS[d.getDay()]} ${hh}:${mm}`;
  }

  return {
    dateLabel: d.toLocaleDateString(lang, { weekday: "long", month: "long", day: "numeric" }),
    time: cardLabel,
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
                        const { time } = formatMatchDate(match.kickoff_time, locale);
                        const isFinished = match.status === "finished";
                        const isLive = match.status === "live";
                        const countdown = !isFinished && !isLive ? getCountdown(match.kickoff_time, locale) : "";
                        const h2h = (!isTBD(match.home_team) && !isTBD(match.away_team))
                          ? getH2H(match.home_team, match.away_team)
                          : null;

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

                              {/* Center — vs / score · location */}
                              <div className="px-2 text-center shrink-0 flex flex-col items-center justify-center gap-1">
                                {isFinished || isLive ? (
                                  <div className="flex items-center gap-2 justify-center">
                                    <span className="text-2xl font-black text-white">{match.home_score ?? 0}</span>
                                    <span className="text-gray-600 font-bold">:</span>
                                    <span className="text-2xl font-black text-white">{match.away_score ?? 0}</span>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-[#FFD700] font-black text-lg tracking-wider leading-none">VS</p>
                                    {/* City \ country */}
                                    {match.city && (
                                      <p className="text-xs leading-snug text-center whitespace-nowrap">
                                        <span className="text-gray-200 font-semibold">
                                          {locale === "zh" ? (CITY_ZH[match.city] ?? match.city) : match.city}
                                        </span>
                                        {match.city && CITY_COUNTRY[match.city] && (
                                          <span className="text-gray-500 font-normal">
                                            {" "}\{" "}{COUNTRY_LABEL[locale]?.[CITY_COUNTRY[match.city]] ?? CITY_COUNTRY[match.city]}
                                          </span>
                                        )}
                                      </p>
                                    )}
                                    {/* Venue */}
                                    {match.venue && (
                                      <p className="text-[11px] text-[#5B8DB8] font-normal leading-tight text-center whitespace-nowrap">
                                        {locale === "zh" ? (VENUE_ZH[match.venue] ?? match.venue) : match.venue}
                                      </p>
                                    )}
                                  </>
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

                            {/* ── H2H row — below teams ── */}
                            {!isFinished && !isLive && !isTBD(match.home_team) && !isTBD(match.away_team) && h2h && h2h.total > 0 && (
                              <div className="relative flex items-center justify-between gap-2 mt-2">
                                {/* Label: absolute so it doesn't affect flex column widths */}
                                <span className="absolute left-3 text-[10px] text-gray-500 font-medium whitespace-nowrap">
                                  ⚔ {locale === "zh" ? "交战历史" : "H2H"}
                                </span>
                                {/* Home wins: flex-1 — same width as home team column */}
                                <div className="flex-1 text-center">
                                  <span className="text-xs font-black text-[#FFD700]">
                                    {h2h.homeWins}{locale === "zh" ? "胜" : "W"}
                                  </span>
                                </div>
                                {/* Draws: px-10 widens center col to match VS+city column */}
                                <div className="px-10 shrink-0 text-center">
                                  <span className="text-xs font-black text-gray-400">
                                    {h2h.draws}{locale === "zh" ? "平" : "D"}
                                  </span>
                                </div>
                                {/* Away wins: flex-1 — same width as away team column */}
                                <div className="flex-1 text-center">
                                  <span className="text-xs font-black text-purple-400">
                                    {h2h.awayWins}{locale === "zh" ? "胜" : "W"}
                                  </span>
                                </div>
                              </div>
                            )}

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
