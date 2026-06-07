"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { lc } from "@/i18n/content";

interface CheckinRecord {
  date: string;
  streak: number;
  gc_earned: number;
}

interface Props {
  locale: string;
  userId: string;
  gcBalance: number;
  todayCheckedIn: boolean;
  streak: number;
  dailyGcEstimate: number;
  recentHistory: CheckinRecord[];
  wealthLevel: {
    name: string;
    nameZh: string;
    icon: string;
    color: string;
    dailyFreeGc: number;
  };
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + "K";
  return String(n);
}

export default function CheckinClient({
  locale,
  todayCheckedIn: initialCheckedIn,
  streak: initialStreak,
  dailyGcEstimate,
  recentHistory,
  wealthLevel,
}: Props) {
  const zh = locale === "zh";
  const router = useRouter();

  const [checkedIn, setCheckedIn] = useState(initialCheckedIn);
  const [streak, setStreak] = useState(initialStreak);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ gcEarned: number; newStreak: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckin() {
    if (loading || checkedIn) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkin", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "already_claimed") {
          setCheckedIn(true);
          setError(lc(locale, "今天已经签到过了", "Already checked in today"));
          return;
        }
        setError(data.error ?? (lc(locale, "签到失败，请重试", "Check-in failed, please try again")));
        return;
      }
      setCheckedIn(true);
      setStreak(data.streak);
      setResult({ gcEarned: data.gc_earned, newStreak: data.streak });
      router.refresh();
    } catch {
      setError(lc(locale, "网络错误，请重试", "Network error, please try again"));
    } finally {
      setLoading(false);
    }
  }

  // Build a 7-day calendar
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const isToday = i === 6;
    const rec = recentHistory.find((r) => r.date === dateStr);
    return { dateStr, isToday, checked: !!rec, gcAmount: rec?.gc_earned ?? 0 };
  });

  return (
    <div className="space-y-5">

      {/* Success banner */}
      {result && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 text-center animate-in fade-in">
          <p className="text-3xl mb-1">🎉</p>
          <p className="text-lg font-black text-green-400">
            +{fmt(result.gcEarned)} GC
          </p>
          <p className="text-sm text-gray-300 mt-1">
            {zh
              ? `签到成功！连续签到 ${result.newStreak} 天`
              : `Check-in successful! ${result.newStreak}-day streak`}
          </p>
        </div>
      )}

      {/* Streak card */}
      <div className="bg-gradient-to-br from-[#1E3A5F] to-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
              {lc(locale, "连续签到", "Streak")}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-[#FFD700]">{streak}</span>
              <span className="text-gray-400 text-sm">{lc(locale, "天", "days")}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">
              {lc(locale, "今日预计领取", "Today's estimate")}
            </p>
            <p className="text-xl font-black text-white">
              {fmt(dailyGcEstimate)} GC
            </p>
            <p className="text-[10px] text-gray-600 mt-0.5">
              {zh
                ? `基础 ${fmt(wealthLevel.dailyFreeGc)} + 连签奖励`
                : `Base ${fmt(wealthLevel.dailyFreeGc)} + streak bonus`}
            </p>
          </div>
        </div>

        {/* 7-day calendar */}
        <div className="grid grid-cols-7 gap-1.5 mb-4">
          {days.map((day, i) => {
            const d = new Date(day.dateStr);
            const dayLabel = zh
              ? ["日","一","二","三","四","五","六"][d.getDay()]
              : ["S","M","T","W","T","F","S"][d.getDay()];
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-[9px] text-gray-600">{dayLabel}</span>
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                    day.checked
                      ? "bg-[#FFD700] text-[#0A1628]"
                      : day.isToday
                      ? "bg-[#1E3A5F] border-2 border-[#FFD700]/40 text-gray-300"
                      : "bg-[#0A1628] border border-[#1E3A5F] text-gray-600"
                  }`}
                >
                  {day.checked ? "✓" : d.getDate()}
                </div>
                {day.checked && day.gcAmount > 0 && (
                  <span className="text-[8px] text-[#FFD700] font-bold">+{fmt(day.gcAmount)}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Streak bonus info */}
        <div className="bg-[#0A1628]/50 rounded-xl p-3 mb-4">
          <p className="text-xs text-gray-500 mb-1.5">
            {lc(locale, "连签奖励（每天 +1%，最高 +30%）", "Streak bonus (+1% per day, max +30%)")}
          </p>
          <div className="w-full bg-[#1E3A5F] rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FF8C00] transition-all"
              style={{ width: `${Math.min(100, (streak / 30) * 100)}%` }}
            />
          </div>
          <p className="text-right text-[10px] text-[#FFD700] mt-1 font-bold">
            {Math.min(streak, 30)}/30 {lc(locale, "天", "days")} · +{Math.min(streak - 1, 30)}%
          </p>
        </div>

        {/* Check-in button */}
        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 mb-3">
            ⚠ {error}
          </p>
        )}

        <button
          onClick={handleCheckin}
          disabled={checkedIn || loading}
          className={`w-full py-4 rounded-xl font-black text-base transition-all ${
            checkedIn
              ? "bg-green-500/15 text-green-400 border border-green-500/30 cursor-default"
              : loading
              ? "bg-[#FFD700]/50 text-[#0A1628] cursor-wait"
              : "bg-[#FFD700] text-[#0A1628] hover:bg-[#FFED4A] active:scale-98 shadow-lg shadow-[#FFD700]/20"
          }`}
        >
          {checkedIn
            ? (lc(locale, "✓ 今日已签到", "✓ Checked in today"))
            : loading
            ? (lc(locale, "签到中…", "Checking in…"))
            : (lc(locale, "🎁 立即签到", "🎁 Check In Now"))}
        </button>
      </div>

      {/* Wealth level info */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
          {lc(locale, "当前等级", "Current Level")}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{wealthLevel.icon}</span>
            <div>
              <p className="font-black text-white">
                {zh ? wealthLevel.nameZh : wealthLevel.name}
              </p>
              <p className="text-xs text-gray-500">
                {zh
                  ? `每日基础签到：${fmt(wealthLevel.dailyFreeGc)} GC`
                  : `Daily base check-in: ${fmt(wealthLevel.dailyFreeGc)} GC`}
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-gray-500">
            {lc(locale, "充值或赢取 GC 可升级", "Top up or win GC to level up")}
          </div>
        </div>
      </div>

    </div>
  );
}
