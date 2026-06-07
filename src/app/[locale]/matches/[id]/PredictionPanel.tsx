"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getFlagUrl } from "@/lib/flags";
import ShareBetModal, { type BetPick } from "../ShareBetModal";
import { useGcBalance } from "@/context/GcBalance";
import { lc } from "@/i18n/content";

interface TeamColors { primary: string; secondary: string; }

// Append 2-digit hex opacity: hexOp("#FF0000", 0.15) → "#FF000026"
function hexOp(hex: string, alpha: number): string {
  return hex + Math.round(alpha * 255).toString(16).padStart(2, "0");
}

interface PredictionPanelProps {
  matchId:      string;
  locale:       string;
  homeTeam:     string;
  awayTeam:     string;
  homeTeamZh?:  string;
  awayTeamZh?:  string;
  homeFlag:     string;
  awayFlag:     string;
  homeColors?:  TeamColors;
  awayColors?:  TeamColors;
  /** Parimutuel pool amounts (GC already bet on each side) */
  poolHome:     number;
  poolDraw:     number;
  poolAway:     number;
  /** Reference odds from Bet365 — used as display when pool is not yet formed */
  refOddsHome:  number;
  refOddsDraw:  number;
  refOddsAway:  number;
  gcBalance:    number;
  username:     string;
  stageLabel?:  string;
  existingBet: {
    id?:              string;
    prediction:       string;
    gc_amount:        number;
    status:           string;
    potential_payout: number;
  } | null;
  kickoffTime?: string;
}

const MIN_BET = 10_000; // 10K
const PCT_PRESETS = [0.05, 0.10, 0.20, 0.50] as const;

function formatGc(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)}B`;
  if (amount >= 1_000_000)     return `${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`;
  if (amount >= 1_000)         return `${(amount / 1_000).toFixed(0)}K`;
  return String(amount);
}

/** 取选项对应的参考倍率 */
function refOdds(
  selection: "home" | "draw" | "away",
  refHome: number, refDraw: number, refAway: number,
): number {
  return selection === "home" ? refHome : selection === "draw" ? refDraw : refAway;
}

const DEFAULT_HOME: TeamColors = { primary: "#FFD700", secondary: "#FFD700" };
const DEFAULT_AWAY: TeamColors = { primary: "#A855F7", secondary: "#A855F7" };

function fmtCountdown(ms: number): string {
  if (ms <= 0) return "";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export default function PredictionPanel({
  matchId, locale, homeTeam, awayTeam, homeTeamZh, awayTeamZh,
  homeFlag, awayFlag,
  homeColors: hc = DEFAULT_HOME,
  awayColors: ac = DEFAULT_AWAY,
  poolHome: initPoolHome,
  poolDraw: initPoolDraw,
  poolAway: initPoolAway,
  refOddsHome, refOddsDraw, refOddsAway,
  gcBalance: _gcBalanceProp,
  username, stageLabel, existingBet, kickoffTime,
}: PredictionPanelProps) {
  const router = useRouter();
  const { balance: gcBalance, setBalance: setGcBalance } = useGcBalance();

  const [selected,    setSelected]    = useState<"home" | "draw" | "away" | null>(
    existingBet ? (existingBet.prediction as "home" | "draw" | "away") : null
  );
  const [amount,      setAmount]      = useState(existingBet?.gc_amount ?? 100_000);
  const [amountInput, setAmountInput] = useState(String(existingBet?.gc_amount ?? 100_000));
  const [loading,     setLoading]     = useState(false);
  const [cancelling,  setCancelling]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [success,     setSuccess]     = useState(false);
  const [newBetId,    setNewBetId]    = useState<string | null>(null);
  const [cancelled,   setCancelled]   = useState(false);
  const [showShare,   setShowShare]   = useState(false);

  // Live pool state (updated after a successful bet so the UI refreshes immediately)
  const [poolHome, setPoolHome] = useState(initPoolHome);
  const [poolDraw, setPoolDraw] = useState(initPoolDraw);
  const [poolAway, setPoolAway] = useState(initPoolAway);

  // ── Cancel window countdown ──────────────────────────────────────────────
  const cancelDeadline = kickoffTime
    ? new Date(kickoffTime).getTime() - 60 * 60 * 1000
    : null;

  const [countdown, setCountdown] = useState<string>("");
  const [canCancel,  setCanCancel]  = useState(false);

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

  const isLocked = !!existingBet && !cancelled;

  // ── Payout estimate uses fixed reference odds (Bet365) ───────────────────
  const estMult   = selected ? refOdds(selected, refOddsHome, refOddsDraw, refOddsAway) : 1;
  const estPayout = Math.round(amount * estMult);

  const totalPool  = poolHome + poolDraw + poolAway;

  function handleAmountInput(val: string) {
    setAmountInput(val);
    const num = parseInt(val.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(num) && num > 0) setAmount(num);
  }

  function setQuickAmount(val: number) {
    setAmount(val);
    setAmountInput(String(val));
  }

  async function handleSubmit() {
    if (!selected) { setError(lc(locale, "请先选择预测结果", "Please select a prediction")); return; }
    if (amount < MIN_BET) { setError(zh ? `最低消耗 ${formatGc(MIN_BET)} GC` : `Minimum bet is ${formatGc(MIN_BET)} GC`); return; }
    if (amount > gcBalance) { setError(lc(locale, "GC余额不足", "Insufficient GoalCoins")); return; }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/bets", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ match_id: matchId, prediction: selected, gc_amount: amount }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError((data.detail ?? data.error) ?? (lc(locale, "下注失败，请重试", "Failed to place prediction")));
      } else {
        setSuccess(true);
        setNewBetId(data.bet_id ?? null);
        // Update shared GC balance immediately
        setGcBalance(Math.max(0, gcBalance - amount));
        // Update local pool state so UI reflects the new bet without a page reload
        if (data.pools) {
          setPoolHome(data.pools.home);
          setPoolDraw(data.pools.draw);
          setPoolAway(data.pools.away);
        }
        router.refresh();
      }
    } catch {
      setError(lc(locale, "网络异常，请重试", "Network error. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    const betIdToCancel = newBetId ?? existingBet?.id;
    if (!betIdToCancel) return;
    setCancelling(true);
    setError(null);
    try {
      const res  = await fetch("/api/bets", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ bet_id: betIdToCancel }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMap: Record<string, string> = {
          "Bet not found":              lc(locale, "注单不存在", "Bet not found"),
          "Cannot cancel a settled bet": lc(locale, "已结算，无法取消", "Already settled"),
          "Cancel window closed":        lc(locale, "已过取消截止时间", "Cancel window closed"),
          "Cancel window closed (within 1 hour of kickoff)": lc(locale, "已过取消截止时间", "Cancel window closed"),
        };
        setError(errMap[data.error ?? ""] ?? data.error);
      } else {
        const refundAmt = newBetId ? amount : (existingBet?.gc_amount ?? 0);
        setGcBalance(gcBalance + refundAmt);
        setSuccess(false);
        setNewBetId(null);
        setCancelled(true);
        setSelected(null);
        router.refresh();
      }
    } catch {
      setError(lc(locale, "网络异常，请重试", "Network error"));
    } finally {
      setCancelling(false);
    }
  }

  const zh = locale === "zh";

  // ── Pool bar widths ───────────────────────────────────────────────────────
  const barTotal = poolHome + poolDraw + poolAway || 1;
  const barHome  = Math.round((poolHome / barTotal) * 100);
  const barDraw  = Math.round((poolDraw / barTotal) * 100);
  const barAway  = 100 - barHome - barDraw;

  const options = [
    { key: "home" as const, label: zh ? (homeTeamZh ?? homeTeam) : homeTeam, pool: poolHome },
    { key: "draw" as const, label: lc(locale, "平局", "Draw"),                      pool: poolDraw },
    { key: "away" as const, label: zh ? (awayTeamZh ?? awayTeam) : awayTeam, pool: poolAway },
  ];

  // ── Success screen ────────────────────────────────────────────────────────
  if (success && selected) {
    return (
      <>
        <div className="bg-[#0F2040] border border-[#FFD700]/40 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-white font-bold text-lg mb-1">
            {lc(locale, "预测成功！", "Prediction Placed!")}
          </p>
          <p className="text-gray-400 text-sm mb-2">
            {lc(locale, "你的预测：", "You predicted ")}
            <span className="text-[#FFD700] font-bold">
              {selected === "home"
                ? (zh ? homeTeamZh ?? homeTeam : homeTeam) + (lc(locale, " 胜", " Win"))
                : selected === "away"
                ? (zh ? awayTeamZh ?? awayTeam : awayTeam) + (lc(locale, " 胜", " Win"))
                : lc(locale, "平局", "Draw")}
            </span>
          </p>
          <p className="text-gray-400 text-sm mb-5">
            {lc(locale, "潜在获得：", "Potential win: ")}
            <span className="text-green-400 font-bold">🪙 {formatGc(estPayout)} GC</span>
            <span className="text-gray-600 text-xs ml-1">(×{estMult.toFixed(2)})</span>
          </p>

          <button
            onClick={() => setShowShare(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FFD700] text-[#0A1628] font-black text-sm hover:bg-[#FFC200] transition-colors"
          >
            📤 {lc(locale, "分享我的预测", "Share My Prediction")}
          </button>

          {/* 取消按钮 — 仅在取消窗口内且有 bet_id 时显示 */}
          {canCancel && newBetId && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="mt-2 w-full py-2 rounded-xl border border-red-500/25 text-red-400/70 hover:text-red-400 hover:border-red-400/50 text-xs font-bold transition-colors disabled:opacity-40"
            >
              {cancelling ? (lc(locale, "取消中…", "Cancelling…")) : (lc(locale, "🗑 取消这次预测", "🗑 Cancel this bet"))}
            </button>
          )}
        </div>

        {showShare && (
          <ShareBetModal
            locale={locale}
            matchId={matchId}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            homeTeamZh={homeTeamZh}
            awayTeamZh={awayTeamZh}
            pick={selected as BetPick}
            gcAmount={amount}
            odds={parseFloat(estMult.toFixed(2))}
            username={username}
            stageLabel={stageLabel}
            onClose={() => setShowShare(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-4">
      <h3 className="text-sm font-bold text-white mb-3">
        {lc(locale, "🎯 输赢预测", "🎯 Match Prediction")}
      </h3>

      {/* ── Outcome options — compact ────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {options.map((opt) => {
          const isSelected = selected === opt.key;
          const estM       = refOdds(opt.key, refOddsHome, refOddsDraw, refOddsAway);

          const selColor = opt.key === "home" ? hc.primary
                         : opt.key === "away" ? ac.primary
                         : "#60A5FA";

          const buttonStyle = isSelected ? {
            borderColor:     hexOp(selColor, 0.5),
            backgroundColor: hexOp(selColor, 0.10),
          } : {};

          return (
            <button
              key={opt.key}
              onClick={() => !isLocked && setSelected(opt.key)}
              disabled={isLocked}
              style={buttonStyle}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 transition-all ${
                isSelected ? ""
                : isLocked ? "border-[#1E3A5F] opacity-60 cursor-default"
                : "border-[#1E3A5F] hover:border-gray-500/40 cursor-pointer"
              }`}
            >
              {opt.key === "draw" ? (
                <span className="text-lg leading-none">🤝</span>
              ) : (
                <div className="w-8 h-5 relative overflow-hidden rounded-sm">
                  <Image
                    src={getFlagUrl(opt.key === "home" ? homeTeam : awayTeam, 80)}
                    alt={opt.label} fill className="object-cover" unoptimized
                  />
                </div>
              )}
              <span className="text-[11px] font-bold truncate w-full text-center leading-tight"
                style={{ color: isSelected ? selColor : "#D1D5DB" }}>
                {opt.label}
              </span>
              <span className="text-[11px] font-black"
                style={{ color: isSelected ? selColor : "#6B7280" }}>
                ×{estM.toFixed(2)}
              </span>
            </button>
          );
        })}
      </div>

      {isLocked ? (
        /* ── Existing bet summary ─────────────────────────────────────── */
        <div className="space-y-3">

          {/* 预测 / 预计获得 / 状态 — 横排一行 */}
          <div className="grid grid-cols-3 gap-1 bg-[#0A1628] rounded-xl px-3 py-2.5">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-500 mb-0.5">{lc(locale, "消耗", "Bet")}</span>
              <span className="text-xs font-black text-white">🪙 {formatGc(existingBet!.gc_amount)}</span>
            </div>
            <div className="flex flex-col items-center border-x border-[#1E3A5F]">
              <span className="text-[10px] text-gray-500 mb-0.5">
                {existingBet!.status === "won" ? (lc(locale, "实际获得", "Won"))
                : existingBet!.status === "lost" ? (lc(locale, "未中", "Lost"))
                : (lc(locale, "预计获得", "Est. win"))}
              </span>
              <span className={`text-xs font-black ${
                existingBet!.status === "won"  ? "text-green-400" :
                existingBet!.status === "lost" ? "text-red-400"   : "text-green-400"
              }`}>
                🪙 {formatGc(
                  existingBet!.status === "won" || existingBet!.status === "lost"
                    ? existingBet!.potential_payout
                    : Math.round(existingBet!.gc_amount * refOdds(
                        existingBet!.prediction as "home"|"draw"|"away",
                        refOddsHome, refOddsDraw, refOddsAway))
                )}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-500 mb-0.5">{lc(locale, "状态", "Status")}</span>
              <span className={`text-xs font-black ${
                existingBet!.status === "won"  ? "text-green-400" :
                existingBet!.status === "lost" ? "text-red-400"   : "text-blue-400"
              }`}>
                {existingBet!.status === "won"  ? (lc(locale, "✅ 中了", "✅ Won"))  :
                 existingBet!.status === "lost" ? (lc(locale, "❌ 未中", "❌ Lost")) :
                                                  (lc(locale, "⏳ 待开", "⏳ Pending"))}
              </span>
            </div>
          </div>

          {/* 分享 + 取消 — 同一行 */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowShare(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#FFD700] hover:bg-[#FFC200] text-[#0A1628] text-sm font-black transition-colors"
            >
              📤 {lc(locale, "分享预测", "Share")}
            </button>

            {existingBet?.status === "pending" && existingBet?.id && (
              <button
                onClick={handleCancel}
                disabled={cancelling || !canCancel}
                className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  canCancel
                    ? "border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-400/50"
                    : "border-[#1E3A5F] text-gray-600 cursor-not-allowed opacity-50"
                }`}
              >
                {cancelling ? "…" : (lc(locale, "🗑 取消", "🗑 Cancel"))}
              </button>
            )}
          </div>


          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded-xl">
              {error}
            </div>
          )}

          {showShare && selected && (
            <ShareBetModal
              locale={locale}
              matchId={matchId}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              homeTeamZh={homeTeamZh}
              awayTeamZh={awayTeamZh}
              pick={selected as BetPick}
              gcAmount={existingBet!.gc_amount}
              odds={parseFloat(refOdds(selected, refOddsHome, refOddsDraw, refOddsAway).toFixed(2))}
              username={username}
              stageLabel={stageLabel}
              onClose={() => setShowShare(false)}
            />
          )}
        </div>
      ) : (
        /* ── Bet amount input ──────────────────────────────────────────── */
        <div className="space-y-4">
          {/* Balance display */}
          <div className="flex items-center justify-between bg-[#0A1628] rounded-xl px-4 py-2.5">
            <span className="text-xs text-gray-500">{lc(locale, "可用GC余额", "Available Balance")}</span>
            <span className="text-sm font-black text-[#FFD700]">
              🪙 {formatGc(gcBalance)} GC
            </span>
          </div>

          {/* Percentage quick-bet */}
          <div>
            <p className="text-xs text-gray-500 mb-2">{lc(locale, "快速下注", "Quick Bet")}</p>
            <div className="grid grid-cols-5 gap-1">
              {PCT_PRESETS.map((pct) => {
                const q = Math.max(Math.floor(gcBalance * pct), 1);
                const isActive = amount === q;
                return (
                  <button
                    key={pct}
                    onClick={() => setQuickAmount(q)}
                    className={`text-[11px] py-1.5 rounded-lg font-bold transition-colors border flex flex-col items-center gap-0.5 ${
                      isActive
                        ? "bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/50"
                        : "bg-[#0A1628] text-gray-400 border-[#1E3A5F] hover:text-white hover:border-gray-500"
                    }`}
                  >
                    <span>{Math.round(pct * 100)}%</span>
                    <span className="text-[9px] opacity-70">{formatGc(q)}</span>
                  </button>
                );
              })}
              <button
                onClick={() => setQuickAmount(gcBalance)}
                className={`text-[11px] py-1.5 rounded-lg font-black transition-colors border flex flex-col items-center gap-0.5 ${
                  amount === gcBalance
                    ? "bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/50"
                    : "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                }`}
              >
                <span>{lc(locale, "全押", "All in")}</span>
                <span className="text-[9px] opacity-70">{formatGc(gcBalance)}</span>
              </button>
            </div>
          </div>

          {/* Custom amount input */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5">{lc(locale, "自定义金额", "Custom amount")}</p>
            <div className="flex items-center gap-2 bg-[#0A1628] border border-[#1E3A5F] rounded-xl px-4 py-3 focus-within:border-[#FFD700]/60 transition-colors">
              <span className="text-gray-500 text-sm">🪙</span>
              <input
                type="number"
                value={amountInput}
                onChange={(e) => handleAmountInput(e.target.value)}
                placeholder={zh ? `最低 ${formatGc(MIN_BET)}` : `Min ${formatGc(MIN_BET)}`}
                min={MIN_BET}
                max={gcBalance}
                className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
              />
              <span className="text-xs text-gray-600 shrink-0">
                {amount > 0 ? formatGc(amount) : ""}
              </span>
            </div>
          </div>

          {/* Payout preview */}
          {selected && amount > 0 && (
            <div className="bg-[#0A1628] rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{lc(locale, "预计获得", "Potential win")}</p>
                <p className="text-green-400 font-black text-lg">🪙 {formatGc(estPayout)} GC</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">{lc(locale, "倍率", "Odds")}</p>
                <p className="text-[#FFD700] font-bold text-lg">×{estMult.toFixed(2)}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !selected || amount <= 0 || amount > gcBalance}
            className="w-full bg-[#FFD700] text-[#0A1628] font-black py-3.5 rounded-xl text-sm hover:bg-[#FFC200] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? (lc(locale, "提交中…", "Placing…"))
              : !selected
              ? (lc(locale, "请先选择预测结果", "Select an outcome first"))
              : zh
              ? `确认预测 · ${selected === "home" ? (homeTeamZh ?? homeTeam) : selected === "away" ? (awayTeamZh ?? awayTeam) : "平局"} →`
              : `Predict · ${selected === "home" ? homeTeam : selected === "away" ? awayTeam : "Draw"} →`}
          </button>

          <p className="text-xs text-gray-600 text-center">
            {lc(locale, "GoalCoin (GC) 为虚拟娱乐积分，不具备任何实际价值。", "GoalCoin (GC) is a virtual entertainment currency with no real-world value.")}
          </p>
        </div>
      )}
    </div>
  );
}
