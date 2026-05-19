import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });
  const tGc = await getTranslations({ locale, namespace: "gc" });
  const tAuth = await getTranslations({ locale, namespace: "auth" });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // World Cup 2026 start date: June 11, 2026
  const wcDate = new Date("2026-06-11T16:00:00Z");
  const now = new Date();
  const msLeft = wcDate.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60 * 24)));

  return (
    <main className="min-h-screen bg-[#0A1628] text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F2040] to-[#0A1628]" />
        <div className="absolute inset-0 bg-[url('/hero-bg.svg')] opacity-5" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] text-sm px-4 py-1.5 rounded-full mb-6">
            <span>⚡</span>
            <span>WorldCup2026 Official Prediction Game</span>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl sm:text-7xl font-black text-white mb-4 leading-tight">
            <span className="text-[#FFD700]">Football</span>2026
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Predict match outcomes, earn GoalCoins, climb the leaderboard.
            The ultimate WorldCup2026 prediction experience.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            {user ? (
              <Link
                href={`/${locale}/matches`}
                className="inline-flex items-center gap-2 bg-[#FFD700] text-[#0A1628] font-bold px-8 py-4 rounded-2xl text-lg hover:bg-[#FFC200] transition-all hover:scale-105 shadow-lg shadow-[#FFD700]/20"
              >
                ⚽ {t("cta_predict")}
              </Link>
            ) : (
              <>
                <Link
                  href={`/${locale}/auth/register`}
                  className="inline-flex items-center gap-2 bg-[#FFD700] text-[#0A1628] font-bold px-8 py-4 rounded-2xl text-lg hover:bg-[#FFC200] transition-all hover:scale-105 shadow-lg shadow-[#FFD700]/20"
                >
                  🚀 {tAuth("create_account")}
                </Link>
                <Link
                  href={`/${locale}/matches`}
                  className="inline-flex items-center gap-2 border border-[#1E3A5F] text-gray-300 px-8 py-4 rounded-2xl text-lg hover:border-[#FFD700]/50 hover:text-white transition-all"
                >
                  📅 {t("cta_schedule")}
                </Link>
              </>
            )}
          </div>

          {/* Welcome gift banner for guests */}
          {!user && (
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/10 border border-[#FFD700]/30 text-[#FFD700] text-sm sm:text-base px-6 py-3 rounded-xl mb-12">
              🎁 {tAuth("register_bonus")}
            </div>
          )}

          {/* Countdown */}
          <div className="mb-12">
            <p className="text-gray-500 text-sm mb-4 uppercase tracking-widest">
              {t("countdown_title")}
            </p>
            <div className="flex justify-center gap-3 sm:gap-6">
              {[
                { value: daysLeft, label: t("days") },
                { value: "00", label: t("hours") },
                { value: "00", label: t("minutes") },
                { value: "00", label: t("seconds") },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl w-16 sm:w-20 h-16 sm:h-20 flex items-center justify-center">
                    <span className="text-2xl sm:text-3xl font-black text-[#FFD700]">
                      {String(item.value).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 uppercase">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {[
              { value: "48", label: "Matches" },
              { value: "32", label: "Teams" },
              { value: "∞", label: "Predictions" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-black text-white">{stat.value}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: "🪙",
              title: "GoalCoin Economy",
              desc: "Earn GC by predicting correctly. Daily check-in bonuses. Tip friends on the forum.",
            },
            {
              icon: "🏆",
              title: "Wealth Levels",
              desc: "Rise from Common to Supreme. 9 wealth levels based on your GC balance.",
            },
            {
              icon: "🤖",
              title: "AI Predictions",
              desc: "Get AI-powered match analysis to inform your predictions. Beat the algorithm!",
            },
          ].map((feat, i) => (
            <div
              key={i}
              className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-6 hover:border-[#FFD700]/30 transition-colors"
            >
              <div className="text-4xl mb-4">{feat.icon}</div>
              <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
              <p className="text-sm text-gray-400">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1E3A5F] py-8 px-4 text-center">
        <p className="text-xs text-gray-600 max-w-2xl mx-auto">
          GoalCoin (GC) is a virtual entertainment currency. GC has no monetary value
          and cannot be exchanged for real money or prizes. This platform is for
          entertainment purposes only. 18+
        </p>
        <div className="mt-4 flex justify-center gap-4 text-xs text-gray-600">
          <Link href={`/${locale}/terms`} className="hover:text-gray-400">Terms of Service</Link>
          <Link href={`/${locale}/privacy`} className="hover:text-gray-400">Privacy Policy</Link>
        </div>
        <p className="mt-3 text-xs text-gray-700">© 2026 Football2026. All rights reserved.</p>
      </footer>
    </main>
  );
}
