"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getFlagCode, getTeamDisplayName } from "@/lib/flags";
import { netPayout } from "@/lib/scoreOdds";
import { lc } from "@/i18n/content";

// ── Types ────────────────────────────────────────────────────────────────────

interface MatchInfo {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffTime: string;
  stage: string;
  stageLabel: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
}

interface BetRecord {
  id: string;
  prediction: string;
  gcAmount: number;
  odds: number;
  potentialPayout: number;
  status: string;
  createdAt: string;
  match: MatchInfo | null;
}

interface ScoreBetRecord {
  id: string;
  scoreHome: number;
  scoreAway: number;
  gcAmount: number;
  oddsMultiplier: number;
  status: string;
  createdAt: string;
  match: MatchInfo | null;
}

interface Stats {
  totalBets: number;
  wonBets: number;
  lostBets: number;
  pendingBets: number;
  winRate: number;
  totalWon: number;
  totalStaked: number;
}

interface Props {
  locale: string;
  user: { id: string } | null;
  stats: Stats;
  betHistory: BetRecord[];
  scoreBetHistory: ScoreBetRecord[];
}

const TAB_KEYS = ["all", "pending", "won", "lost"] as const;
type TabKey = (typeof TAB_KEYS)[number];

// ── Sub-components ────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + "M";
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + "K";
  return String(n);
}

function TeamFlag({ team, size = 18 }: { team: string; size?: number }) {
  const code = getFlagCode(team);
  if (!code) return <span className="text-sm shrink-0">🏳️</span>;
  return (
    <Image
      src={`https://flagcdn.com/w40/${code}.png`}
      alt=""
      width={size}
      height={Math.round(size * 0.7)}
      className="rounded-sm shrink-0"
      unoptimized
    />
  );
}

function StatusBadge({ status, locale }: { status: string; locale: string }) {
  const zh = locale === "zh";
  const base = "text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0";
  if (status === "won")      return <span className={`${base} bg-green-500/15 text-green-400`}>🎉{lc(locale, "赢", "Won")}</span>;
  if (status === "lost")     return <span className={`${base} bg-red-500/15 text-red-400`}>💔{lc(locale, "输", "Lost")}</span>;
  if (status === "refunded") return <span className={`${base} bg-gray-500/15 text-gray-400`}>{lc(locale, "退款", "Refund")}</span>;
  return <span className={`${base} bg-blue-500/15 text-blue-400`}>⏳{lc(locale, "待结算", "Pending")}</span>;
}

interface TabBarProps {
  active: TabKey;
  onSelect: (t: TabKey) => void;
  counts: Record<TabKey, number>;
  locale: string;
}
function TabBar({ active, onSelect, counts, locale }: TabBarProps) {
  const zh = locale === "zh";
  const labels: Record<TabKey, string> = {
    all:     lc(locale, "全部", "All"),
    pending: lc(locale, "待结算", "Pending"),
    won:     lc(locale, "赢", "Won"),
    lost:    lc(locale, "输", "Lost"),
  };
  return (
    <div className="flex gap-1 bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-1 mb-3">
      {TAB_KEYS.map((t) => (
        <button
          key={t}
          onClick={() => onSelect(t)}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
            active === t ? "bg-[#FFD700] text-[#0A1628]" : "text-gray-500 hover:text-white"
          }`}
        >
          {labels[t]}
          {counts[t] > 0 && (
            <span className={`text-[10px] px-1 rounded-full font-black ${
              active === t ? "bg-[#0A1628]/20 text-[#0A1628]" : "bg-[#1E3A5F] text-gray-400"
            }`}>{counts[t]}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ tab, locale, href }: { tab: TabKey; locale: string; href: string }) {
  const zh = locale === "zh";
  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-8 text-center">
      <p className="text-gray-500 text-sm">
        {tab === "all"
          ? (lc(locale, "还没有预测记录，去比赛页面开始预测吧！", "No predictions yet — visit a match to place one!"))
          : (lc(locale, "该分类暂无记录", "No records in this category"))}
      </p>
      {tab === "all" && (
        <Link href={href} className="inline-block mt-3 text-[#FFD700] text-xs font-bold hover:underline">
          {lc(locale, "浏览比赛 →", "Browse matches →")}
        </Link>
      )}
    </div>
  );
}

function tabCounts(bets: { status: string }[]): Record<TabKey, number> {
  return {
    all:     bets.length,
    pending: bets.filter((b) => b.status === "pending").length,
    won:     bets.filter((b) => b.status === "won").length,
    lost:    bets.filter((b) => b.status === "lost").length,
  };
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PredictClient({ locale, user, stats, betHistory, scoreBetHistory }: Props) {
  const zh = locale === "zh";
  const router = useRouter();

  const [tab1, setTab1] = useState<TabKey>("all");
  const [tab2, setTab2] = useState<TabKey>("all");
  const [cancellingId, setCancellingId]           = useState<string | null>(null);
  const [cancellingScoreId, setCancellingScoreId] = useState<string | null>(null);
  const [cancelError, setCancelError]             = useState<string | null>(null);
  const [sharedId, setSharedId]                   = useState<string | null>(null);

  async function cancelBet(betId: string) {
    if (cancellingId) return;
    if (!window.confirm(lc(locale, "确定取消这笔预测吗？消耗金额将退还到你的余额。", "Cancel this prediction? Your stake will be refunded."))) return;
    setCancellingId(betId);
    setCancelError(null);
    try {
      const res  = await fetch("/api/bets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bet_id: betId }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setCancelError(data?.error ?? (lc(locale, "取消失败，请重试", "Cancel failed"))); return; }
      router.refresh();
    } catch { setCancelError(lc(locale, "网络错误，请重试", "Network error")); }
    finally   { setCancellingId(null); }
  }

  async function cancelScoreBet(betId: string) {
    if (cancellingScoreId) return;
    if (!window.confirm(lc(locale, "确定取消这笔比分预测吗？消耗金额将退还到你的余额。", "Cancel this score prediction? Your stake will be refunded."))) return;
    setCancellingScoreId(betId);
    setCancelError(null);
    try {
      const res  = await fetch("/api/score-bets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bet_id: betId }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setCancelError(data?.error ?? (lc(locale, "取消失败，请重试", "Cancel failed"))); return; }
      router.refresh();
    } catch { setCancelError(lc(locale, "网络错误，请重试", "Network error")); }
    finally   { setCancellingScoreId(null); }
  }

  async function shareItem(id: string, text: string, url: string) {
    try {
      if (navigator.share) {
        await navigator.share({ text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
      }
      setSharedId(id);
      setTimeout(() => setSharedId((prev) => (prev === id ? null : prev)), 2000);
    } catch { /* user cancelled */ }
  }

  const filtered1 = tab1 === "all" ? betHistory      : betHistory.filter((b) => b.status === tab1);
  const filtered2 = tab2 === "all" ? scoreBetHistory : scoreBetHistory.filter((b) => b.status === tab2);
  const cnt1 = tabCounts(betHistory);
  const cnt2 = tabCounts(scoreBetHistory);

  // Shared button class strings — compact action chips
  const actionBtn = "text-[9px] leading-none text-gray-400 hover:text-white border border-[#1E3A5F] hover:border-gray-500 rounded px-1.5 py-1 transition-colors whitespace-nowrap";
  const cancelBtn = "text-[9px] leading-none text-red-400/80 hover:text-red-400 border border-red-500/20 hover:border-red-400/50 rounded px-1.5 py-1 transition-colors disabled:opacity-40 whitespace-nowrap";

  return (
    <div className="space-y-6">

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* 1. 输赢预测                                                          */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {user && (
        <section>
          <h2 className="text-base font-black text-white mb-3">
            🏆 {lc(locale, "输赢预测", "Match Predictions")}
          </h2>

          <TabBar active={tab1} onSelect={setTab1} counts={cnt1} locale={locale} />

          {cancelError && (
            <div className="mb-3 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 text-xs text-red-400">
              ⚠ {cancelError}
            </div>
          )}

          {filtered1.length === 0 ? (
            <EmptyState tab={tab1} locale={locale} href={`/${locale}/matches`} />
          ) : (
            <div className="space-y-2">
              {filtered1.map((bet) => {
                const m        = bet.match;
                const homeName = m ? getTeamDisplayName(m.homeTeam, locale) : "—";
                const awayName = m ? getTeamDisplayName(m.awayTeam, locale) : "—";
                const pickLbl  =
                  bet.prediction === "home" ? (zh ? `${homeName} 胜` : `${homeName} Win`) :
                  bet.prediction === "away" ? (zh ? `${awayName} 胜` : `${awayName} Win`) :
                  (lc(locale, "平局", "Draw"));
                const pickColor =
                  bet.prediction === "home" ? "text-blue-400" :
                  bet.prediction === "away" ? "text-amber-400" : "text-gray-400";
                const isWon    = bet.status === "won";
                const isLost   = bet.status === "lost";
                const isPending = bet.status === "pending";
                const cardBorder = isWon ? "border-green-500/20" : isLost ? "border-red-500/20" : "border-[#1E3A5F]";

                return (
                  <div key={bet.id} className={`bg-[#0F2040] border ${cardBorder} rounded-xl px-3 py-2`}>

                    {/* ── Row 1: 两队 · 赛果 · 状态 · 收益 ──────────────── */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
                        <TeamFlag team={m?.homeTeam ?? ""} size={16} />
                        <span className="text-xs font-bold text-white truncate">{homeName}</span>
                        <span className="text-[10px] text-gray-600 shrink-0 mx-0.5">vs</span>
                        <TeamFlag team={m?.awayTeam ?? ""} size={16} />
                        <span className="text-xs font-bold text-white truncate">{awayName}</span>
                        {m && (m.status === "finished" || m.status === "live") && m.homeScore !== null && (
                          <span className="text-[10px] text-gray-600 shrink-0 ml-0.5">
                            ({m.homeScore}–{m.awayScore})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusBadge status={bet.status} locale={locale} />
                        {isWon    && <span className="text-sm font-black text-green-400">+{fmt(bet.potentialPayout)}</span>}
                        {isLost   && <span className="text-sm font-black text-red-400">−{fmt(bet.gcAmount)}</span>}
                        {isPending && <span className="text-xs font-bold text-gray-500">→{fmt(bet.potentialPayout)}</span>}
                      </div>
                    </div>

                    {/* ── Row 2: 预测选项 · 押注 · 按钮 ─────────────────── */}
                    <div className="flex items-center justify-between gap-1.5 mt-1.5 pt-1.5 border-t border-[#1E3A5F]/40">
                      <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                        <span className={`text-[11px] font-bold shrink-0 ${pickColor}`}>{pickLbl}</span>
                        <span className="text-[10px] text-gray-600 shrink-0">·</span>
                        <span className="text-[10px] text-gray-500 shrink-0">
                          {lc(locale, "押", "")}{fmt(bet.gcAmount)} GC ×{(bet.odds ?? 0).toFixed(1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => shareItem(
                            bet.id,
                            zh
                              ? `我在Football2026预测了【${homeName} vs ${awayName}】${pickLbl}！押${fmt(bet.gcAmount)}GC，赔率×${bet.odds.toFixed(1)}`
                              : `I predicted ${m?.homeTeam} vs ${m?.awayTeam} on Football2026!`,
                            `${window.location.origin}/${locale}/matches/${m?.id ?? ""}`
                          )}
                          className={actionBtn}
                        >
                          {sharedId === bet.id ? (lc(locale, "✓已复制", "✓ Copied")) : (lc(locale, "分享", "Share"))}
                        </button>
                        {m && (
                          <Link href={`/${locale}/matches/${m.id}`} className={actionBtn}>
                            {lc(locale, "详情", "Details")}
                          </Link>
                        )}
                        {isPending && (
                          <button
                            onClick={() => cancelBet(bet.id)}
                            disabled={cancellingId === bet.id}
                            className={cancelBtn}
                          >
                            {cancellingId === bet.id ? "…" : (lc(locale, "取消", "Cancel"))}
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* 2. 比分预测                                                          */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {user && (
        <section>
          <h2 className="text-base font-black text-white mb-3">
            🎯 {lc(locale, "比分预测", "Score Predictions")}
          </h2>

          <TabBar active={tab2} onSelect={setTab2} counts={cnt2} locale={locale} />

          {filtered2.length === 0 ? (
            <EmptyState tab={tab2} locale={locale} href={`/${locale}/matches`} />
          ) : (
            <div className="space-y-2">
              {filtered2.map((bet) => {
                const m        = bet.match;
                const homeName = m ? getTeamDisplayName(m.homeTeam, locale) : "—";
                const awayName = m ? getTeamDisplayName(m.awayTeam, locale) : "—";
                const payout   = netPayout(bet.gcAmount, bet.oddsMultiplier);
                const isWon    = bet.status === "won";
                const isLost   = bet.status === "lost";
                const isPending = bet.status === "pending";
                const cardBorder = isWon ? "border-green-500/20" : isLost ? "border-red-500/20" : "border-[#1E3A5F]";

                return (
                  <div key={bet.id} className={`bg-[#0F2040] border ${cardBorder} rounded-xl px-3 py-2`}>

                    {/* ── Row 1: 两队 · 预测比分 · 状态 · 收益 ─────────── */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
                        <TeamFlag team={m?.homeTeam ?? ""} size={16} />
                        <span className="text-xs font-bold text-white truncate">{homeName}</span>
                        <span className="text-xs font-black text-[#FFD700] shrink-0 mx-1.5">
                          {bet.scoreHome}:{bet.scoreAway}
                        </span>
                        <span className="text-xs font-bold text-white truncate">{awayName}</span>
                        <TeamFlag team={m?.awayTeam ?? ""} size={16} />
                        {m && (m.status === "finished" || m.status === "live") && m.homeScore !== null && (
                          <span className="text-[10px] text-gray-600 shrink-0 ml-0.5">
                            ({m.homeScore}–{m.awayScore})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusBadge status={bet.status} locale={locale} />
                        {isWon    && <span className="text-sm font-black text-green-400">+{fmt(payout)}</span>}
                        {isLost   && <span className="text-sm font-black text-red-400">−{fmt(bet.gcAmount)}</span>}
                        {isPending && <span className="text-xs font-bold text-gray-500">→{fmt(payout)}</span>}
                      </div>
                    </div>

                    {/* ── Row 2: 押注信息 · 按钮 ────────────────────────── */}
                    <div className="flex items-center justify-between gap-1.5 mt-1.5 pt-1.5 border-t border-[#1E3A5F]/40">
                      <span className="text-[10px] text-gray-500 shrink-0">
                        {lc(locale, "押", "")}{fmt(bet.gcAmount)} GC · ×{bet.oddsMultiplier.toFixed(1)}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => shareItem(
                            bet.id,
                            zh
                              ? `我在Football2026预测了【${homeName} vs ${awayName}】比分${bet.scoreHome}:${bet.scoreAway}！押${fmt(bet.gcAmount)}GC，赔率×${bet.oddsMultiplier.toFixed(1)}`
                              : `I predicted ${m?.homeTeam} vs ${m?.awayTeam} ${bet.scoreHome}:${bet.scoreAway} on Football2026!`,
                            `${window.location.origin}/${locale}/matches/${m?.id ?? ""}`
                          )}
                          className={actionBtn}
                        >
                          {sharedId === bet.id ? (lc(locale, "✓已复制", "✓ Copied")) : (lc(locale, "分享", "Share"))}
                        </button>
                        {m && (
                          <Link href={`/${locale}/matches/${m.id}`} className={actionBtn}>
                            {lc(locale, "详情", "Details")}
                          </Link>
                        )}
                        {isPending && (
                          <button
                            onClick={() => cancelScoreBet(bet.id)}
                            disabled={cancellingScoreId === bet.id}
                            className={cancelBtn}
                          >
                            {cancellingScoreId === bet.id ? "…" : (lc(locale, "取消", "Cancel"))}
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* 统计概览                                                             */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {user && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: lc(locale, "预测场次", "Total Bets"),  value: stats.totalBets,             color: "text-white",        emoji: "🎯" },
            { label: lc(locale, "胜率", "Win Rate"),     value: `${stats.winRate}%`,          color: stats.winRate >= 60 ? "text-green-400" : stats.winRate >= 40 ? "text-yellow-400" : "text-red-400", emoji: "📈" },
            { label: lc(locale, "累计赢得", "Total Won"),    value: `${fmt(stats.totalWon)} GC`, color: "text-green-400",    emoji: "🪙" },
            { label: lc(locale, "进行中", "In Progress"),  value: stats.pendingBets,            color: "text-blue-400",     emoji: "⏳" },
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
