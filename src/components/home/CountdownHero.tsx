"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const WC_START = new Date("2026-06-11T20:00:00+00:00"); // Opening match UTC

interface Unit { v: string; label: string; labelZh: string }

function pad(n: number) { return String(Math.max(0, n)).padStart(2, "0"); }

function getUnits(ms: number): Unit[] {
  const total = Math.max(0, ms);
  const s = Math.floor(total / 1000);
  const days  = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins  = Math.floor((s % 3600) / 60);
  const secs  = s % 60;
  return [
    { v: String(days),  label: "DAYS",    labelZh: "天" },
    { v: pad(hours),    label: "HOURS",   labelZh: "时" },
    { v: pad(mins),     label: "MINUTES", labelZh: "分" },
    { v: pad(secs),     label: "SECONDS", labelZh: "秒" },
  ];
}

interface Props {
  locale: string;
  zh: boolean;
  isLoggedIn: boolean;
  totalMatches: number;
}

export default function CountdownHero({ locale, zh, isLoggedIn, totalMatches }: Props) {
  const [msLeft, setMsLeft] = useState<number | null>(null);

  useEffect(() => {
    // Set immediately so first client paint is correct, then tick every second
    setMsLeft(WC_START.getTime() - Date.now());
    const id = setInterval(() => setMsLeft(WC_START.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const units    = getUnits(msLeft ?? 0);
  const finished = msLeft !== null && msLeft <= 0;

  return (
    <section className="relative overflow-hidden bg-[#050D1E]">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(#FFD700 1px, transparent 1px), linear-gradient(90deg, #FFD700 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />
      {/* Radial glow */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,215,0,0.08) 0%, transparent 70%)" }} />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-14 pb-16 text-center">

        {/* Tournament badge */}
        <div className="inline-flex items-center gap-2 bg-[#FFD700]/10 border border-[#FFD700]/25 text-[#FFD700] text-xs sm:text-sm px-4 py-1.5 rounded-full mb-7 font-bold tracking-wide">
          <span>🏆</span>
          <span>FIFA World Cup 2026™ · USA · Canada · Mexico</span>
        </div>

        {/* Main title */}
        <h1
          className="text-[clamp(3rem,12vw,7rem)] font-black text-white leading-none tracking-tight mb-3"
          style={{ fontFamily: "'Bebas Neue', 'Impact', sans-serif", letterSpacing: "0.03em" }}
        >
          <span style={{ color: "#FFD700" }}>FOOTBALL</span>
          <span className="text-white"> 2026</span>
        </h1>

        <p className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto mb-10">
          {zh
            ? "预测比赛结果 · 赢取 GoalCoin · 登顶排行榜"
            : "Predict matches · Earn GoalCoins · Dominate the leaderboard"}
        </p>

        {/* Countdown — only rendered after client hydration to avoid SSR mismatch */}
        <div className="mb-10">
          {msLeft === null ? (
            /* SSR / pre-hydration placeholder — same dimensions, no digits */
            <div>
              <p className="text-gray-600 text-xs uppercase tracking-[0.2em] mb-5">
                {zh ? "距世界杯开幕" : "World Cup kicks off in"}
              </p>
              <div className="flex justify-center gap-3 sm:gap-6">
                {(["DAYS","HOURS","MINUTES","SECONDS"] as const).map((label) => (
                  <div key={label} className="flex flex-col items-center gap-2">
                    <div className="bg-[#0A1A35] border border-[#FFD700]/20 rounded-2xl w-[72px] sm:w-[96px] h-[72px] sm:h-[96px]" />
                    <span className="text-[10px] sm:text-xs text-gray-600 uppercase tracking-widest font-medium">
                      {zh ? { DAYS:"天", HOURS:"时", MINUTES:"分", SECONDS:"秒" }[label] : label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : !finished ? (
            <div>
              <p className="text-gray-600 text-xs uppercase tracking-[0.2em] mb-5">
                {zh ? "距世界杯开幕" : "World Cup kicks off in"}
              </p>
              <div className="flex justify-center gap-3 sm:gap-6">
                {units.map((u) => (
                  <div key={u.label} className="flex flex-col items-center gap-2">
                    <div className="relative bg-[#0A1A35] border border-[#FFD700]/20 rounded-2xl w-[72px] sm:w-[96px] h-[72px] sm:h-[96px] flex items-center justify-center shadow-lg shadow-black/40">
                      <span
                        className="text-[2.2rem] sm:text-[3rem] font-black text-[#FFD700] tabular-nums leading-none"
                        style={{ fontFamily: "'Bebas Neue', 'Impact', sans-serif" }}
                      >
                        {u.v}
                      </span>
                      <div className="absolute left-3 right-3 top-1/2 h-px bg-[#FFD700]/10 pointer-events-none" />
                    </div>
                    <span className="text-[10px] sm:text-xs text-gray-600 uppercase tracking-widest font-medium">
                      {zh ? u.labelZh : u.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[#FFD700] text-2xl font-black animate-pulse">
              {zh ? "🔴 世界杯进行中！" : "🔴 World Cup is LIVE!"}
            </p>
          )}
        </div>

        {/* Stats strip */}
        <div className="flex justify-center gap-8 sm:gap-16 mb-10">
          {[
            { n: "48",            label: zh ? "场比赛" : "Matches" },
            { n: "32",            label: zh ? "支球队" : "Teams" },
            { n: totalMatches > 0 ? String(totalMatches) : "∞", label: zh ? "场可竞猜" : "Predictions" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div
                className="text-3xl sm:text-4xl font-black text-white"
                style={{ fontFamily: "'Bebas Neue', 'Impact', sans-serif" }}
              >
                {s.n}
              </div>
              <div className="text-[11px] text-gray-600 uppercase tracking-wider mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/${locale}/matches`}
            className="inline-flex items-center justify-center gap-2 bg-[#FFD700] text-[#0A1628] font-black px-8 py-3.5 rounded-2xl text-base hover:bg-[#FFC200] transition-all hover:scale-[1.02] shadow-lg shadow-[#FFD700]/20"
          >
            ⚽ {zh ? "立即竞猜" : "Predict Now"}
          </Link>
          <Link
            href={`/${locale}/matches`}
            className="inline-flex items-center justify-center gap-2 border border-[#1E3A5F] text-gray-300 px-8 py-3.5 rounded-2xl text-base hover:border-[#FFD700]/40 hover:text-white transition-all"
          >
            📅 {zh ? "查看赛程" : "View Schedule"}
          </Link>
          {!isLoggedIn && (
            <Link
              href={`/${locale}/auth/register`}
              className="inline-flex items-center justify-center gap-2 border border-[#FFD700]/30 text-[#FFD700] px-8 py-3.5 rounded-2xl text-base hover:bg-[#FFD700]/10 transition-all"
            >
              🎁 {zh ? "免费注册领1亿GC" : "Register & Get 100M GC"}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
