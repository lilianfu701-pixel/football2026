"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getFlagCode } from "@/lib/flags";

// ── Types ────────────────────────────────────────────────────────────────────

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

interface Props {
  locale: string;
  user: { id: string } | null;
  stats: Stats;
  betHistory: BetRecord[];
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
  if (status === "won")      return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-bold">🎉 {zh ? "赢" : "Won"}</span>;
  if (status === "lost")     return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold">💔 {zh ? "输" : "Lost"}</span>;
  if (status === "refunded") return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/15 text-gray-400 font-bold">{zh ? "退款" : "Refunded"}</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-bold">⏳ {zh ? "待结算" : "Pending"}</span>;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PredictClient({ locale, user, stats, betHistory }: Props) {
  const zh = locale === "zh";
  const router = useRouter();

  // History tab
  const [historyTab, setHistoryTab] = useState<"all" | "pending" | "won" | "lost">("all");

  // Cancel-bet state
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function cancelBet(betId: string) {
    if (cancellingId) return;
    const confirmed = window.confirm(
      zh ? "确定取消这笔押注吗？押注金额将退还到你的余额。" : "Cancel this bet? Your stake will be refunded."
    );
    if (!confirmed) return;

    setCancellingId(betId);
    setCancelError(null);
    try {
      const res = await fetch("/api/bets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet_id: betId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCancelError(data?.error ?? (zh ? "取消失败，请重试" : "Cancel failed, please retry"));
        return;
      }
      router.refresh();
    } catch {
      setCancelError(zh ? "网络错误，请重试" : "Network error, please retry");
    } finally {
      setCancellingId(null);
    }
  }

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

      {/* ── My Bet History (win / draw / loss only) ── */}
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

          {/* Cancel error */}
          {cancelError && (
            <div className="mb-3 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-xs text-red-400">
              ⚠ {cancelError}
            </div>
          )}

          {filteredHistory.length === 0 ? (
            <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-8 text-center">
              <p className="text-gray-500 text-sm">
                {historyTab === "all"
                  ? (zh ? "还没有押注记录，去比赛页面押注吧！" : "No bets yet — visit a match to place one!")
                  : (zh ? "该分类暂无记录" : "No records in this category")}
              </p>
              {historyTab === "all" && (
                <Link href={`/${locale}/matches`} className="inline-block mt-3 text-[#FFD700] text-xs font-bold hover:underline">
                  {zh ? "浏览比赛 →" : "Browse matches →"}
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((bet) => {
                const match    = bet.match;
                const isWon    = bet.status === "won";
                const isLost   = bet.status === "lost";
                const isPending = bet.status === "pending";
                const pickLbl  = bet.prediction === "home"
                  ? (zh ? `${match?.homeTeam ?? ""} 胜` : `${match?.homeTeam ?? ""} Win`)
                  : bet.prediction === "away"
                  ? (zh ? `${match?.awayTeam ?? ""} 胜` : `${match?.awayTeam ?? ""} Win`)
                  : (zh ? "平局" : "Draw");
                const hc       = match ? getFlagCode(match.homeTeam) : "";
                const ac       = match ? getFlagCode(match.awayTeam) : "";
                // Implied win rate from the locked-in odds (1 / odds).
                const winPct   = bet.odds > 0 ? Math.min(99, Math.round(100 / bet.odds)) : 0;

                return (
                  <div
                    key={bet.id}
                    className={`bg-[#0F2040] border rounded-xl p-3.5 ${
                      isWon ? "border-green-500/20" : isLost ? "border-red-500/20" : "border-[#1E3A5F]"
                    }`}
                  >
                    {/* Top row: teams + flags + status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {hc
                          ? <Image src={`https://flagcdn.com/w40/${hc}.png`} alt="" width={20} height={14} className="rounded-sm shrink-0" unoptimized />
                          : <span className="text-sm shrink-0">🏳️</span>}
                        <span className="text-sm font-bold text-white truncate">{match?.homeTeam ?? "—"}</span>
                        <span className="text-[10px] text-gray-600 shrink-0">vs</span>
                        {ac
                          ? <Image src={`https://flagcdn.com/w40/${ac}.png`} alt="" width={20} height={14} className="rounded-sm shrink-0" unoptimized />
                          : <span className="text-sm shrink-0">🏳️</span>}
                        <span className="text-sm font-bold text-white truncate">{match?.awayTeam ?? "—"}</span>
                        {match && (match.status === "finished" || match.status === "live") && match.homeScore !== null && (
                          <span className="text-[10px] text-gray-500 font-bold shrink-0">
                            ({match.homeScore}–{match.awayScore})
                          </span>
                        )}
                      </div>
                      <div className="shrink-0">
                        <StatusBadge status={bet.status} locale={locale} />
                      </div>
                    </div>

                    {/* Mid row: pick + win rate + stake + payout */}
                    <div className="flex items-center justify-between gap-2 mt-2.5 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold ${
                          bet.prediction === "home" ? "text-blue-400" :
                          bet.prediction === "away" ? "text-amber-400" : "text-gray-300"
                        }`}>
                          {pickLbl}
                        </span>
                        <span className="text-[10px] text-gray-400 bg-[#0A1628] border border-[#1E3A5F] rounded-full px-2 py-0.5">
                          {zh ? "胜率" : "Win rate"} {winPct}%
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {zh ? "押注" : "Stake"} {fmt(bet.gcAmount)} GC · ×{(bet.odds ?? 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="shrink-0 text-right">
                        {isWon ? (
                          <span className="text-sm font-black text-green-400">+{fmt(bet.potentialPayout)}</span>
                        ) : isLost ? (
                          <span className="text-sm font-black text-red-400">–{fmt(bet.gcAmount)}</span>
                        ) : (
                          <span className="text-[11px] text-gray-500">→ {fmt(bet.potentialPayout)} GC</span>
                        )}
                      </div>
                    </div>

                    {/* Action row: details + cancel */}
                    <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-[#1E3A5F]/60">
                      {match && (
                        <Link
                          href={`/${locale}/matches/${match.id}`}
                          className="flex-1 text-center text-xs font-bold text-gray-300 bg-[#0A1628] border border-[#1E3A5F] hover:border-[#FFD700]/50 hover:text-white rounded-lg py-2 transition-colors"
                        >
                          {zh ? "详情" : "Details"}
                        </Link>
                      )}
                      {isPending && (
                        <button
                          onClick={() => cancelBet(bet.id)}
                          disabled={cancellingId === bet.id}
                          className="flex-1 text-center text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 rounded-lg py-2 transition-colors disabled:opacity-50"
                        >
                          {cancellingId === bet.id ? (zh ? "取消中…" : "Cancelling…") : (zh ? "取消押注" : "Cancel Bet")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Stats Overview ── */}
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

    </div>
  );
}
