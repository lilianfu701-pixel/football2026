"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getFlagUrl } from "@/lib/flags";

interface PredictionPanelProps {
  matchId: string;
  locale: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  oddsHome: number;
  oddsDraw: number;
  oddsAway: number;
  gcBalance: number;
  existingBet: {
    prediction: string;
    gc_amount: number;
    status: string;
    potential_payout: number;
  } | null;
}

const QUICK_AMOUNTS = [10000, 50000, 100000, 500000, 1000000];

function formatGc(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return String(amount);
}

export default function PredictionPanel({
  matchId, locale, homeTeam, awayTeam, homeFlag, awayFlag,
  oddsHome, oddsDraw, oddsAway, gcBalance, existingBet,
}: PredictionPanelProps) {
  const router = useRouter();

  const [selected, setSelected] = useState<"home" | "draw" | "away" | null>(
    existingBet ? (existingBet.prediction as "home" | "draw" | "away") : null
  );
  const [amount, setAmount] = useState(existingBet?.gc_amount ?? 100000);
  const [amountInput, setAmountInput] = useState(String(existingBet?.gc_amount ?? 100000));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isLocked = !!existingBet;

  const selectedOdds = selected === "home" ? oddsHome : selected === "draw" ? oddsDraw : selected === "away" ? oddsAway : 1;
  const potentialPayout = Math.round(amount * selectedOdds);

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
    if (!selected) { setError("Please select a prediction"); return; }
    if (amount <= 0) { setError("Enter a valid amount"); return; }
    if (amount > gcBalance) { setError("Insufficient GoalCoins"); return; }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: matchId, prediction: selected, gc_amount: amount }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to place prediction");
      } else {
        setSuccess(true);
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const options = [
    { key: "home" as const, label: homeTeam, odds: oddsHome },
    { key: "draw" as const, label: "Draw", odds: oddsDraw },
    { key: "away" as const, label: awayTeam, odds: oddsAway },
  ];

  if (success) {
    return (
      <div className="bg-[#0F2040] border border-[#FFD700]/40 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <p className="text-white font-bold text-lg mb-1">Prediction Placed!</p>
        <p className="text-gray-400 text-sm mb-2">
          You predicted <span className="text-[#FFD700] font-bold">
            {selected === "home" ? homeTeam : selected === "away" ? awayTeam : "Draw"}
          </span>
        </p>
        <p className="text-gray-400 text-sm">
          Potential win: <span className="text-green-400 font-bold">🪙 {formatGc(potentialPayout)} GC</span>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
      <h3 className="text-sm font-bold text-white mb-4">
        {isLocked ? "✅ Your Prediction" : "🎯 Make Your Prediction"}
      </h3>

      {/* Outcome Options */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {options.map((opt) => {
          const isSelected = selected === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => !isLocked && setSelected(opt.key)}
              disabled={isLocked}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                isSelected
                  ? "border-[#FFD700] bg-[#FFD700]/10"
                  : isLocked
                  ? "border-[#1E3A5F] opacity-50 cursor-default"
                  : "border-[#1E3A5F] hover:border-[#FFD700]/40 cursor-pointer"
              }`}
            >
              {opt.key === "draw" ? (
                <span className="text-2xl">🤝</span>
              ) : (
                <div className="w-10 h-7 relative overflow-hidden rounded-sm">
                  <Image
                    src={getFlagUrl(opt.key === "home" ? homeTeam : awayTeam, 80)}
                    alt={opt.label}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <span className={`text-xs font-bold truncate w-full text-center leading-tight ${
                isSelected ? "text-[#FFD700]" : "text-gray-300"
              }`}>{opt.label}</span>
              <span className={`text-xs font-black ${
                isSelected ? "text-[#FFD700]" : "text-gray-500"
              }`}>×{opt.odds.toFixed(2)}</span>
            </button>
          );
        })}
      </div>

      {isLocked ? (
        /* Show existing bet summary */
        <div className="space-y-3">
          <div className="bg-[#0A1628] rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Your bet</span>
              <span className="text-white font-bold">🪙 {formatGc(existingBet!.gc_amount)} GC</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Potential payout</span>
              <span className="text-green-400 font-bold">🪙 {formatGc(existingBet!.potential_payout)} GC</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status</span>
              <span className={`font-bold capitalize ${
                existingBet!.status === "won" ? "text-green-400" :
                existingBet!.status === "lost" ? "text-red-400" :
                "text-blue-400"
              }`}>{existingBet!.status}</span>
            </div>
          </div>
          <p className="text-xs text-gray-600 text-center">Predictions cannot be changed after submission.</p>
        </div>
      ) : (
        /* Bet amount input */
        <div className="space-y-4">
          {/* Quick amounts */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Quick select</p>
            <div className="flex gap-2 flex-wrap">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  onClick={() => setQuickAmount(q)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    amount === q
                      ? "bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40"
                      : "bg-[#0A1628] text-gray-500 border border-[#1E3A5F] hover:text-white"
                  }`}
                >
                  {formatGc(q)}
                </button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5">
              Amount · Balance: 🪙 {formatGc(gcBalance)} GC
            </p>
            <div className="flex items-center gap-2 bg-[#0A1628] border border-[#1E3A5F] rounded-xl px-4 py-3 focus-within:border-[#FFD700] transition-colors">
              <span className="text-gray-500 text-sm">🪙</span>
              <input
                type="number"
                value={amountInput}
                onChange={(e) => handleAmountInput(e.target.value)}
                placeholder="Enter GC amount"
                min={1}
                max={gcBalance}
                className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
              />
              <button
                onClick={() => setQuickAmount(gcBalance)}
                className="text-xs text-[#FFD700] font-bold hover:underline"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Payout preview */}
          {selected && amount > 0 && (
            <div className="bg-[#0A1628] rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Potential payout</p>
                <p className="text-green-400 font-black text-lg">🪙 {formatGc(potentialPayout)} GC</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Odds</p>
                <p className="text-[#FFD700] font-bold">×{selectedOdds.toFixed(2)}</p>
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
            disabled={loading || !selected || amount <= 0}
            className="w-full bg-[#FFD700] text-[#0A1628] font-black py-3.5 rounded-xl text-sm hover:bg-[#FFC200] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Placing..." : selected ? `Predict ${
              selected === "home" ? homeTeam : selected === "away" ? awayTeam : "Draw"
            } →` : "Select an outcome to predict"}
          </button>

          <p className="text-xs text-gray-600 text-center">
            GoalCoin (GC) is a virtual entertainment currency with no real-world value.
          </p>
        </div>
      )}
    </div>
  );
}
