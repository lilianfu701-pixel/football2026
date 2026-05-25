"use client";

import { useState } from "react";
import Image from "next/image";
import { getFlagUrl, isTBD } from "@/lib/flags";

interface Props {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  initialVote: "home" | "neutral" | "away" | null;
  initialCounts: { home: number; neutral: number; away: number };
  loggedIn: boolean;
  zh?: boolean;
}

export default function MatchFanVote({
  matchId,
  homeTeam,
  awayTeam,
  initialVote,
  initialCounts,
  loggedIn,
  zh,
}: Props) {
  // Treat neutral initial vote as null for the 2-option UI
  const [myVote, setMyVote] = useState<"home" | "away" | null>(
    initialVote === "neutral" ? null : initialVote
  );
  const [counts, setCounts] = useState(initialCounts);
  const [loading, setLoading] = useState(false);

  // Only home + away for display
  const homeCount = counts.home;
  const awayCount = counts.away;
  const total = homeCount + awayCount;

  function homePct() {
    if (total === 0) return 50;
    return Math.round((homeCount / total) * 100);
  }
  function awayPct() {
    return 100 - homePct();
  }

  async function vote(v: "home" | "away") {
    if (!loggedIn || loading || myVote === v) return;
    setLoading(true);

    const prev = myVote;
    const next = { ...counts };
    if (prev) next[prev] = Math.max(0, next[prev] - 1);
    next[v]++;
    setCounts(next);
    setMyVote(v);

    try {
      const res = await fetch("/api/match-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: matchId, vote: v }),
      });
      if (!res.ok) {
        setCounts(counts);
        setMyVote(prev);
      }
    } catch {
      setCounts(counts);
      setMyVote(prev);
    } finally {
      setLoading(false);
    }
  }

  const hp = homePct();
  const ap = awayPct();

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5 mb-4">
      {/* Title row */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-200">
          ⚽ {zh ? "你支持哪队？" : "Who Do You Support?"}
        </h3>
        <span className="text-xs text-gray-500">
          {total > 0
            ? (zh ? `${total} 人已投票` : `${total} votes`)
            : (zh ? "第一个投票" : "Be first to vote")}
        </span>
      </div>

      {/* Two big vote buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Home */}
        <button
          onClick={() => vote("home")}
          disabled={!loggedIn || loading}
          className={`relative flex flex-col items-center gap-2 py-5 px-3 rounded-2xl border-2 transition-all overflow-hidden ${
            myVote === "home"
              ? "border-[#FFD700] bg-[#FFD700]/12"
              : "border-[#1E3A5F] bg-[#0A1628] hover:border-[#FFD700]/40 hover:bg-[#FFD700]/5"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {/* Background glow when selected */}
          {myVote === "home" && (
            <div className="absolute inset-0 bg-gradient-to-b from-[#FFD700]/10 to-transparent pointer-events-none" />
          )}
          {/* Flag */}
          <div className="w-16 h-11 relative overflow-hidden rounded-md shadow-md">
            {isTBD(homeTeam) ? (
              <div className="w-full h-full bg-[#1E3A5F] flex items-center justify-center">
                <span className="text-gray-400 font-black">?</span>
              </div>
            ) : (
              <Image src={getFlagUrl(homeTeam, 128)} alt={homeTeam} fill className="object-cover" unoptimized />
            )}
          </div>
          <span className={`text-sm font-bold leading-tight text-center ${
            myVote === "home" ? "text-[#FFD700]" : "text-white"
          }`}>
            {homeTeam}
          </span>
          <span className={`text-2xl font-black ${
            myVote === "home" ? "text-[#FFD700]" : "text-gray-200"
          }`}>
            {homeCount}
          </span>
          {myVote === "home" && (
            <span className="text-[11px] text-[#FFD700] font-bold bg-[#FFD700]/15 px-2 py-0.5 rounded-full">
              ✓ {zh ? "已投票" : "Voted"}
            </span>
          )}
        </button>

        {/* Away */}
        <button
          onClick={() => vote("away")}
          disabled={!loggedIn || loading}
          className={`relative flex flex-col items-center gap-2 py-5 px-3 rounded-2xl border-2 transition-all overflow-hidden ${
            myVote === "away"
              ? "border-purple-500 bg-purple-500/12"
              : "border-[#1E3A5F] bg-[#0A1628] hover:border-purple-500/40 hover:bg-purple-500/5"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {myVote === "away" && (
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none" />
          )}
          <div className="w-16 h-11 relative overflow-hidden rounded-md shadow-md">
            {isTBD(awayTeam) ? (
              <div className="w-full h-full bg-[#1E3A5F] flex items-center justify-center">
                <span className="text-gray-400 font-black">?</span>
              </div>
            ) : (
              <Image src={getFlagUrl(awayTeam, 128)} alt={awayTeam} fill className="object-cover" unoptimized />
            )}
          </div>
          <span className={`text-sm font-bold leading-tight text-center ${
            myVote === "away" ? "text-purple-400" : "text-white"
          }`}>
            {awayTeam}
          </span>
          <span className={`text-2xl font-black ${
            myVote === "away" ? "text-purple-400" : "text-gray-200"
          }`}>
            {awayCount}
          </span>
          {myVote === "away" && (
            <span className="text-[11px] text-purple-400 font-bold bg-purple-500/15 px-2 py-0.5 rounded-full">
              ✓ {zh ? "已投票" : "Voted"}
            </span>
          )}
        </button>
      </div>

      {/* Split bar */}
      <div className="h-3 rounded-full overflow-hidden bg-[#0A1628] flex">
        <div
          className="h-full bg-[#FFD700] transition-all duration-700 ease-out"
          style={{ width: `${hp}%` }}
        />
        <div
          className="h-full bg-purple-500 transition-all duration-700 ease-out flex-1"
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-xs font-black text-[#FFD700]">{hp}%</span>
        <span className="text-xs font-black text-purple-400">{ap}%</span>
      </div>

      {!loggedIn && (
        <p className="text-xs text-gray-600 text-center mt-3">
          {zh ? "登录后即可投票" : "Login to cast your vote"}
        </p>
      )}
    </div>
  );
}
