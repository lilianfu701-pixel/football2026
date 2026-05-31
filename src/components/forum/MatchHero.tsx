"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getFlagUrl, getTeamDisplayName } from "@/lib/flags";

// ── World Cup 2026 venue & city translations ─────────────────────────────────
const VENUE_ZH: Record<string, string> = {
  "Estadio Azteca":          "阿兹特克球场",
  "Estadio Akron":           "阿克隆球场",
  "Estadio BBVA":            "BBVA球场",
  "MetLife Stadium":         "大都会球场",
  "SoFi Stadium":            "苏菲球场",
  "Levi's Stadium":          "李维斯球场",
  "Lumen Field":             "流明球场",
  "AT&T Stadium":            "AT&T球场",
  "Mercedes-Benz Stadium":   "奔驰球场",
  "Hard Rock Stadium":       "硬石球场",
  "Gillette Stadium":        "吉列球场",
  "Arrowhead Stadium":       "箭头球场",
  "NRG Stadium":             "NRG球场",
  "Lincoln Financial Field": "林肯金融球场",
  "BMO Field":               "BMO球场",
  "BC Place":                "BC广场",
};

const CITY_ZH: Record<string, string> = {
  "Mexico City":    "墨西哥城",
  "Guadalajara":    "瓜达拉哈拉",
  "Monterrey":      "蒙特雷",
  "New York":       "纽约",
  "New Jersey":     "新泽西",
  "Los Angeles":    "洛杉矶",
  "San Francisco":  "旧金山",
  "Seattle":        "西雅图",
  "Dallas":         "达拉斯",
  "Arlington":      "阿灵顿",
  "Atlanta":        "亚特兰大",
  "Miami":          "迈阿密",
  "Boston":         "波士顿",
  "Foxborough":     "福克斯波罗",
  "Kansas City":    "堪萨斯城",
  "Houston":        "休斯顿",
  "Philadelphia":   "费城",
  "Toronto":        "多伦多",
  "Vancouver":      "温哥华",
};

interface TeamColors { primary: string; secondary: string; }

interface Props {
  matchId:    number;
  homeTeam:   string;
  awayTeam:   string;
  homeFlag:   string;
  awayFlag:   string;
  groupName:  string | null;
  venue:      string | null;
  city:       string | null;
  kickoff:    string;
  homeScore:  number | null;
  awayScore:  number | null;
  status:     string;
  votes:      { home: number; neutral: number; away: number };
  myVote:     string | null;
  loggedIn:   boolean;
  zh:         boolean;
  /** Team representative colors for vote buttons */
  homeColors?: TeamColors;
  awayColors?: TeamColors;
  /** When true, renders without its own card wrapper — for embedding inside another card */
  embedded?:  boolean;
}

// Append 2-digit hex opacity to a 6-digit hex color: hexOp("#FF0000", 0.15) → "#FF000026"
function hexOp(hex: string, alpha: number): string {
  return hex + Math.round(alpha * 255).toString(16).padStart(2, "0");
}

const DEFAULT_HOME: TeamColors = { primary: "#FFD700", secondary: "#FFD700" };
const DEFAULT_AWAY: TeamColors = { primary: "#A855F7", secondary: "#A855F7" };

export default function MatchHero({
  matchId, homeTeam, awayTeam, homeFlag, awayFlag,
  groupName, venue, city, kickoff,
  homeScore, awayScore, status,
  votes: initialVotes, myVote: initialMyVote,
  loggedIn, zh, embedded = false,
  homeColors: hc = DEFAULT_HOME,
  awayColors: ac = DEFAULT_AWAY,
}: Props) {
  const router = useRouter();
  const [votes, setVotes] = useState(initialVotes);
  const [myVote, setMyVote] = useState(initialMyVote);
  const [voting, setVoting] = useState(false);

  // Self-fetch user vote on mount (for statically-generated match pages where initialMyVote is null)
  useEffect(() => {
    if (initialMyVote !== null) return;  // server already provided vote — skip
    fetch(`/api/matches/${matchId}/user-state`)
      .then((r) => r.json())
      .then((d: { myVote: string | null; userId: string | null }) => {
        if (d.userId) setMyVote(d.myVote);
      })
      .catch(() => {});
  }, [matchId, initialMyVote]);

  const total = votes.home + votes.neutral + votes.away;
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  const isFinished = status === "finished";
  const isLive     = status === "live";

  const kickoffDate = new Date(kickoff);
  const dateStr = zh
    ? kickoffDate.toLocaleString("zh-CN", { month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" })
    : kickoffDate.toLocaleString("en-US", { month: "short", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });

  async function handleVote(vote: "home" | "neutral" | "away") {
    if (!loggedIn || voting) return;
    setVoting(true);

    // Optimistic update
    const oldVote = myVote;
    const newVotes = { ...votes };
    if (oldVote && oldVote !== vote) {
      newVotes[oldVote as keyof typeof newVotes]--;
    }
    if (oldVote !== vote) {
      newVotes[vote]++;
    }
    setMyVote(vote);
    setVotes(newVotes);

    try {
      const res = await fetch("/api/match-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: matchId, vote }),
      });
      if (!res.ok) {
        // Revert
        setMyVote(oldVote);
        setVotes(votes);
      } else {
        // Refresh server data so fan map reflects the new vote
        router.refresh();
      }
    } catch {
      setMyVote(oldVote);
      setVotes(votes);
    } finally {
      setVoting(false);
    }
  }

  const inner = (
    <>
      {/* Top bar: stage + status */}
      <div className={`flex items-center justify-between ${embedded ? "pt-1 pb-0" : "px-5 pt-2 pb-0"}`}>
        <span className="text-sm font-bold text-gray-400">
          {groupName
            ? (zh ? `${groupName}组 · 小组赛` : `Group ${groupName} · Group Stage`)
            : (zh ? "世界杯 2026" : "World Cup 2026")}
        </span>
        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
          isLive     ? "text-green-400 bg-green-400/10 animate-pulse" :
          isFinished ? "text-gray-500 bg-gray-500/10" :
                       "text-blue-400 bg-blue-400/10"
        }`}>
          {isLive ? "🔴 LIVE" : isFinished ? (zh ? "已结束" : "Full Time") : (zh ? "未开赛" : "Upcoming")}
        </span>
      </div>

      {/* ── Teams + VS ── */}
      <div className={`flex items-center justify-between gap-2 ${embedded ? "pt-0.5 pb-0" : "px-6 pt-1.5 pb-0"}`}>
        {/* Home team */}
        <div className="flex-1 text-center">
          <div className="w-16 h-11 relative overflow-hidden rounded-lg shadow-lg mx-auto mb-1 border border-[#1E3A5F]">
            <Image src={getFlagUrl(homeTeam, 160)} alt={homeTeam} fill className="object-cover" unoptimized />
          </div>
          <p className="text-white font-black text-sm leading-tight">{getTeamDisplayName(homeTeam, zh ? "zh" : "en")}</p>
        </div>

        {/* Score / VS */}
        <div className="text-center px-3 shrink-0">
          {(isFinished || isLive) && homeScore !== null && awayScore !== null ? (
            <div className="flex items-center gap-3">
              <span className="text-4xl font-black text-white">{homeScore}</span>
              <span className="text-2xl text-gray-600 font-bold">:</span>
              <span className="text-4xl font-black text-white">{awayScore}</span>
            </div>
          ) : (
            <p className="text-[#FFD700] font-black text-3xl tracking-wider">VS</p>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 text-center">
          <div className="w-16 h-11 relative overflow-hidden rounded-lg shadow-lg mx-auto mb-1 border border-[#1E3A5F]">
            <Image src={getFlagUrl(awayTeam, 160)} alt={awayTeam} fill className="object-cover" unoptimized />
          </div>
          <p className="text-white font-black text-sm leading-tight">{getTeamDisplayName(awayTeam, zh ? "zh" : "en")}</p>
        </div>
      </div>

      {/* Match info — tight below VS */}
      <div className="flex flex-col items-center gap-0 pt-0.5 pb-1">
        <span className="text-sm font-semibold text-gray-300">
          📅 {dateStr}
        </span>
        {venue && (
          <span className="text-sm font-semibold text-gray-300">
            🏟 {zh ? (VENUE_ZH[venue] ?? venue) : venue}
            {city ? `，${zh ? (CITY_ZH[city] ?? city) : city}` : ""}
          </span>
        )}
      </div>

      {/* ── Fan Support Vote ── */}
      <div className="border-t border-[#1E3A5F] px-5 pt-2 pb-2">
        <p className="text-xs font-bold text-gray-400 mb-2 text-center">
          {zh ? `⚡ 你支持谁？${total > 0 ? ` · ${total} 人投票` : ""}` : `⚡ Who do you support?${total > 0 ? ` · ${total} votes` : ""}`}
        </p>

        <div className="flex gap-2">
          {/* Home vote */}
          <button
            onClick={() => handleVote("home")}
            disabled={!loggedIn || voting}
            className="flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-50"
            style={myVote === "home" ? {
              backgroundColor: hexOp(hc.primary, 0.15),
              borderColor:     hexOp(hc.secondary !== hc.primary ? hc.secondary : hc.primary, 0.65),
              color:           hc.primary,
              boxShadow:       `0 4px 12px ${hexOp(hc.primary, 0.12)}`,
            } : {
              backgroundColor: "#0A1628",
              borderColor:     hc.secondary !== hc.primary ? hexOp(hc.secondary, 0.22) : "#1E3A5F",
              color:           "#9CA3AF",
            }}
          >
            <div className="flex justify-center mb-0.5"><img src={getFlagUrl(homeTeam, 40)} alt={homeTeam} className="w-6 h-4 object-cover rounded-[2px]" /></div>
            <div>{zh ? `支持${getTeamDisplayName(homeTeam, "zh")}` : homeTeam}</div>
            {total > 0 && (
              <div className="mt-1">
                <div className="h-1 bg-[#1E3A5F] rounded-full overflow-hidden mx-4">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct(votes.home)}%`, backgroundColor: hc.primary }} />
                </div>
                <span className="text-[10px] text-gray-500 mt-0.5 block">{votes.home} ({pct(votes.home)}%)</span>
              </div>
            )}
          </button>

          {/* Neutral vote — stays blue, it's team-agnostic */}
          <button
            onClick={() => handleVote("neutral")}
            disabled={!loggedIn || voting}
            className={`flex-[0.7] py-1.5 rounded-xl text-xs font-bold border transition-all ${
              myVote === "neutral"
                ? "bg-blue-500/15 border-blue-500/40 text-blue-400 shadow-lg shadow-blue-500/10"
                : "bg-[#0A1628] border-[#1E3A5F] text-gray-400 hover:text-white hover:border-blue-500/30"
            } disabled:opacity-50`}
          >
            <div className="text-base leading-none mb-0.5">🤝</div>
            <div>{zh ? "中立" : "Neutral"}</div>
            {total > 0 && (
              <div className="mt-1">
                <div className="h-1 bg-[#1E3A5F] rounded-full overflow-hidden mx-3">
                  <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${pct(votes.neutral)}%` }} />
                </div>
                <span className="text-[10px] text-gray-500 mt-0.5 block">{votes.neutral} ({pct(votes.neutral)}%)</span>
              </div>
            )}
          </button>

          {/* Away vote */}
          <button
            onClick={() => handleVote("away")}
            disabled={!loggedIn || voting}
            className="flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-50"
            style={myVote === "away" ? {
              backgroundColor: hexOp(ac.primary, 0.15),
              borderColor:     hexOp(ac.secondary !== ac.primary ? ac.secondary : ac.primary, 0.65),
              color:           ac.primary,
              boxShadow:       `0 4px 12px ${hexOp(ac.primary, 0.12)}`,
            } : {
              backgroundColor: "#0A1628",
              borderColor:     ac.secondary !== ac.primary ? hexOp(ac.secondary, 0.22) : "#1E3A5F",
              color:           "#9CA3AF",
            }}
          >
            <div className="flex justify-center mb-0.5"><img src={getFlagUrl(awayTeam, 40)} alt={awayTeam} className="w-6 h-4 object-cover rounded-[2px]" /></div>
            <div>{zh ? `支持${getTeamDisplayName(awayTeam, "zh")}` : awayTeam}</div>
            {total > 0 && (
              <div className="mt-1">
                <div className="h-1 bg-[#1E3A5F] rounded-full overflow-hidden mx-4">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct(votes.away)}%`, backgroundColor: ac.primary }} />
                </div>
                <span className="text-[10px] text-gray-500 mt-0.5 block">{votes.away} ({pct(votes.away)}%)</span>
              </div>
            )}
          </button>
        </div>

        {!loggedIn && (
          <p className="text-[10px] text-gray-600 text-center mt-1.5">
            {zh ? "登录后参与投票" : "Login to vote"}
          </p>
        )}
      </div>
    </>
  );

  if (embedded) return inner;

  return (
    <div className="bg-gradient-to-b from-[#0F2040] to-[#0A1628] border border-[#1E3A5F] rounded-2xl overflow-hidden mb-4 px-5">
      {inner}
    </div>
  );
}
