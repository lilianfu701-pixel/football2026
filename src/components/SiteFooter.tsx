"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  locale: string;
}

/**
 * Site-wide footer rendered at the bottom of every desktop/web page.
 * Holds the help + legal/policy links (Help, Notifications, Terms, Privacy,
 * Refund) that payment providers (Paddle) expect to be reachable site-wide,
 * plus the GoalCoin "no cash value" disclaimer.
 *
 * Skipped on the user-owned mobile routes (/[locale]/m...), which ship their
 * own chrome.
 */
export default function SiteFooter({ locale }: Props) {
  const pathname = usePathname();
  const zh = locale === "zh";

  const isMobileRoute =
    pathname === `/${locale}/m` || pathname.startsWith(`/${locale}/m/`);
  if (isMobileRoute) return null;

  const explore = [
    { href: `/${locale}/missions`, label: zh ? "任务 & 成就" : "Missions & Achievements" },
    { href: `/${locale}/rewards`, label: zh ? "GC 奖励说明" : "GC Rewards Guide" },
    { href: `/${locale}/feed`, label: zh ? "好友动态" : "Following Feed" },
    { href: `/${locale}/schedule`, label: zh ? "赛程 & 积分榜" : "Schedule & Standings" },
    { href: `/${locale}/profile/checkin`, label: zh ? "每日签到领 GC" : "Daily Check-in" },
  ];

  const about = [
    { href: `/${locale}/help`, label: zh ? "帮助中心 / FAQ" : "Help Center / FAQ" },
    { href: `/${locale}/notifications`, label: zh ? "通知中心" : "Notifications" },
    { href: `/${locale}/terms`, label: zh ? "服务条款" : "Terms of Service" },
    { href: `/${locale}/privacy`, label: zh ? "隐私政策" : "Privacy Policy" },
    { href: `/${locale}/refund`, label: zh ? "退款政策" : "Refund Policy" },
  ];

  return (
    <footer className="mt-12 border-t border-[#1E3A5F] bg-[#0A1628]">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[#FFD700] font-black text-lg">Football2026</p>
            <p className="text-gray-500 text-xs mt-2 leading-relaxed">
              {zh
                ? "2026 世界杯助威 & 预测平台"
                : "World Cup 2026 cheering & prediction platform"}
            </p>
          </div>

          {/* Explore */}
          <nav aria-label={zh ? "探索" : "Explore"}>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">
              {zh ? "探索" : "Explore"}
            </p>
            <ul className="space-y-2">
              {explore.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-xs text-gray-500 hover:text-gray-200 transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* About & Legal */}
          <nav aria-label={zh ? "关于 & 政策" : "About & Legal"}>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3">
              {zh ? "关于 & 政策" : "About & Legal"}
            </p>
            <ul className="space-y-2">
              {about.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-xs text-gray-500 hover:text-gray-200 transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-[#1E3A5F]/60 text-center">
          <p className="text-[11px] text-gray-600">
            © 2026 Football2026 ·{" "}
            {zh
              ? "GoalCoin 为虚拟娱乐代币，无现金价值"
              : "GoalCoin is a virtual entertainment token with no cash value"}
          </p>
        </div>
      </div>
    </footer>
  );
}
