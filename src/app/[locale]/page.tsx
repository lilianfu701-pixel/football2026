import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("hero");

  return (
    <main className="min-h-screen bg-[#0A1628] text-white flex flex-col items-center justify-center">
      <h1 className="text-5xl font-bold text-[#FFD700] mb-4">
        GoalCoin 2026
      </h1>
      <p className="text-xl text-gray-300 mb-8">
        {t("cta_predict")}
      </p>
      <div className="text-gray-400">
        🚧 Platform under construction — Coming Soon!
      </div>
    </main>
  );
}