"use client";

import Link      from "next/link";
import { usePathname } from "next/navigation";
import { formatGc }    from "@/lib/levels";
import { lc }          from "@/i18n/content";

interface Props {
  locale:    string;
  nickname:  string;
  avatarUrl: string | null;
  gcBalance: number;
}

export default function ProfileSidebar({ locale, nickname, avatarUrl, gcBalance }: Props) {
  const pathname = usePathname();
  const base     = `/${locale}/profile`;

  const NAV = [
    { key: "",             icon: "🏠", label: "Overview",     labelZh: "个人概览" },
    { key: "transactions", icon: "🪙", label: "Transactions", labelZh: "GC 流水"  },
    { key: "settings",     icon: "⚙️", label: "Settings",     labelZh: "账户设置" },
    { key: "topup",        icon: "💳", label: "Top Up GC",    labelZh: "充值 GC"  },
  ];

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-52 shrink-0 sticky top-20">

        {/* User card */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FF8C00] flex items-center justify-center text-[#0A1628] font-black text-sm shrink-0 overflow-hidden">
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                : nickname.slice(0, 1).toUpperCase()
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-white truncate">{nickname}</p>
              <p className="text-[10px] text-[#FFD700] font-semibold">🪙 {formatGc(gcBalance)} GC</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
          {NAV.map(({ key, icon, label, labelZh }) => {
            const href   = key ? `${base}/${key}` : base;
            const active = key
              ? pathname.startsWith(`${base}/${key}`)
              : pathname === base || pathname === `${base}/`;
            return (
              <Link
                key={key}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-all border-b border-[#1E3A5F] last:border-0 ${
                  active
                    ? "bg-[#FFD700]/10 text-[#FFD700]"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="text-base w-5 text-center">{icon}</span>
                <span>{lc(locale, labelZh, label)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Quick links */}
        <div className="mt-3 bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
          {[
            { href: `/${locale}/matches`,     icon: "⚽", label: "Matches",    labelZh: "比赛" },
            { href: `/${locale}/leaderboard`, icon: "🏆", label: "Leaderboard",labelZh: "排行榜" },
            { href: `/${locale}/invite`,      icon: "🎁", label: "Invite",     labelZh: "邀请" },
          ].map((l) => (
            <Link key={l.href} href={l.href}
              className="flex items-center gap-3 px-4 py-2.5 text-xs text-gray-500 hover:text-white hover:bg-white/5 transition-all border-b border-[#1E3A5F]/50 last:border-0">
              <span>{l.icon}</span>
              <span>{lc(locale, l.labelZh, l.label)}</span>
            </Link>
          ))}
        </div>
      </aside>

      {/* ── Mobile top nav ──────────────────────────────── */}
      <nav className="lg:hidden flex gap-2 mb-4 overflow-x-auto pb-1">
        {NAV.map(({ key, icon, label, labelZh }) => {
          const href   = key ? `${base}/${key}` : base;
          const active = key
            ? pathname.startsWith(`${base}/${key}`)
            : pathname === base || pathname === `${base}/`;
          return (
            <Link key={key} href={href}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                active
                  ? "bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/30"
                  : "bg-[#0F2040] border border-[#1E3A5F] text-gray-400"
              }`}
            >
              <span>{icon}</span>
              <span>{lc(locale, labelZh, label)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
