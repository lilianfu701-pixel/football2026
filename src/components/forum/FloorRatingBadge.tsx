"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

// ── Shared type (exported so page.tsx can build the array) ───────────────────
export type RatingEntry = {
  id:         number;
  gc_amount:  number;
  reason:     string | null;
  created_at: string;
  rater: {
    id:           string;
    nickname:     string;
    avatar_url:   string | null;
    gc_balance:   number;
    country_code: string;
  } | null;
};

interface Props {
  ratings: RatingEntry[];
  locale:  string;
  zh:      boolean;
}

// Convert ISO 3166-1 alpha-2 code → flag emoji (returns 🌐 for unknown)
function countryFlag(code: string): string {
  if (!code || code === "UN" || code.length !== 2) return "🌐";
  return [...code.toUpperCase()].map((c) =>
    String.fromCodePoint(c.charCodeAt(0) + 127397)
  ).join("");
}

function timeAgo(dateStr: string, zh: boolean): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return zh ? "刚刚"      : "just now";
  if (m < 60) return zh ? `${m}分钟前` : `${m}m ago`;
  if (h < 24) return zh ? `${h}小时前` : `${h}h ago`;
  return zh ? `${d}天前` : `${d}d ago`;
}

// ── Main Badge ───────────────────────────────────────────────────────────────
export default function FloorRatingBadge({ ratings, locale, zh }: Props) {
  const [open, setOpen] = useState(false);

  if (!ratings.length) return null;

  const net   = ratings.reduce((s, r) => s + r.gc_amount, 0);
  const isPos = net > 0;
  const isNeg = net < 0;

  // label shown on the badge
  const label = isPos ? (zh ? "打赏" : "Tips") : isNeg ? (zh ? "扣分" : "Punished") : (zh ? "评分" : "Rated");
  const icon  = isPos ? "🎁" : isNeg ? "🔨" : "💰";

  return (
    <div className="relative">

      {/* ── Badge button ──────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        title={zh ? "点击查看详情" : "Click for details"}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-black border transition-all duration-150 shadow-sm ${
          isPos
            ? "bg-[#FFD700]/10 border-[#FFD700]/45 text-[#FFD700] hover:bg-[#FFD700]/20 hover:border-[#FFD700]/65 shadow-[#FFD700]/5"
            : isNeg
            ? "bg-red-500/10  border-red-500/40  text-red-400  hover:bg-red-500/18 hover:border-red-500/60 shadow-red-500/5"
            : "bg-gray-500/10 border-gray-500/30 text-gray-400 hover:bg-gray-500/20"
        }`}
      >
        <span className="text-base leading-none">{icon}</span>
        <span>{label}</span>
        <span className={`text-xs font-black tabular-nums ${isPos ? "text-green-400" : isNeg ? "text-red-400" : "text-gray-400"}`}>
          {isPos ? "+" : ""}{net.toLocaleString()}
        </span>
        <span className="text-[10px] opacity-50 font-normal -ml-1">GC</span>
        {ratings.length > 1 && (
          <span className={`text-[10px] opacity-60 font-normal`}>·{ratings.length}</span>
        )}
      </button>

      {/* ── Drop-down panel ───────────────────────────────────────────────── */}
      {open && (
        <>
          {/* Invisible backdrop to close on outside click */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full mt-1.5 z-50 w-72 sm:w-80
                          bg-[#0B1A30] border border-[#1E3A5F] rounded-2xl
                          shadow-2xl shadow-black/70 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between
                            px-4 py-2.5 bg-[#080F1F]/70 border-b border-[#1E3A5F]">
              <span className="text-[11px] font-black text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>{icon}</span>
                {label} · {ratings.length}{zh ? "条" : ""}
              </span>
              <span className={`text-xs font-black tabular-nums ${
                isPos ? "text-[#FFD700]" : isNeg ? "text-red-400" : "text-gray-400"
              }`}>
                {zh ? "净" : "Net"}&nbsp;{isPos ? "+" : ""}{net.toLocaleString()}&nbsp;GC
              </span>
            </div>

            {/* Row list */}
            <div className="max-h-72 overflow-y-auto divide-y divide-[#1E3A5F]/30">
              {ratings.map((r) => (
                <RatingRow
                  key={r.id}
                  r={r}
                  locale={locale}
                  zh={zh}
                  onClose={() => setOpen(false)}
                />
              ))}
            </div>

          </div>
        </>
      )}
    </div>
  );
}

// ── Single rating row ─────────────────────────────────────────────────────────
function RatingRow({
  r, locale, zh, onClose,
}: {
  r: RatingEntry; locale: string; zh: boolean; onClose: () => void;
}) {
  const isPos = r.gc_amount > 0;
  const rater = r.rater;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5
                    hover:bg-[#1E3A5F]/25 transition-colors">

      {/* ── Avatar (clickable → profile) ──────────────────────────────── */}
      <div className="shrink-0">
        {rater ? (
          <Link href={`/${locale}/profile/${rater.id}`} onClick={onClose}>
            {rater.avatar_url ? (
              <Image
                src={rater.avatar_url}
                alt={rater.nickname}
                width={34} height={34}
                className="rounded-full object-cover border border-[#1E3A5F]"
                unoptimized
              />
            ) : (
              <div className="w-[34px] h-[34px] rounded-full
                              bg-gradient-to-br from-[#4F46E5] to-[#7C3AED]
                              flex items-center justify-center
                              text-white font-black text-sm border border-[#1E3A5F]">
                {rater.nickname.slice(0, 1).toUpperCase()}
              </div>
            )}
          </Link>
        ) : (
          <div className="w-[34px] h-[34px] rounded-full bg-[#1E3A5F]/50
                          flex items-center justify-center text-gray-600 text-base">
            ?
          </div>
        )}
      </div>

      {/* ── Info ──────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">

        {/* Name + country flag */}
        <div className="flex items-center gap-1.5 mb-0.5">
          {rater ? (
            <Link
              href={`/${locale}/profile/${rater.id}`}
              onClick={onClose}
              className="text-xs font-black text-white
                         hover:text-[#FFD700] transition-colors truncate max-w-[110px]"
            >
              {rater.nickname}
            </Link>
          ) : (
            <span className="text-xs text-gray-600">
              {zh ? "用户已注销" : "Deleted user"}
            </span>
          )}

          {rater && (
            <span
              className="text-sm leading-none shrink-0"
              title={rater.country_code}
            >
              {countryFlag(rater.country_code)}
            </span>
          )}
        </div>

        {/* GC balance + reason */}
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 flex-wrap">
          {rater && (
            <span className="text-[#FFD700]/60 font-bold tabular-nums">
              {rater.gc_balance.toLocaleString()} GC
            </span>
          )}
          {r.reason && (
            <span className="text-gray-600 truncate max-w-[140px]">· {r.reason}</span>
          )}
        </div>

      </div>

      {/* ── Right: amount + time ──────────────────────────────────────── */}
      <div className="shrink-0 text-right">
        <div className={`text-sm font-black tabular-nums leading-tight ${
          isPos ? "text-green-400" : "text-red-400"
        }`}>
          {isPos ? "+" : ""}{r.gc_amount.toLocaleString()}
        </div>
        <div className="text-[10px] text-gray-600 mt-0.5">
          {timeAgo(r.created_at, zh)}
        </div>
      </div>

    </div>
  );
}
