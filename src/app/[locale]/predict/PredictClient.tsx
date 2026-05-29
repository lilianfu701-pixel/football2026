"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getFlagCode } from "@/lib/flags";

// ── Types ────────────────────────────────────────────────────────────────────

interface TeamColors { primary: string; secondary: string; }

interface QuickMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: string;
  stage: string;
  stageLabel: string;
  groupName: string | null;
  matchNumber: string | null;
  poolHome:    number;
  poolDraw:    number;
  poolAway:    number;
  refOddsHome: number;
  refOddsDraw: number;
  refOddsAway: number;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homeColors: TeamColors;
  awayColors: TeamColors;
  existingBet: {
    prediction: string; gc_amount: number; odds: number;
    potential_payout: number; status: string;
  } | null;
}

interface BetRecord {
  id: string;
  prediction: string;
  gcAmount: number;
  odds: number;
  potentialPayout: number;
  status: string;
  createdAt: string;
  match: {
    id: string; homeTeam: string; awayTeam: string; kickoffTime: string;
    stage: string; stageLabel: string; status: string;
    homeScore: number | null; awayScore: number | null;
  } | null;
}

interface Stats {
  totalBets: number; wonBets: number; lostBets: number;
  pendingBets: number; winRate: number; totalWon: number; totalStaked: number;
}

interface ScoreBetRecord {
  id: string;
  scoreHome: number;
  scoreAway: number;
  gcAmount: number;
  oddsMultiplier: number;
  status: string;
  createdAt: string;
  match: {
    id: string; homeTeam: string; awayTeam: string; kickoffTime: string;
    stage: string; stageLabel: string; status: string;
    homeScore: number | null; awayScore: number | null;
  } | null;
}

interface Props {
  locale: string;
  user: { id: string } | null;
  gcBalance: number;
  username: string;
  stats: Stats;
  quickMatches: QuickMatch[];
  betHistory: BetRecord[];
  scoreBetHistory: ScoreBetRecord[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + "M";
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + "K";
  return String(n);
}


function StatusBadge({ status, locale }: { status: string; locale: string }) {
  const zh = locale === "zh";
  if (status === "won")     return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-bold">🎉 {zh ? "赢" : "Won"}</span>;
  if (status === "lost")    return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold">💔 {zh ? "输" : "Lost"}</span>;
  if (status === "refunded") return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/15 text-gray-400 font-bold">{zh ? "退款" : "Refunded"}</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-bold">⏳ {zh ? "待结算" : "Pending"}</span>;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PredictClient({
  locale, user, gcBalance, username, stats,
  quickMatches, betHistory, scoreBetHistory,
}: Props) {
  const zh = locale === "zh";

  // History tab
  const [historyTab, setHistoryTab] = useState<"all" | "pending" | "won" | "lost">("all");

  // Filtered history
  const filteredHistory = betHistory.filter((b) =>
    historyTab === "all" ? true :
    historyTab === "pending" ? b.status === "pending" :
    historyTab === "won"     ? b.status === "won"     :
    b.status === "lost"
  );

  const historyTabCounts = {
    all:     betHistory.length,
    pending: betHistory.filter((b) => b.status === "pending").length,
    won:     betHistory.filter((b) => b.status === "won").length,
    lost:    betHistory.filter((b) => b.status === "lost").length,
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ① Stats Overview */}
      {user && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: zh ? "押注场次"  : "Total Bets",    value: stats.totalBets,              color: "text-white",        emoji: "🎯" },
            { label: zh ? "胜率"      : "Win Rate",       value: `${stats.winRate}%`,           color: stats.winRate >= 60 ? "text-green-400" : stats.winRate >= 40 ? "text-yellow-400" : "text-red-400", emoji: "📈" },
            { label: zh ? "累计赢得"  : "Total Won",      value: `${fmt(stats.totalWon)} GC`,  color: "text-green-400",    emoji: "🪙" },
            { label: zh ? "进行中"    : "In Progress",    value: stats.pendingBets,             color: "text-blue-400",     emoji: "⏳" },
          ].map((s) => (
            <div key={s.label} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-3.5">
              <div className="text-xl mb-1">{s.emoji}</div>
              <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ② History */}
      {user && (
        <div>
          <h2 className="text-base font-black text-white mb-3">
            📋 {zh ? "我的押注记录" : "My Bet History"}
          </h2>

          {/* Tab bar */}
          <div className="flex gap-1 bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-1 mb-3">
            {(["all", "pending", "won", "lost"] as const).map((t) => {
              const labels = { all: zh ? "全部" : "All", pending: zh ? "待结算" : "Pending", won: zh ? "赢" : "Won", lost: zh ? "输" : "Lost" };
              const cnt = historyTabCounts[t];
              return (
                <button
                  key={t}
                  onClick={() => setHistoryTab(t)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    historyTab === t ? "bg-[#FFD700] text-[#0A1628]" : "text-gray-500 hover:text-white"
                  }`}
                >
                  {labels[t]}
                  {cnt > 0 && (
                    <span className={`text-[10px] px-1 rounded-full font-black ${
                      historyTab === t ? "bg-[#0A1628]/20 text-[#0A1628]" : "bg-[#1E3A5F] text-gray-400"
                    }`}>{cnt}</span>
                  )}
                </button>
              );
            })}
          </div>

          {filteredHistory.length === 0 ? (
            <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-8 text-center">
              <p className="text-gray-500 text-sm">
                {historyTab === "all"
                  ? (zh ? "还没有押注记录，去押注第一场吧！" : "No bets yet — place your first bet above!")
                  : (zh ? "该分类暂无记录" : "No records in this category")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((bet) => {
                const match    = bet.match;
                const isWon    = bet.status === "won";
                const isLost   = bet.status === "lost";
                const pickLbl  = bet.prediction === "home"
                  ? (zh ? `${match?.homeTeam ?? ""} 胜` : `${match?.homeTeam ?? ""} Win`)
                  : bet.prediction === "away"
                  ? (zh ? `${match?.awayTeam ?? ""} 胜` : `${match?.awayTeam ?? ""} Win`)
                  : (zh ? "平局" : "Draw");
                const hc       = match ? getFlagCode(match.homeTeam) : "";
                const ac       = match ? getFlagCode(match.awayTeam) : "";

                return (
                  <div
                    key={bet.id}
                    className={`bg-[#0F2040] border rounded-xl p-3.5 ${
                      isWon ? "border-green-500/20" : isLost ? "border-red-500/20" : "border-[#1E3A5F]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Flags */}
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        {hc
                          ? <Image src={`https://flagcdn.com/w20/${hc}.png`} alt="" width={16} height={11} className="rounded-sm" unoptimized />
                          : <span className="text-xs">🏳️</span>}
                        <span className="text-[10px] text-gray-600">vs</span>
                        {ac
                          ? <Image src={`https://flagcdn.com/w20/${ac}.png`} alt="" width={16} height={11} className="rounded-sm" unoptimized />
                          : <span className="text-xs">🏳️</span>}
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white truncate">
                            {match?.homeTeam} vs {match?.awayTeam}
                          </span>
                          {match && (match.status === "finished" || match.status === "live") && match.homeScore !== null && (
                            <span className="text-[10px] text-gray-500 font-bold shrink-0">
                              ({match.homeScore}–{match.awayScore})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-xs font-bold ${
                            bet.prediction === "home" ? "text-blue-400" :
                            bet.prediction === "away" ? "text-amber-400" : "text-gray-300"
                          }`}>
                            {pickLbl}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {fmt(bet.gcAmount)} GC · ×{bet.odds.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Right: status + payout */}
                      <div className="shrink-0 text-right flex flex-col items-end gap-1">
                        <StatusBadge status={bet.status} locale={locale} />
                        {isWon ? (
                          <span className="text-xs font-black text-green-400">+{fmt(bet.potentialPayout)}</span>
                        ) : isLost ? (
                          <span className="text-xs font-black text-red-400">–{fmt(bet.gcAmount)}</span>
                        ) : (
                          <span className="text-[10px] text-gray-500">→ {fmt(bet.potentialPayout)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ③ Score Bet History */}
      {user && scoreBetHistory.length > 0 && (
        <div>
          <h2 className="text-base font-black text-white mb-3">
            🎯 {zh ? "比分竞猜记录" : "Score Bet History"}
          </h2>
          <div className="space-y-2">
            {scoreBetHistory.map((bet) => {
              const match  = bet.match;
              const isWon  = bet.status === "won";
              const isLost = bet.status === "lost";
              const potential = Math.round(bet.gcAmount * bet.oddsMultiplier);
              const hc = match ? getFlagCode(match.homeTeam) : "";
              const ac = match ? getFlagCode(match.awayTeam) : "";
              return (
                <div key={bet.id} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    {/* Flags */}
                    <div className="flex items-center gap-1 shrink-0">
                      {hc && <Image src={`https://flagcdn.com/w40/${hc}.png`} alt="" width={20} height={14} className="rounded-sm object-cover" unoptimized />}
                      {ac && <Image src={`https://flagcdn.com/w40/${ac}.png`} alt="" width={20} height={14} className="rounded-sm object-cover" unoptimized />}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white truncate">
                          {match?.homeTeam} vs {match?.awayTeam}
                        </span>
                        {match && (match.status === "finished" || match.status === "live") && match.homeScore !== null && (
                          <span className="text-[10px] text-gray-500 font-bold shrink-0">
                            ({match.homeScore}–{match.awayScore})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs font-bold text-[#FFD700]">
                          {zh ? "比分：" : "Score: "}{bet.scoreHome} – {bet.scoreAway}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {fmt(bet.gcAmount)} GC · ×{bet.oddsMultiplier}
                        </span>
                      </div>
                    </div>

                    {/* Right: status + payout */}
                    <div className="shrink-0 text-right flex flex-col items-end gap-1">
                      <StatusBadge status={bet.status} locale={locale} />
                      {isWon ? (
                        <span className="text-xs font-black text-green-400">+{fmt(potential)}</span>
                      ) : isLost ? (
                        <span className="text-xs font-black text-red-400">–{fmt(bet.gcAmount)}</span>
                      ) : (
                        <span className="text-[10px] text-gray-500">→ {fmt(potential)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
