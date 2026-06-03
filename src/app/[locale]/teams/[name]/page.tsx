import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getFlagUrl, getTeamDisplayName, isTBD } from "@/lib/flags";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ locale: string; name: string }>;
}

interface MatchRow {
  id:           number;
  home_team:    string;
  away_team:    string;
  home_score:   number | null;
  away_score:   number | null;
  kickoff_time: string;
  status:       string;
  stage:        string;
  group_name:   string | null;
  venue:        string | null;
  city:         string | null;
}

interface Standing {
  team: string;
  P: number; W: number; D: number; L: number;
  GF: number; GA: number; GD: number; Pts: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, Record<string, string>> = {
  zh: { group: "小组赛", round32: "32强", round16: "16强", quarter: "八强", semi: "四强", third: "三四名", final: "决赛" },
  en: { group: "Group",  round32: "R32",  round16: "R16",  quarter: "QF",   semi: "SF",   third: "3rd",    final: "Final" },
};

function computeStandings(matches: MatchRow[]): Standing[] {
  const map: Record<string, Standing> = {};
  for (const m of matches) {
    if (!map[m.home_team]) map[m.home_team] = { team: m.home_team, P:0,W:0,D:0,L:0,GF:0,GA:0,GD:0,Pts:0 };
    if (!map[m.away_team]) map[m.away_team] = { team: m.away_team, P:0,W:0,D:0,L:0,GF:0,GA:0,GD:0,Pts:0 };
    if (m.status !== "finished" || m.home_score == null || m.away_score == null) continue;
    const hs = m.home_score, as_ = m.away_score;
    map[m.home_team].P++; map[m.away_team].P++;
    map[m.home_team].GF += hs; map[m.home_team].GA += as_;
    map[m.away_team].GF += as_; map[m.away_team].GA += hs;
    if (hs > as_) { map[m.home_team].W++; map[m.home_team].Pts += 3; map[m.away_team].L++; }
    else if (hs < as_) { map[m.away_team].W++; map[m.away_team].Pts += 3; map[m.home_team].L++; }
    else { map[m.home_team].D++; map[m.away_team].D++; map[m.home_team].Pts++; map[m.away_team].Pts++; }
  }
  const rows = Object.values(map);
  for (const r of rows) r.GD = r.GF - r.GA;
  return rows.sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF);
}

function formatKickoff(dateStr: string, locale: string): string {
  const d = new Date(dateStr);
  const lang = locale === "zh" ? "zh-CN" : "en-US";
  return d.toLocaleDateString(lang, { month: "short", day: "numeric" }) +
    " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

function ordinal(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, name } = await params;
  const teamName = decodeURIComponent(name);
  const zh = locale === "zh";
  const displayName = getTeamDisplayName(teamName, locale);
  return {
    title: `${displayName} | Football2026`,
    description: zh
      ? `${displayName} 在 2026 FIFA 世界杯的赛程、积分和预测数据。`
      : `${displayName}'s schedule, standings, and stats at the 2026 FIFA World Cup.`,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TeamPage({ params }: Props) {
  const { locale, name } = await params;
  const zh = locale === "zh";
  const teamName = decodeURIComponent(name);
  const supabase = await createClient();

  // Fetch all matches for this team
  const { data: rawMatches } = await supabase
    .from("matches")
    .select("id, home_team, away_team, home_score, away_score, kickoff_time, status, stage, group_name, venue, city")
    .or(`home_team.eq.${teamName},away_team.eq.${teamName}`)
    .order("kickoff_time", { ascending: true });

  const matches = (rawMatches ?? []) as MatchRow[];
  if (matches.length === 0) notFound();

  const groupName = matches.find((m) => m.stage === "group")?.group_name ?? null;
  const displayName = getTeamDisplayName(teamName, locale);
  const flagUrl = getFlagUrl(teamName, 160);

  // Fetch group standings if applicable
  let standings: Standing[] = [];
  if (groupName) {
    const { data: grpData } = await supabase
      .from("matches")
      .select("id, home_team, away_team, home_score, away_score, kickoff_time, status, stage, group_name, venue, city")
      .eq("group_name", groupName)
      .eq("stage", "group");
    standings = computeStandings((grpData ?? []) as MatchRow[]);
  }

  const teamRank  = standings.findIndex((s) => s.team === teamName) + 1; // 0 if not found
  const teamStats = standings.find((s) => s.team === teamName);

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20 pt-8 space-y-6">

      {/* Breadcrumb */}
      <nav className="text-xs text-gray-500 flex items-center gap-1">
        <Link href={`/${locale}/schedule`} className="hover:text-[#FFD700] transition-colors">
          {zh ? "赛程" : "Schedule"}
        </Link>
        <span>/</span>
        <span className="text-gray-400">{displayName}</span>
      </nav>

      {/* ── Team header ── */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-6">
        <div className="flex items-center gap-5 mb-4">
          {flagUrl ? (
            <div className="w-24 h-16 relative overflow-hidden rounded-xl shadow-lg shrink-0">
              <Image src={flagUrl} alt={teamName} fill className="object-cover" unoptimized />
            </div>
          ) : null}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-black text-white">{displayName}</h1>
            {groupName && (
              <p className="text-sm text-gray-400 mt-1">
                {zh ? `${groupName}组` : `Group ${groupName}`}
                {teamRank > 0 && (
                  <span className={`ml-2 font-bold ${teamRank <= 2 ? "text-green-400" : "text-gray-500"}`}>
                    {"· "}
                    {zh ? `第${teamRank}名` : ordinal(teamRank)}
                    {teamRank <= 2 ? (zh ? " 出线" : " Q") : ""}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Stats bar */}
        {teamStats && teamStats.P > 0 && (
          <div className="flex flex-wrap gap-5 pt-4 border-t border-[#1E3A5F]">
            {[
              { label: zh ? "场次" : "P",    val: String(teamStats.P),  color: "text-white" },
              { label: zh ? "胜" : "W",      val: String(teamStats.W),  color: "text-green-400" },
              { label: zh ? "平" : "D",      val: String(teamStats.D),  color: "text-gray-400" },
              { label: zh ? "负" : "L",      val: String(teamStats.L),  color: "text-red-400" },
              { label: zh ? "进球" : "GF",   val: String(teamStats.GF), color: "text-[#FFD700]" },
              { label: zh ? "失球" : "GA",   val: String(teamStats.GA), color: "text-gray-500" },
              { label: zh ? "净胜球" : "GD", val: (teamStats.GD >= 0 ? "+" : "") + teamStats.GD, color: teamStats.GD >= 0 ? "text-blue-400" : "text-red-400" },
              { label: zh ? "积分" : "Pts",  val: String(teamStats.Pts), color: "text-[#FFD700]" },
            ].map(({ label, val, color }) => (
              <div key={label} className="text-center">
                <p className={`text-xl font-black ${color}`}>{val}</p>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Group standings ── */}
      {standings.length > 0 && (
        <section>
          <h2 className="text-sm font-black text-white mb-3">
            📊 {zh ? `${groupName}组积分榜` : `Group ${groupName} Standings`}
          </h2>
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1E3A5F]">
                  {["#", zh ? "球队" : "Team", "P", "W", "D", "L", "GD", "Pts"].map((h, i) => (
                    <th key={i} className={`px-3 py-2.5 text-gray-500 font-medium ${i <= 1 ? "text-left" : "text-center"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {standings.map((s, i) => {
                  const isThis = s.team === teamName;
                  const q      = i < 2;
                  const sflag  = getFlagUrl(s.team, 40);
                  const gdStr  = (s.GD > 0 ? "+" : "") + s.GD;
                  return (
                    <tr
                      key={s.team}
                      className={`border-b border-[#1E3A5F]/40 ${isThis ? "bg-[#FFD700]/8" : ""}`}
                    >
                      <td className="px-3 py-2.5">
                        <span className={`font-black text-sm ${q ? "text-green-400" : "text-gray-600"}`}>{i + 1}</span>
                      </td>
                      <td className="px-2 py-2.5">
                        <Link
                          href={`/${locale}/teams/${encodeURIComponent(s.team)}`}
                          className="flex items-center gap-2 hover:text-[#FFD700] transition-colors"
                        >
                          {sflag && (
                            <div className="w-6 h-4 relative overflow-hidden rounded-sm shrink-0">
                              <Image src={sflag} alt={s.team} fill className="object-cover" unoptimized />
                            </div>
                          )}
                          <span className={`font-semibold ${isThis ? "text-[#FFD700] font-black" : "text-white"}`}>
                            {getTeamDisplayName(s.team, locale)}
                          </span>
                          {isThis && (
                            <span className="text-[9px] bg-[#FFD700] text-[#0A1628] font-black px-1 rounded">
                              {zh ? "本队" : "You"}
                            </span>
                          )}
                        </Link>
                      </td>
                      {[s.P, s.W, s.D, s.L].map((v, j) => (
                        <td key={j} className="px-2 py-2.5 text-center text-gray-400">{v}</td>
                      ))}
                      <td className={`px-2 py-2.5 text-center font-medium ${s.GD > 0 ? "text-blue-400" : s.GD < 0 ? "text-red-400" : "text-gray-400"}`}>
                        {gdStr}
                      </td>
                      <td className="px-2 py-2.5 text-center font-black text-white">{s.Pts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="px-3 py-2 text-[10px] text-gray-700">
              {zh ? "* 前两名自动出线" : "* Top 2 advance to knockout rounds"}
            </p>
          </div>
        </section>
      )}

      {/* ── All matches ── */}
      <section>
        <h2 className="text-sm font-black text-white mb-3">
          📅 {zh ? "全部赛事" : "All Matches"} ({matches.length})
        </h2>
        <div className="space-y-2">
          {matches.map((m) => {
            const isHome    = m.home_team === teamName;
            const opponent  = isHome ? m.away_team : m.home_team;
            const oppFlag   = isTBD(opponent) ? null : getFlagUrl(opponent, 80);
            const myScore   = isHome ? m.home_score : m.away_score;
            const oppScore  = isHome ? m.away_score : m.home_score;
            const isFinished = m.status === "finished";
            const isLive    = m.status === "live";
            const stageKey  = STAGE_LABELS[locale]?.[m.stage] ?? m.stage;
            const stageBadge = m.group_name
              ? (zh ? `${m.group_name}组` : `Grp ${m.group_name}`)
              : stageKey;

            let result: string | null = null;
            let resultClass = "text-gray-500";
            if (isFinished && myScore !== null && oppScore !== null) {
              if (myScore > oppScore)       { result = zh ? "胜" : "W"; resultClass = "text-green-400"; }
              else if (myScore < oppScore)  { result = zh ? "负" : "L"; resultClass = "text-red-400"; }
              else                          { result = zh ? "平" : "D"; resultClass = "text-gray-400"; }
            }

            return (
              <Link
                key={m.id}
                href={`/${locale}/matches/${m.id}`}
                className="flex items-center gap-3 bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-3 hover:border-[#FFD700]/30 transition-all"
              >
                {/* Stage badge */}
                <div className="w-12 shrink-0 text-center">
                  <span className="text-[10px] font-bold text-[#FFD700] leading-tight">{stageBadge}</span>
                </div>

                {/* H/A badge */}
                <span className="text-[10px] font-bold text-gray-600 shrink-0 w-3">
                  {isHome ? (zh ? "主" : "H") : (zh ? "客" : "A")}
                </span>

                {/* Opponent flag */}
                <div className="w-8 h-5 relative overflow-hidden rounded-sm shrink-0">
                  {oppFlag ? (
                    <Image src={oppFlag} alt={opponent} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full bg-[#1E3A5F] flex items-center justify-center">
                      <span className="text-[8px] text-gray-500">TBD</span>
                    </div>
                  )}
                </div>

                {/* Opponent name + date */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {isTBD(opponent) ? (zh ? "待定" : "TBD") : getTeamDisplayName(opponent, locale)}
                  </p>
                  <p className="text-[10px] text-gray-600">
                    {formatKickoff(m.kickoff_time, locale)}
                    {m.city ? ` · ${m.city}` : ""}
                  </p>
                </div>

                {/* Score / result */}
                <div className="shrink-0 text-right min-w-[44px]">
                  {isLive && (
                    <p className="text-xs text-green-400 font-bold animate-pulse">LIVE</p>
                  )}
                  {isFinished && myScore !== null && oppScore !== null && (
                    <>
                      <p className="text-sm font-black text-white">{myScore}–{oppScore}</p>
                      {result && <p className={`text-[10px] font-black ${resultClass}`}>{result}</p>}
                    </>
                  )}
                  {!isFinished && !isLive && (
                    <p className="text-xs text-[#FFD700] font-bold">→</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

    </div>
  );
}
