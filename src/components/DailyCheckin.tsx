"use client";

import { useState } from "react";
import { formatGc } from "@/lib/levels";
import { lc } from "@/i18n/content";

interface DailyCheckinProps {
  hasClaimed: boolean;
  streak: number;
  dailyAmount: number;
  locale: string;
  onClaim?: (newBalance: number) => void;
}

export default function DailyCheckin({
  hasClaimed: initialClaimed,
  streak: initialStreak,
  dailyAmount,
  locale,
  onClaim,
}: DailyCheckinProps) {
  const [claimed, setClaimed] = useState(initialClaimed);
  const [streak, setStreak] = useState(initialStreak);
  const [loading, setLoading] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [earnedGc, setEarnedGc] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckin() {
    if (claimed || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkin", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "already_claimed") {
          setClaimed(true);
        } else {
          setError(data.error || "Failed to claim");
        }
        return;
      }

      setEarnedGc(data.gc_earned);
      setStreak(data.streak);
      setClaimed(true);
      setShowAnimation(true);
      onClaim?.(data.new_balance);

      setTimeout(() => setShowAnimation(false), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Streak bonus percentage
  const bonusPct = Math.min(streak - 1, 30);

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5 relative overflow-hidden">
      {/* Animation overlay */}
      {showAnimation && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center animate-bounce">
            <div className="text-5xl mb-2">🪙</div>
            <div className="text-2xl font-black text-[#FFD700]">
              +{formatGc(earnedGc ?? 0)} GC
            </div>
          </div>
        </div>
      )}

      <div className={showAnimation ? "opacity-20" : ""}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-bold text-base">{lc(locale, "每日签到", "Daily Check-in")}</h3>
          </div>
          {streak > 1 && (
            <div className="flex items-center gap-1 bg-orange-500/20 border border-orange-500/30 px-2.5 py-1 rounded-full">
              <span className="text-sm">🔥</span>
              <span className="text-orange-400 text-xs font-bold">
                {streak} {lc(locale, "天连续", "Day Streak")}
              </span>
            </div>
          )}
        </div>

        {/* Weekly streak dots */}
        <div className="flex gap-1.5 mb-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-2 rounded-full transition-all ${
                i < Math.min(streak % 7 || (streak > 0 && streak % 7 === 0 ? 7 : 0), 7)
                  ? "bg-[#FFD700]"
                  : "bg-[#1E3A5F]"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">{lc(locale, "今日奖励", "Today's reward")}</p>
            <p className="text-lg font-black text-[#FFD700]">
              {formatGc(dailyAmount)} GC
              {bonusPct > 0 && (
                <span className="text-xs text-orange-400 font-normal ml-1">
                  +{bonusPct}% streak
                </span>
              )}
            </p>
          </div>

          <button
            onClick={handleCheckin}
            disabled={claimed || loading}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              claimed
                ? "bg-green-500/20 border border-green-500/30 text-green-400 cursor-default"
                : loading
                ? "bg-[#FFD700]/50 text-[#0A1628] cursor-wait"
                : "bg-[#FFD700] text-[#0A1628] hover:bg-[#FFC200] hover:scale-105 shadow-lg shadow-[#FFD700]/20"
            }`}
          >
            {claimed ? `✓ ${lc(locale, "已领取", "Claimed")}` : loading ? "..." : lc(locale, "领取", "Claim")}
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-xs mt-2">{error}</p>
        )}
      </div>
    </div>
  );
}
