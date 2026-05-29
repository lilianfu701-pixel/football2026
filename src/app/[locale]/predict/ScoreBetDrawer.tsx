"use client";

import { useState } from "react";
import { calcScoreOdds, netPayout } from "@/lib/scoreOdds";

interface TeamColors { primary: string; secondary: string; }

function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + "M";
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + "K";
  return String(n);
}

interface ScoreBetDrawerProps {
  locale:      string;
  matchId:     string;
  homeTeam:    string;
  awayTeam:    string;
  stageLabel:  string;
  gcBalance:   number;
  homeColors?: TeamColors;
  awayColors?: TeamColors;
  onClose:     () => void;
  onSuccess:   (matchId: string, scoreHome: number, scoreAway: number, odds: number, gcAmount: number) => void;
}

const QUICK_AMOUNTS = [1_000_000, 5_000_000, 10_000_000, 50_000_000, 100_000_000];
const QUICK_SCORES  = [[1,0],[2,0],[2,1],[1,1],[0,0],[0,1],[0,2],[1,2]];

export default function ScoreBetDrawer({
  locale, matchId, homeTeam, awayTeam, stageLabel,
  gcBalance,
  homeColors = { primary: "#FFD700", secondary: "#FFD700" },
  awayColors = { primary: "#A855F7", secondary: "#A855F7" },
  onClose, onSuccess,
}: ScoreBetDrawerProps) {
  const zh = locale === "zh";
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [amount,    setAmount]    = useState(10_000_000);
  const [rawInput,  setRawInput]  = useState("10000000");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const parsedHome  = parseInt(homeScore, 10);
  const parsedAway  = parseInt(awayScore, 10);
  const scoreReady  = !isNaN(parsedHome) && !isNaN(parsedAway) && parsedHome >= 0 && parsedAway >= 0;
  const odds        = scoreReady ? calcScoreOdds(parsedHome, parsedAway) : null;
  const payout      = odds != null ? netPayout(amount, odds) : 0;

  function applyScore(h: number, a: number) {
    setHomeScore(String(h));
    setAwayScore(String(a));
    setError(null);
  }

  function handleInput(val: string) {
    setRawInput(val);
    const n = parseInt(val.replace(/\D/g, ""), 10);
    if (!isNaN(n) && n > 0) setAmount(n);
  }

  async function submit() {
    if (!scoreReady) { setError(zh ? "请填写双方比分" : "Enter both scores"); return; }
    if (amount <= 0)  { setError(zh ? "请输入押注金额" : "Enter amount"); return; }
    if (amount > gcBalance) { setError(zh ? "GC 余额不足" : "Insufficient GC"); return; }
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/score-bets", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ match_id: matchId, score_home: parsedHome, score_away: parsedAway, gc_amount: amount }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? (zh ? "押注失败" : "Failed")); }
      else          { onSuccess(matchId, parsedHome, parsedAway, odds!, amount); }
    } catch {
      setError(zh ? "网络错误，请重试" : "Network error");
    } finally {
      setLoading(false);
    }
  }

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
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">🎯 {zh ? "比分竞猜" : "Score Prediction"} · {stageLabel}</p>
              <h3 className="text-white font-black text-base leading-tight mt-0.5">
                {homeTeam} <span className="text-gray-500 font-normal">vs</span> {awayTeam}
              </h3>
            </div>
            <button onClick={onClose} className="text-gray-600 hover:text-white text-xl leading-none ml-3">✕</button>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Score input */}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">{zh ? "预测比分" : "Predict Score"}</p>
              <div className="flex items-center gap-3">
                {/* Home score */}
                <div className="flex-1">
                  <p className="text-[10px] text-center mb-1 font-semibold truncate" style={{ color: homeColors.primary }}>{homeTeam}</p>
                  <input
                    type="number" min={0} max={20}
                    value={homeScore}
                    onChange={(e) => { setHomeScore(e.target.value.replace(/[^0-9]/g, "").slice(0,2)); setError(null); }}
                    placeholder="0"
                    className="w-full bg-[#0A1628] border border-[#1E3A5F] focus:border-[#FFD700] rounded-xl text-white text-3xl font-black text-center py-3 outline-none transition-colors"
                  />
                </div>
                <span className="text-gray-500 text-xl font-bold shrink-0">–</span>
                {/* Away score */}
                <div className="flex-1">
                  <p className="text-[10px] text-center mb-1 font-semibold truncate" style={{ color: awayColors.primary }}>{awayTeam}</p>
                  <input
                    type="number" min={0} max={20}
                    value={awayScore}
                    onChange={(e) => { setAwayScore(e.target.value.replace(/[^0-9]/g, "").slice(0,2)); setError(null); }}
                    placeholder="0"
                    className="w-full bg-[#0A1628] border border-[#1E3A5F] focus:border-[#FFD700] rounded-xl text-white text-3xl font-black text-center py-3 outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Quick score buttons */}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">{zh ? "常见比分" : "Common Scores"}</p>
              <div className="flex gap-1.5 flex-wrap">
                {QUICK_SCORES.map(([h, a]) => {
                  const o = calcScoreOdds(h, a);
                  const selected = homeScore === String(h) && awayScore === String(a);
                  return (
                    <button key={`${h}-${a}`} onClick={() => applyScore(h, a)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-bold transition-colors ${
                        selected
                          ? "bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40"
                          : "bg-[#0A1628] text-gray-500 border border-[#1E3A5F] hover:text-white"
                      }`}
                    >
                      {h}:{a} <span className="text-[10px] opacity-60">×{o}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount */}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                {zh ? "押注金额" : "Bet Amount"} · {zh ? "余额" : "Bal"}: <span className="text-[#FFD700] font-bold">{fmt(gcBalance)} GC</span>
              </p>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {QUICK_AMOUNTS.map((q) => (
                  <button key={q} onClick={() => { setAmount(q); setRawInput(String(q)); }}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-bold transition-colors ${
                      amount === q
                        ? "bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40"
                        : "bg-[#0A1628] text-gray-500 border border-[#1E3A5F] hover:text-white"
                    }`}>{fmt(q)}</button>
                ))}
              </div>
              <div className="flex items-center gap-2 bg-[#0A1628] border border-[#1E3A5F] rounded-xl px-4 py-3 focus-within:border-[#FFD700] transition-colors">
                <span className="text-gray-500 text-sm">🪙</span>
                <input type="number" value={rawInput} onChange={(e) => handleInput(e.target.value)}
                  placeholder="0" min={1}
                  className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-600" />
                <button onClick={() => { setAmount(gcBalance); setRawInput(String(gcBalance)); }}
                  className="text-xs text-[#FFD700] font-bold hover:underline shrink-0">MAX</button>
              </div>
            </div>

            {/* Payout preview */}
            {scoreReady && odds != null && amount > 0 && (
              <div className="bg-[#0A1628] rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">{zh ? "预计获得" : "Est. Payout"}</p>
                  <p className="text-green-400 font-black text-xl">🪙 {fmt(payout)} GC</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">{zh ? "赔率" : "Odds"}</p>
                  <p className="text-[#FFD700] font-black text-lg">×{odds.toFixed(1)}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-2.5 rounded-xl">{error}</div>
            )}

            {/* Submit */}
            <button onClick={submit} disabled={loading || !scoreReady || amount <= 0}
              className="w-full bg-[#FFD700] text-[#0A1628] font-black py-3.5 rounded-xl text-sm hover:bg-[#FFC200] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {loading
                ? (zh ? "押注中…" : "Placing…")
                : scoreReady
                  ? `${zh ? "押注比分" : "Bet Score"} ${parsedHome}:${parsedAway} · ${fmt(amount)} GC →`
                  : (zh ? "请先填写比分" : "Enter a score first")}
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
