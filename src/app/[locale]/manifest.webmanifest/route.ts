import { routing } from "@/i18n/routing";

const names = {
  zh: {
    name: "Football2026 世界杯竞猜",
    shortName: "Football2026",
    description: "世界杯竞猜、GoalCoin、赛程和排行榜",
    predict: "立即竞猜",
    matches: "今日赛程",
    checkin: "每日签到",
    bets: "我的竞猜",
  },
  en: {
    name: "Football2026 World Cup Predictions",
    shortName: "Football2026",
    description: "World Cup predictions, GoalCoin, matches, and leaderboard",
    predict: "Predict Now",
    matches: "Today Matches",
    checkin: "Daily Check-in",
    bets: "My Bets",
  },
};

function cleanLocale(locale: string) {
  return routing.locales.includes(locale as (typeof routing.locales)[number]) ? locale : routing.defaultLocale;
}

function getCopy(locale: string) {
  return locale === "zh" ? names.zh : names.en;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale: rawLocale } = await params;
  const locale = cleanLocale(rawLocale);
  const t = getCopy(locale);
  const basePath = `/${locale}`;
  const mobilePath = `${basePath}/m`;

  const manifest = {
    id: mobilePath,
    name: t.name,
    short_name: t.shortName,
    description: t.description,
    lang: locale,
    start_url: `${mobilePath}?source=pwa`,
    scope: `${basePath}/`,
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "portrait",
    background_color: "#081120",
    theme_color: "#0A1628",
    categories: ["sports", "games", "entertainment"],
    icons: [
      {
        src: "/icons/levels/favicon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icons/levels/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
    shortcuts: [
      {
        name: t.predict,
        short_name: t.predict,
        url: `${mobilePath}?view=predict&source=shortcut`,
        icons: [{ src: "/icons/levels/GC.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: t.matches,
        short_name: t.matches,
        url: `${mobilePath}?view=matches&source=shortcut`,
        icons: [{ src: "/icons/levels/logo.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: t.checkin,
        short_name: t.checkin,
        url: `${mobilePath}?view=mine&source=shortcut`,
        icons: [{ src: "/icons/levels/GC.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: t.bets,
        short_name: t.bets,
        url: `${mobilePath}?view=predict&source=shortcut`,
        icons: [{ src: "/icons/levels/badge_lv_7.png", sizes: "96x96", type: "image/png" }],
      },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
    },
  });
}
