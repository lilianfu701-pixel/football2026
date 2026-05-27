"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGcBalance } from "@/context/GcBalance";
import { calcScoreOdds, netPayout } from "@/lib/scoreOdds";

interface TeamColors { primary: string; secondary: string; }

function formatGc(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function fmtOdds(x: number): string {
  return x % 1 === 0 ? `${x}×` : `${x.toFixed(1)}×`;
}

function fmtCountdown(ms: number): string {
  if (ms <= 0) return "";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export interface ScoreBet {
  id:             string;
  scoreHome:      number;
  scoreAway:      number;
  gcAmount:       number;
  oddsMultiplier: number;
  status:         string;
}

interface Props {
  matchId:      string;
  locale:       string;
  homeTeam:     string;
  awayTeam:     string;
  homeColors:   TeamColors;
  awayColors:   TeamColors;
  gcBalance:    number;
  myBets?:      ScoreBet[];
  kickoffTime?: string;
}

const MIN_BET   = 10_000; // 10K
const PCT_PRESETS: { pct: number; label: string }[] = [
  { pct: 0.05, label: "5%"  },
  { pct: 0.10, label: "10%" },
  { pct: 0.20, label: "20%" },
  { pct: 0.50, label: "50%" },
];
const ALL_IN_KEY = -1;

const DEFAULT_HOME: TeamColors = { primary: "#FFD700", secondary: "#FFD700" };
const DEFAULT_AWAY: TeamColors = { primary: "#A855F7", secondary: "#A855F7" };

export default function ScorePredictionPanel({
  matchId, locale, homeTeam, awayTeam,
  homeColors: hc = DEFAULT_HOME,
  awayColors: ac = DEFAULT_AWAY,
  myBets: initialBets = [],
  kickoffTime,
}: Props) {
  const zh     = locale === "zh";
  const router = useRouter();
  const { balance: gcBalance, setBalance: setGcBalance } = useGcBalance();

  const [myBets,       setMyBets]       = useState<ScoreBet[]>(initialBets);
  const [homeScore,    setHomeScore]    = useState("");
  const [awayScore,    setAwayScore]    = useState("");
  const [amount,       setAmount]       = useState(MIN_BET);
  const [amountStr,    setAmountStr]    = useState(String(MIN_BET));
  const [activePct,    setActivePct]    = useState<number | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [deleting,     setDeleting]     = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [success,      setSuccess]      = useState<string | null>(null);
  // Flag: trigger router.refresh() in useEffect so all state commits first
  const [needsRefresh, setNeedsRefresh] = useState(false);

  // ── Cancel window countdown ────────────────────────────────────────────────
  // Deadline = kickoff - 1 hour
  const cancelDeadline = kickoffTime
    ? new Date(kickoffTime).getTime() - 60 * 60 * 1000
    : null;

  const [countdown, setCountdown] = useState<string>("");
  const [canCancel, setCanCancel] = useState(false);

  useEffect(() => {
    if (!cancelDeadline) return;

    function tick() {
      const diff = cancelDeadline! - Date.now();
      setCanCancel(diff > 0);
      setCountdown(diff > 0 ? fmtCountdown(diff) : "");
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cancelDeadline]);

  // ── router.refresh() deferred to after all state commits ─────────────────
  useEffect(() => {
    if (needsRefresh) {
      router.refresh();
      setNeedsRefresh(false);
    }
  }, [needsRefresh, router]);

  // ── Score parsing ──────────────────────────────────────────────────────────
  const parsedHome = parseInt(homeScore, 10);
  const parsedAway = parseInt(awayScore, 10);
  const scoreReady = !isNaN(parsedHome) && !isNaN(parsedAway) && parsedHome >= 0 && parsedAway >= 0;

  const liveOdds     = scoreReady ? calcScoreOdds(parsedHome, parsedAway) : null;
  const potentialNet = liveOdds != null ? netPayout(amount, liveOdds) : 0;

  function handleScoreInput(side: "home" | "away", val: string) {
    const clean = val.replace(/[^0-9]/g, "").slice(0, 2);
    if (side === "home") setHomeScore(clean);
    else                 setAwayScore(clean);
    setError(null);
    setSuccess(null);
  }

  function handleAmountInput(val: string) {
    setAmountStr(val);
    setActivePct(null);
    const n = parseInt(val.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(n) && n > 0) setAmount(n);
  }

  function applyPreset(key: number, val: number) {
    setActivePct(key);
    setAmount(val);
    setAmountStr(String(val));
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit() {
    if (!scoreReady) {
      setError(zh ? "请填写双方比分" : "Please enter both scores");
      return;
    }
    if (amount < MIN_BET) {
      setError(zh ? `最低押注 ${formatGc(MIN_BET)} GC` : `Min bet ${formatGc(MIN_BET)} GC`);
      return;
    }
    if (amount > gcBalance) {
      setError(zh ? "GC余额不足" : "Insufficient GC");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res  = await fetch("/api/score-bets", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id:   matchId,
          score_home: parsedHome,
          score_away: parsedAway,
          gc_amount:  amount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMap: Record<string, string> = {
          Unauthorized:            zh ? "请先登录"       : "Please log in",
          "Match not found":       zh ? "比赛不存在"     : "Match not found",
          "Match already started": zh ? "比赛已开始"     : "Match already started",
          "Insufficient GC":       zh ? "GC余额不足"     : "Insufficient GC",
          "GC deduction failed":   zh ? "GC扣除失败"     : "GC deduction failed",
          "Insert failed":         zh ? "写入失败，请重试" : "Insert failed",
          "Invalid score":         zh ? "比分无效"       : "Invalid score",
        };
        setError(errMap[data.error ?? ""] ?? `${data.error}`);
      } else {
        const odds = data.oddsMultiplier as number;
        setGcBalance(Math.max(0, gcBalance - amount));

        setMyBets(prev => {
          const existing = prev.find(b => b.scoreHome === parsedHome && b.scoreAway === parsedAway);
          if (existing) {
            return prev.map(b =>
              b.scoreHome === parsedHome && b.scoreAway === parsedAway
                ? { ...b, gcAmount: b.gcAmount + amount, oddsMultiplier: odds }
                : b
            );
          }
          return [...prev, {
            id:             `tmp-${Date.now()}`,
            scoreHome:      parsedHome,
            scoreAway:      parsedAway,
            gcAmount:       amount,
            oddsMultiplier: odds,
            status:         "pending",
          }];
        });

        setSuccess(zh
          ? `✅ ${parsedHome}:${parsedAway} 押注成功！赔率 ${fmtOdds(odds)}`
          : `✅ ${parsedHome}:${parsedAway} placed at ${fmtOdds(odds)}`
        );
        setHomeScore("");
        setAwayScore("");
        setAmount(MIN_BET);
        setAmountStr(String(MIN_BET));
        setActivePct(null);
        setNeedsRefresh(true);
      }
    } catch {
      setError(zh ? "网络异常，请重试" : "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(betId: string, betAmount: number) {
    if (!canCancel) {
      setError(zh ? "已过取消截止时间" : "Cancel window has closed");
      return;
    }
    setDeleting(betId);
    setError(null);
    try {
      const res  = await fetch("/api/score-bets", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ bet_id: betId }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMap: Record<string, string> = {
          "Bet not found":              zh ? "注单不存在"     : "Bet not found",
          "Cannot cancel a settled bet": zh ? "已结算，无法取消" : "Already settled",
          "Cancel window closed (within 1 hour of kickoff)": zh ? "已过取消截止时间" : "Cancel window closed",
        };
        setError(errMap[data.error ?? ""] ?? data.error);
      } else {
        setGcBalance(gcBalance + betAmount);
        setMyBets(prev => prev.filter(b => b.id !== betId));
        setSuccess(zh
          ? `🔄 已取消，${formatGc(betAmount)} GC 已退还`
          : `🔄 Cancelled — ${formatGc(betAmount)} GC refunded`
        );
        setNeedsRefresh(true);
      }
    } catch {
      setError(zh ? "网络异常，请重试" : "Network error");
    } finally {
      setDeleting(null);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-4 mt-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">
          {zh ? "🎯 竞猜比分" : "🎯 Score Prediction"}
        </h3>
        {myBets.length > 0 && (
          <span className="text-xs text-gray-500">
            {zh ? `已押 ${myBets.length} 注` : `${myBets.length} bet${myBets.length > 1 ? "s" : ""}`}
          </span>
        )}
      </div>

      {/* ── Score input ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-3">
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <span className="text-[11px] font-bold truncate max-w-full" style={{ color: hc.primary }}>
            {homeTeam}
          </span>
          <input
            type="number" min={0} max={99}
            value={homeScore}
            onChange={(e) => handleScoreInput("home", e.target.value)}
            placeholder="0"
            style={homeScore !== "" ? { borderColor: `${hc.primary}99`, color: hc.primary } : {}}
            className={`w-full text-center text-3xl font-black bg-[#0A1628] border-2 rounded-2xl py-3 focus:outline-none transition-colors placeholder-[#1E3A5F] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
              homeScore !== "" ? "" : "border-[#1E3A5F] text-gray-400 focus:border-[#2E4A6F]"
            }`}
          />
        </div>

        <span className="text-2xl font-black text-gray-600 mt-5 shrink-0">:</span>

        <div className="flex flex-col items-center gap-1.5 flex-1">
          <span className="text-[11px] font-bold truncate max-w-full" style={{ color: ac.primary }}>
            {awayTeam}
          </span>
          <input
            type="number" min={0} max={99}
            value={awayScore}
            onChange={(e) => handleScoreInput("away", e.target.value)}
            placeholder="0"
            style={awayScore !== "" ? { borderColor: `${ac.primary}99`, color: ac.primary } : {}}
            className={`w-full text-center text-3xl font-black bg-[#0A1628] border-2 rounded-2xl py-3 focus:outline-none transition-colors placeholder-[#1E3A5F] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
              awayScore !== "" ? "" : "border-[#1E3A5F] text-gray-400 focus:border-[#2E4A6F]"
            }`}
          />
        </div>
      </div>

      {/* Live odds + payout preview */}
      {scoreReady && liveOdds && (
        <div className="mt-3 flex items-center justify-between bg-[#0A1628] rounded-xl px-4 py-2.5">
          <div>
            <p className="text-[10px] text-gray-500">{zh ? "赔率" : "Odds"}</p>
            <p className="text-[#FFD700] font-black text-lg leading-none mt-0.5">{fmtOdds(liveOdds)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500">{zh ? "若猜中可得" : "If correct"}</p>
            <p className="text-green-400 font-black text-lg leading-none mt-0.5">
              🪙 {formatGc(potentialNet)}
            </p>
          </div>
        </div>
      )}

      {/* ── Bet controls ──────────────────────────────────────────────────── */}
      <div className="mt-4 space-y-3">

        {/* Balance */}
        <div className="flex items-center justify-between bg-[#0A1628] rounded-xl px-3 py-2">
          <span className="text-xs text-gray-500">{zh ? "可用余额" : "Available"}</span>
          <span className="text-sm font-black text-[#FFD700]">🪙 {formatGc(gcBalance)} GC</span>
        </div>

        {/* Quick-bet presets */}
        <div>
          <p className="text-[11px] text-gray-500 mb-1.5">{zh ? "快速下注" : "Quick bet"}</p>
          <div className="grid grid-cols-5 gap-1.5">
            {PCT_PRESETS.map(({ pct, label }) => {
              const q      = Math.max(Math.floor(gcBalance * pct), 1);
              const active = activePct === pct;
              return (
                <button
                  key={pct}
                  onClick={() => applyPreset(pct, q)}
                  className={`flex flex-col items-center py-2 rounded-xl border-2 font-bold transition-all ${
                    active
                      ? "bg-[#FFD700]/15 border-[#FFD700]/60 text-[#FFD700]"
                      : "bg-[#0A1628] border-[#1E3A5F] text-gray-400 hover:border-gray-500/50 hover:text-gray-200"
                  }`}
                >
                  <span className="text-[11px]">{label}</span>
                  <span className="text-[9px] opacity-70 mt-0.5">{formatGc(q)}</span>
                </button>
              );
            })}
            <button
              onClick={() => applyPreset(ALL_IN_KEY, gcBalance)}
              className={`flex flex-col items-center py-2 rounded-xl border-2 font-black transition-all ${
                activePct === ALL_IN_KEY
                  ? "bg-[#FFD700]/15 border-[#FFD700]/60 text-[#FFD700]"
                  : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-400/50"
              }`}
            >
              <span className="text-[11px]">{zh ? "全押" : "All in"}</span>
              <span className="text-[9px] opacity-70 mt-0.5">{formatGc(gcBalance)}</span>
            </button>
          </div>
        </div>

        {/* Custom amount */}
        <div className="flex items-center gap-2 bg-[#0A1628] border border-[#1E3A5F] rounded-xl px-3 py-2.5 focus-within:border-[#FFD700]/50 transition-colors">
          <span className="text-gray-500 text-sm">🪙</span>
          <input
            type="number"
            value={amountStr}
            onChange={(e) => handleAmountInput(e.target.value)}
            placeholder={zh ? `最低 ${formatGc(MIN_BET)}` : `Min ${formatGc(MIN_BET)}`}
            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
          />
          <span className="text-xs text-gray-600 shrink-0">{amount > 0 ? formatGc(amount) : ""}</span>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2.5 rounded-xl">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-3 py-2.5 rounded-xl font-bold">
            {success}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !scoreReady || amount <= 0 || amount > gcBalance}
          className="w-full bg-[#FFD700] text-[#0A1628] font-black py-3 rounded-xl text-sm hover:bg-[#FFC200] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? (zh ? "提交中…" : "Placing…")
            : !scoreReady
            ? (zh ? "请填写比分" : "Enter a score first")
            : liveOdds
            ? (zh ? `以 ${fmtOdds(liveOdds)} 押注 ${parsedHome}:${parsedAway} →` : `Bet ${parsedHome}:${parsedAway} at ${fmtOdds(liveOdds)} →`)
            : (zh ? "确认押注 →" : "Place Bet →")}
        </button>

        <p className="text-[10px] text-gray-600 text-center leading-relaxed">
          {zh
            ? "赔率由泊松模型科学计算，含15%庄家优势。GoalCoin 为虚拟积分，不具备实际价值。"
            : "Odds calculated via Poisson model with 15% house margin. GC is virtual entertainment currency."}
        </p>
      </div>

      {/* ── My bets list ──────────────────────────────────────────────────── */}
      {myBets.length > 0 && (
        <div className="mt-4 border-t border-[#1E3A5F] pt-4">

          {/* Section title + cancel deadline */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-gray-500 font-bold">
              {zh ? "我的注单" : "My bets"}
            </p>
            {canCancel && countdown && (
              <span className="text-[10px] text-orange-400 font-bold">
                {zh ? `⏰ 截止取消 ${countdown}` : `⏰ Cancel closes in ${countdown}`}
              </span>
            )}
            {!canCancel && kickoffTime && (
              <span className="text-[10px] text-gray-600">
                {zh ? "已过取消截止" : "Cancellation closed"}
              </span>
            )}
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[2.5rem_2.5rem_3.5rem_3.5rem_1fr] gap-x-2 px-1 mb-1">
            <span className="text-[10px] text-gray-600">{zh ? "比分" : "Score"}</span>
            <span className="text-[10px] text-gray-600">{zh ? "赔率" : "Odds"}</span>
            <span className="text-[10px] text-gray-600">{zh ? "押注" : "Bet"}</span>
            <span className="text-[10px] text-gray-600">{zh ? "若中" : "Win"}</span>
            <span className="text-[10px] text-gray-600 text-right">{zh ? "状态" : "Status"}</span>
          </div>

          <div className="space-y-1.5">
            {myBets.map((b) => {
              const net       = netPayout(b.gcAmount, b.oddsMultiplier);
              const isPending = b.status === "pending";
              const isDel     = deleting === b.id;
              return (
                <div
                  key={b.id}
                  className="grid grid-cols-[2.5rem_2.5rem_3.5rem_3.5rem_1fr] gap-x-2 items-center bg-[#0A1628] rounded-xl px-3 py-2.5"
                >
                  {/* Score */}
                  <span className="text-sm font-black text-white">
                    {b.scoreHome}:{b.scoreAway}
                  </span>

                  {/* Odds */}
                  <span className="text-xs text-[#FFD700] font-bold">
                    {fmtOdds(b.oddsMultiplier)}
                  </span>

                  {/* Bet amount */}
                  <span className="text-[11px] text-gray-400 truncate">
                    {formatGc(b.gcAmount)}
                  </span>

                  {/* Potential win */}
                  <span className="text-[11px] text-green-400 font-bold truncate">
                    {formatGc(net)}
                  </span>

                  {/* Status + delete */}
                  <div className="flex items-center justify-end gap-1.5">
                    <span className={`text-[10px] font-bold ${
                      b.status === "won"  ? "text-green-400" :
                      b.status === "lost" ? "text-red-400"   :
                      "text-blue-400"
                    }`}>
                      {b.status === "won"  ? (zh ? "✅ 中了" : "✅ Won")  :
                       b.status === "lost" ? (zh ? "❌ 未中" : "❌ Lost") :
                                             (zh ? "⏳ 待开" : "⏳ Pending")}
                    </span>

                    {isPending && canCancel && (
                      <button
                        onClick={() => handleDelete(b.id, b.gcAmount)}
                        disabled={isDel}
                        className="text-[10px] text-red-400/70 hover:text-red-400 border border-red-500/20 hover:border-red-400/50 rounded px-1.5 py-0.5 transition-colors disabled:opacity-40"
                      >
                        {isDel ? "…" : (zh ? "取消" : "Del")}
                      </button>
                    )}
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
