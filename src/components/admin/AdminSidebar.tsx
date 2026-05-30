"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface Props {
  locale: string;
  admin:  { nickname: string; avatar_url: string | null };
}

const NAV = [
  { key: "",         icon: "🏠", label: "Dashboard",   labelZh: "控制台" },
  { key: "users",    icon: "👤", label: "Users",        labelZh: "用户管理" },
  { key: "matches",  icon: "⚽", label: "Matches",      labelZh: "赛事管理" },
  { key: "bets",     icon: "🎯", label: "Bets",         labelZh: "投注管理" },
  { key: "finance",  icon: "💰", label: "Finance",      labelZh: "财务管理" },
  { key: "reports",  icon: "🚩", label: "Reports",      labelZh: "举报审核" },
  { key: "gc-tools", icon: "🪙", label: "GC Tools",     labelZh: "GC 工具" },
  { key: "featured", icon: "🔥", label: "Featured",     labelZh: "焦点对决" },
  { key: "forum",    icon: "💬", label: "Forum",         labelZh: "论坛管理" },
];

export default function AdminSidebar({ locale, admin }: Props) {
  const pathname = usePathname();
  const zh       = locale === "zh";
  const base     = `/${locale}/admin`;

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-[#080F1F] border-r border-[#1E3A5F] min-h-screen sticky top-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#1E3A5F]">
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Admin</p>
          <p className="text-base font-black text-[#FFD700]">Football2026</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ key, icon, label, labelZh }) => {
            const href    = key ? `${base}/${key}` : base;
            const active  = key
              ? pathname.includes(`/admin/${key}`)
              : pathname === base || pathname === `${base}/`;
            return (
              <Link
                key={key}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? "bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20"
                    : "text-gray-500 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="text-base w-5 text-center">{icon}</span>
                <span>{zh ? labelZh : label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Admin user */}
        <div className="px-4 py-4 border-t border-[#1E3A5F]">
          <div className="flex items-center gap-2.5">
            {admin.avatar_url ? (
              <Image src={admin.avatar_url} alt="" width={28} height={28}
                className="rounded-full object-cover border border-[#1E3A5F]" unoptimized />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FF8C00] flex items-center justify-center text-[#0A1628] font-black text-xs">
                {admin.nickname.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{admin.nickname}</p>
              <p className="text-[10px] text-[#FFD700]">Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile bottom nav ────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#080F1F] border-t border-[#1E3A5F] flex overflow-x-auto">
        {NAV.map(({ key, icon, labelZh, label }) => {
          const href   = key ? `${base}/${key}` : base;
          const active = key
            ? pathname.includes(`/admin/${key}`)
            : pathname === base;
          return (
            <Link key={key} href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2.5 text-[9px] font-bold shrink-0 transition-colors ${
                active ? "text-[#FFD700]" : "text-gray-600"
              }`}>
              <span className="text-lg leading-none">{icon}</span>
              <span>{zh ? labelZh : label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
