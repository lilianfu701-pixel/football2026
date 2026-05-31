"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getFlagCode } from "@/lib/flags";
import QuickBetDrawer from "./QuickBetDrawer";
import ScoreBetDrawer from "./ScoreBetDrawer";

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

  // ── Quick-bet drawer state ─────────────────────────────────────────────────
  const [drawerMatch, setDrawerMatch] = useState<QuickMatch | null>(null);
  const [preselected, setPreselected] = useState<"home" | "draw" | "away" | undefined>();
  // track placed bets locally so UI updates immediately without full reload
  const [localBets, setLocalBets] = useState<Record<string, {
    prediction: string; gc_amount: number; odds: number;
    potential_payout: number; status: string;
  }>>({});

  // ── Score-bet drawer state ─────────────────────────────────────────────────
  const [scoreBetMatch, setScoreBetMatch] = useState<QuickMatch | null>(null);
  const [localScoreBets, setLocalScoreBets] = useState<Record<string, {
    scoreHome: number; scoreAway: number; gcAmount: number; odds: number;
  }>>({});

  function openDrawer(m: QuickMatch, pick?: "home" | "draw" | "away") {
    setDrawerMatch(m);
    setPreselected(pick);
  }

  function handleBetSuccess(matchId: string, prediction: string, gcAmount: number, odds: number) {
    setLocalBets((prev) => ({
      ...prev,
      [matchId]: { prediction, gc_amount: gcAmount, odds, potential_payout: Math.round(gcAmount * odds), status: "pending" },
    }));
    setDrawerMatch(null);
  }

  function handleScoreBetSuccess(matchId: string, scoreHome: number, scoreAway: number, odds: number, gcAmount: number) {
    setLocalScoreBets((prev) => ({ ...prev, [matchId]: { scoreHome, scoreAway, gcAmount, odds } }));
    setScoreBetMatch(null);
  }

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

      {/* ① Quick-bet match cards */}
      {quickMatches.length > 0 && (
        <div>
          <h2 className="text-base font-black text-white mb-3">
            ⚽ {zh ? "即将开赛 · 快速押注" : "Upcoming Matches"}
          </h2>
          <div className="space-y-3">
            {quickMatches.map((m) => {
              const activeBet = localBets[m.id] ?? m.existingBet;
              const hc = getFlagCode(m.homeTeam);
              const ac = getFlagCode(m.awayTeam);
              const kickoff = new Date(m.kickoffTime);
              const timeStr = kickoff.toLocaleString(zh ? "zh-CN" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
              const isLive = m.status === "live";
              const isFinished = m.status === "finished";

              return (
                <div key={m.id} className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
                  {/* Match header */}
                  <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">{m.stageLabel}</span>
                      {m.groupName && <span className="text-[10px] text-gray-600">· {m.groupName}</span>}
                    </div>
                    {isLive ? (
                      <span className="text-[10px] font-black text-red-400 animate-pulse">🔴 LIVE</span>
                    ) : isFinished ? (
                      <span className="text-[10px] text-gray-500">{zh ? "已结束" : "Final"}</span>
                    ) : (
                      <span className="text-[10px] text-gray-500">{timeStr}</span>
                    )}
                  </div>

                  {/* Teams row */}
                  <div className="px-4 pb-3 flex items-center gap-3">
                    {/* Home */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {hc ? <Image src={`https://flagcdn.com/w40/${hc}.png`} alt="" width={20} height={14} className="rounded-sm shrink-0" unoptimized /> : <span className="text-base shrink-0">🏳️</span>}
                      <span className="text-sm font-black text-white truncate">{m.homeTeam}</span>
                    </div>

                    {/* Score or vs */}
                    <div className="shrink-0 text-center px-2">
                      {(isLive || isFinished) && m.homeScore !== null ? (
                        <span className="text-lg font-black text-white">{m.homeScore} – {m.awayScore}</span>
                      ) : (
                        <span className="text-sm text-gray-600 font-bold">VS</span>
                      )}
                    </div>

                    {/* Away */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                      <span className="text-sm font-black text-white truncate text-right">{m.awayTeam}</span>
                      {ac ? <Image src={`https://flagcdn.com/w40/${ac}.png`} alt="" width={20} height={14} className="rounded-sm shrink-0" unoptimized /> : <span className="text-base shrink-0">🏳️</span>}
                    </div>
                  </div>

                  {/* Bet buttons or existing bet */}
                  {activeBet ? (
                    <div className="mx-4 mb-3 bg-[#FFD700]/8 border border-[#FFD700]/20 rounded-xl px-3 py-2.5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#FFD700]/70 font-semibold uppercase tracking-wide">{zh ? "已押注" : "Your Bet"}</span>
                        <p className="text-sm font-black text-white">
                          {activeBet.prediction === "home" ? `${m.homeTeam} ${zh ? "胜" : "Win"}` :
                           activeBet.prediction === "away" ? `${m.awayTeam} ${zh ? "胜" : "Win"}` :
                           (zh ? "平局" : "Draw")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500">{fmt(activeBet.gc_amount)} GC · ×{activeBet.odds.toFixed(2)}</p>
                        <p className="text-xs text-[#FFD700] font-black">→ {fmt(activeBet.potential_payout)}</p>
                      </div>
                    </div>
                  ) : !user ? (
                    <div className="mx-4 mb-3">
                      <Link href={`/${locale}/auth/login`}
                        className="block w-full text-center bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] text-xs font-bold py-2.5 rounded-xl hover:bg-[#FFD700]/20 transition-colors">
                        {zh ? "登录后押注 →" : "Login to bet →"}
                      </Link>
                    </div>
                  ) : isFinished ? null : (
                    <div className="px-4 pb-3 space-y-2">
                      {/* Win/Draw/Loss buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        {(["home", "draw", "away"] as const).map((pick) => {
                          const label = pick === "home" ? m.homeTeam : pick === "away" ? m.awayTeam : (zh ? "平局" : "Draw");
                          const oddsVal = pick === "home" ? m.refOddsHome : pick === "draw" ? m.refOddsDraw : m.refOddsAway;
                          return (
                            <button key={pick} onClick={() => openDrawer(m, pick)}
                              className="flex flex-col items-center gap-0.5 py-2.5 rounded-xl bg-[#0A1628] border border-[#1E3A5F] hover:border-[#FFD700]/40 hover:bg-[#FFD700]/5 transition-all group">
                              <span className="text-[10px] text-gray-400 group-hover:text-white font-semibold truncate max-w-full px-1 text-center leading-tight">{label}</span>
                              <span className="text-sm font-black text-[#FFD700]">×{oddsVal.toFixed(2)}</span>
                            </button>
                          );
                        })}
                      </div>
                      {/* Score bet button — show existing local score bet or button */}
                      {localScoreBets[m.id] ? (
                        <div className="bg-[#7C6FE0]/10 border border-[#7C6FE0]/20 rounded-xl px-3 py-2 flex items-center justify-between">
                          <span className="text-xs text-[#7C6FE0] font-bold">🎯 {zh ? "比分" : "Score"} {localScoreBets[m.id].scoreHome}:{localScoreBets[m.id].scoreAway}</span>
                          <span className="text-[10px] text-gray-500">{fmt(localScoreBets[m.id].gcAmount)} GC · ×{localScoreBets[m.id].odds.toFixed(1)}</span>
                        </div>
                      ) : (
                        <button onClick={() => setScoreBetMatch(m)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#0A1628] border border-[#7C6FE0]/30 text-[#7C6FE0] hover:bg-[#7C6FE0]/10 hover:border-[#7C6FE0]/60 transition-all text-xs font-bold">
                          🎯 {zh ? "比分竞猜" : "Score Prediction"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Score-bet drawer */}
      {scoreBetMatch && (
        <ScoreBetDrawer
          locale={locale}
          matchId={scoreBetMatch.id}
          homeTeam={scoreBetMatch.homeTeam}
          awayTeam={scoreBetMatch.awayTeam}
          stageLabel={scoreBetMatch.stageLabel}
          gcBalance={gcBalance}
          homeColors={scoreBetMatch.homeColors}
          awayColors={scoreBetMatch.awayColors}
          onClose={() => setScoreBetMatch(null)}
          onSuccess={handleScoreBetSuccess}
        />
      )}

      {/* Quick-bet drawer */}
      {drawerMatch && (
        <QuickBetDrawer
          locale={locale}
          matchId={drawerMatch.id}
          homeTeam={drawerMatch.homeTeam}
          awayTeam={drawerMatch.awayTeam}
          stageLabel={drawerMatch.stageLabel}
          kickoffTime={drawerMatch.kickoffTime}
          poolHome={drawerMatch.poolHome}
          poolDraw={drawerMatch.poolDraw}
          poolAway={drawerMatch.poolAway}
          refOddsHome={drawerMatch.refOddsHome}
          refOddsDraw={drawerMatch.refOddsDraw}
          refOddsAway={drawerMatch.refOddsAway}
          gcBalance={gcBalance}
          homeColors={drawerMatch.homeColors}
          awayColors={drawerMatch.awayColors}
          preselected={preselected}
          onClose={() => setDrawerMatch(null)}
          onSuccess={handleBetSuccess}
        />
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

      {/* ③ Stats Overview */}
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

      {/* ④ Score Bet History */}
      {user && (
        <div>
          <h2 className="text-base font-black text-white mb-3">
            🎯 {zh ? "比分竞猜记录" : "Score Bet History"}
          </h2>
          {scoreBetHistory.length === 0 ? (
            <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-6 text-center">
              <p className="text-gray-500 text-sm">
                {zh ? "还没有比分竞猜记录，从上方比赛卡片押注比分吧！" : "No score bets yet — click 🎯 Score Prediction on any match above!"}
              </p>
            </div>
          ) : (
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
          )}
        </div>
      )}

    </div>
  );
}
