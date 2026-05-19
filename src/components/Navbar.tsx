"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { localeNames } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface NavbarProps {
  user: User | null;
  gcBalance?: number;
  nickname?: string;
}

export default function Navbar({ user, gcBalance, nickname }: NavbarProps) {
  const t = useTranslations("nav");
  const params = useParams();
  const pathname = usePathname();
  const locale = (params.locale as string) || "en";
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = `/${locale}`;
  }

  // Build locale-switched path
  function switchLocalePath(newLocale: string) {
    // pathname starts with /locale/... or just /locale
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length > 0 && localeNames[parts[0]]) {
      parts[0] = newLocale;
    } else {
      parts.unshift(newLocale);
    }
    const newPath = "/" + parts.join("/");
    // For default locale (en), next-intl with as-needed removes the prefix
    return newPath;
  }

  const navLinks = [
    { href: `/${locale}`, label: t("home") },
    { href: `/${locale}/matches`, label: t("matches") },
    { href: `/${locale}/predict`, label: t("predict") },
    { href: `/${locale}/leaderboard`, label: t("leaderboard") },
    { href: `/${locale}/forum`, label: t("forum") },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A1628]/95 backdrop-blur-md border-b border-[#1E3A5F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2 shrink-0"
          >
            <span className="text-2xl">⚽</span>
            <span className="text-[#FFD700] font-bold text-lg hidden sm:block">
              Football2026
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-[#1E3A5F] rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* GC Balance (if logged in) */}
            {user && gcBalance !== undefined && (
              <Link
                href={`/${locale}/profile`}
                className="hidden sm:flex items-center gap-1.5 bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] text-sm px-3 py-1.5 rounded-xl hover:bg-[#FFD700]/20 transition-colors"
              >
                <span className="text-base">🪙</span>
                <span className="font-semibold">
                  {gcBalance >= 1_000_000_000
                    ? (gcBalance / 1_000_000_000).toFixed(1) + "B"
                    : gcBalance >= 1_000_000
                    ? (gcBalance / 1_000_000).toFixed(0) + "M"
                    : gcBalance.toLocaleString()}{" "}
                  GC
                </span>
              </Link>
            )}

            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-[#1E3A5F] rounded-lg transition-colors"
              >
                <span>🌐</span>
                <span className="hidden sm:block uppercase text-xs font-medium">
                  {locale}
                </span>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {langOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-[#0F2040] border border-[#1E3A5F] rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
                  {Object.entries(localeNames).map(([code, name]) => (
                    <Link
                      key={code}
                      href={switchLocalePath(code)}
                      onClick={() => setLangOpen(false)}
                      className={`block px-4 py-2.5 text-sm transition-colors ${
                        code === locale
                          ? "text-[#FFD700] bg-[#FFD700]/10"
                          : "text-gray-300 hover:text-white hover:bg-[#1E3A5F]"
                      }`}
                    >
                      {name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Auth Buttons */}
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href={`/${locale}/profile`}
                  className="hidden sm:flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  <div className="w-8 h-8 bg-[#FFD700] rounded-full flex items-center justify-center text-[#0A1628] font-bold text-sm">
                    {(nickname ?? user.email ?? "U")[0].toUpperCase()}
                  </div>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="hidden sm:block text-sm text-gray-400 hover:text-white px-3 py-1.5 hover:bg-[#1E3A5F] rounded-lg transition-colors"
                >
                  {t("logout")}
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href={`/${locale}/auth/login`}
                  className="text-sm text-gray-300 hover:text-white px-3 py-1.5 hover:bg-[#1E3A5F] rounded-lg transition-colors"
                >
                  {t("login")}
                </Link>
                <Link
                  href={`/${locale}/auth/register`}
                  className="text-sm bg-[#FFD700] text-[#0A1628] font-bold px-4 py-1.5 rounded-xl hover:bg-[#FFC200] transition-colors"
                >
                  {t("register")}
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-gray-300 hover:text-white hover:bg-[#1E3A5F] rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-[#1E3A5F] py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-[#1E3A5F] rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-[#1E3A5F] flex gap-2 px-4">
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="flex-1 text-center text-sm text-gray-400 hover:text-white py-2 hover:bg-[#1E3A5F] rounded-lg transition-colors"
                >
                  {t("logout")}
                </button>
              ) : (
                <>
                  <Link
                    href={`/${locale}/auth/login`}
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 text-center text-sm text-gray-300 hover:text-white py-2 hover:bg-[#1E3A5F] rounded-lg border border-[#1E3A5F] transition-colors"
                  >
                    {t("login")}
                  </Link>
                  <Link
                    href={`/${locale}/auth/register`}
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 text-center text-sm bg-[#FFD700] text-[#0A1628] font-bold py-2 rounded-xl hover:bg-[#FFC200] transition-colors"
                  >
                    {t("register")}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
