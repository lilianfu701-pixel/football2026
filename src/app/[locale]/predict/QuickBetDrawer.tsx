"use client";

import { useState } from "react";

interface TeamColors { primary: string; secondary: string; }

function hexOp(hex: string, alpha: number): string {
  return hex + Math.round(alpha * 255).toString(16).padStart(2, "0");
}

interface QuickBetDrawerProps {
  locale:      string;
  matchId:     string;
  homeTeam:    string;
  awayTeam:    string;
  stageLabel:  string;
  kickoffTime: string;
  /** Parimutuel pool amounts already bet on each side */
  poolHome:    number;
  poolDraw:    number;
  poolAway:    number;
  /** Reference odds (Bet365) — fallback when pool not yet formed */
  refOddsHome: number;
  refOddsDraw: number;
  refOddsAway: number;
  gcBalance:   number;
  homeColors?: TeamColors;
  awayColors?: TeamColors;
  preselected?: "home" | "draw" | "away";
  onClose:     () => void;
  onSuccess:   (matchId: string, prediction: string, gcAmount: number, estOdds: number) => void;
}

const QUICK_AMOUNTS = [1_000_000, 5_000_000, 10_000_000, 50_000_000, 100_000_000];

function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + "M";
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + "K";
  return String(n);
}

function getRefOdds(
  selection: "home" | "draw" | "away",
  refHome: number, refDraw: number, refAway: number,
): number {
  return selection === "home" ? refHome : selection === "draw" ? refDraw : refAway;
}

const DEFAULT_HOME: TeamColors = { primary: "#FFD700", secondary: "#FFD700" };
const DEFAULT_AWAY: TeamColors = { primary: "#A855F7", secondary: "#A855F7" };

export default function QuickBetDrawer({
  locale, matchId, homeTeam, awayTeam, stageLabel, kickoffTime,
  poolHome, poolDraw, poolAway,
  refOddsHome, refOddsDraw, refOddsAway,
  gcBalance,
  homeColors: hc = DEFAULT_HOME,
  awayColors: ac = DEFAULT_AWAY,
  preselected,
  onClose, onSuccess,
}: QuickBetDrawerProps) {
  const zh = locale === "zh";
  const [pick, setPick]         = useState<"home" | "draw" | "away" | null>(preselected ?? null);
  const [amount, setAmount]     = useState(10_000_000);
  const [rawInput, setRawInput] = useState("10000000");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const estMult   = pick ? getRefOdds(pick, refOddsHome, refOddsDraw, refOddsAway) : 1;
  const estPayout = Math.round(amount * estMult);
  const totalPool = poolHome + poolDraw + poolAway;

  function selectAmount(v: number) { setAmount(v); setRawInput(String(v)); }

  function handleInput(val: string) {
    setRawInput(val);
    const n = parseInt(val.replace(/\D/g, ""), 10);
    if (!isNaN(n) && n > 0) setAmount(n);
  }

  async function submit() {
    if (!pick)           { setError(zh ? "请选择竞猜结果" : "Select an outcome"); return; }
    if (amount <= 0)     { setError(zh ? "请输入押注金额" : "Enter amount"); return; }
    if (amount > gcBalance) { setError(zh ? "GC 余额不足" : "Insufficient GC balance"); return; }

    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/bets", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ match_id: matchId, prediction: pick, gc_amount: amount }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? (zh ? "押注失败" : "Failed")); }
      else          { onSuccess(matchId, pick!, amount, parseFloat(estMult.toFixed(2))); }
    } catch {
      setError(zh ? "网络错误，请重试" : "Network error");
    } finally {
      setLoading(false);
    }
  }

  // Pool percentages for each side
  const barTotal = totalPool || 1;
  function poolPct(p: number) { return Math.round((p / barTotal) * 100); }

  const options = [
    { key: "home" as const, label: homeTeam,            pool: poolHome, selColor: hc.primary },
    { key: "draw" as const, label: zh ? "平局" : "Draw", pool: poolDraw, selColor: "#60A5FA"  }, // blue-400 neutral
    { key: "away" as const, label: awayTeam,            pool: poolAway, selColor: ac.primary },
  ];

  void kickoffTime; // reserved for future display

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[301] sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div
          className="bg-[#0D1E3A] border border-[#1E3A5F] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle bar (mobile) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-[#1E3A5F]" />
          </div>

          {/* Header */}
          <div className="px-5 pt-3 pb-3 border-b border-[#1E3A5F] flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">{stageLabel}</p>
              <h3 className="text-white font-black text-base leading-tight mt-0.5">
                {homeTeam} <span className="text-gray-500 font-normal">vs</span> {awayTeam}
              </h3>
            </div>
            <button onClick={onClose} className="text-gray-600 hover:text-white text-xl leading-none ml-3">✕</button>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Pool bar */}
            {totalPool > 0 && (
              <div>
                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                  <span>{zh ? "彩池" : "Prize Pool"}</span>
                  <span className="text-[#FFD700] font-bold">🪙 {fmt(totalPool)} GC</span>
                </div>
                <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
                  {poolHome > 0 && <div className="rounded-full" style={{ width: `${poolPct(poolHome)}%`, backgroundColor: hc.primary }} />}
                  {poolDraw > 0 && <div className="bg-blue-400 rounded-full" style={{ width: `${poolPct(poolDraw)}%` }} />}
                  {poolAway > 0 && <div className="rounded-full" style={{ width: `${poolPct(poolAway)}%`, backgroundColor: ac.primary }} />}
                </div>
              </div>
            )}

            {/* Outcome buttons */}
            <div className="grid grid-cols-3 gap-2">
              {options.map((opt) => {
                const sel  = pick === opt.key;
                const mult = getRefOdds(opt.key, refOddsHome, refOddsDraw, refOddsAway);
                const pct  = totalPool > 0 ? poolPct(opt.pool) : null;
                const btnStyle = sel ? {
                  borderColor:     hexOp(opt.selColor, 0.5),
                  backgroundColor: hexOp(opt.selColor, 0.12),
                  color:           opt.selColor,
                } : {};
                return (
                  <button
                    key={opt.key}
                    onClick={() => setPick(opt.key)}
                    style={btnStyle}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all ${
                      sel ? "" : "border-[#1E3A5F] text-gray-500 hover:border-gray-500/40 hover:text-gray-300"
                    }`}
                  >
                    <span className="text-xs font-bold leading-tight text-center px-1 line-clamp-2">{opt.label}</span>
                    <span className={`text-sm font-black ${sel ? "" : "text-gray-600"}`}>×{mult.toFixed(2)}</span>
                    {pct !== null && (
                      <span className="text-[10px] text-gray-600">{pct}%</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick amounts */}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                {zh ? "快捷金额" : "Quick Select"}
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {QUICK_AMOUNTS.map((q) => (
                  <button
                    key={q}
                    onClick={() => selectAmount(q)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-bold transition-colors ${
                      amount === q
                        ? "bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40"
                        : "bg-[#0A1628] text-gray-500 border border-[#1E3A5F] hover:text-white"
                    }`}
                  >
                    {fmt(q)}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount input */}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                {zh ? "押注金额" : "Bet Amount"} · {zh ? "余额" : "Balance"}: <span className="text-[#FFD700] font-bold">{fmt(gcBalance)} GC</span>
              </p>
              <div className="flex items-center gap-2 bg-[#0A1628] border border-[#1E3A5F] rounded-xl px-4 py-3 focus-within:border-[#FFD700] transition-colors">
                <span className="text-gray-500 text-sm">🪙</span>
                <input
                  type="number"
                  value={rawInput}
                  onChange={(e) => handleInput(e.target.value)}
                  placeholder="0"
                  min={1}
                  className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
                />
                <button
                  onClick={() => selectAmount(gcBalance)}
                  className="text-xs text-[#FFD700] font-bold hover:underline shrink-0"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Estimated payout preview */}
            {pick && amount > 0 && (
              <div className="bg-[#0A1628] rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">{zh ? "预计获得" : "Est. Payout"}</p>
                    <p className="text-green-400 font-black text-xl">🪙 {fmt(estPayout)} GC</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">{zh ? "赔率" : "Odds"}</p>
                    <p className="text-[#FFD700] font-black text-lg">×{estMult.toFixed(2)}</p>
                  </div>
                </div>
                <p className="text-[10px] text-gray-600">
                  {zh ? "彩池制结算 · 平台抽成 5%" : "Parimutuel settlement · 5% platform fee"}
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-2.5 rounded-xl">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={submit}
              disabled={loading || !pick || amount <= 0}
              className="w-full bg-[#FFD700] text-[#0A1628] font-black py-3.5 rounded-xl text-sm hover:bg-[#FFC200] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? (zh ? "押注中…" : "Placing…")
                : pick
                  ? `${zh ? "押注" : "Bet"} ${
                      pick === "home" ? homeTeam : pick === "away" ? awayTeam : (zh ? "平局" : "Draw")
                    } · ${fmt(amount)} GC →`
                  : (zh ? "请先选择竞猜结果" : "Select an outcome first")}
            </button>

            <p className="text-[10px] text-gray-600 text-center">
              {zh ? "GoalCoin 是虚拟娱乐币，无实际价值。" : "GoalCoin is a virtual currency with no real-world value."}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
