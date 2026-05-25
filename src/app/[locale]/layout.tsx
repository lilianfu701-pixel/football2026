import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, rtlLocales } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import SidebarLayout from "@/components/SidebarLayout";
import GlobalSidebar from "@/components/GlobalSidebar";
import { GcBalanceProvider } from "@/context/GcBalance";
import MobilePwaRegister from "@/components/mobile/MobilePwaRegister";
import "../globals.css";

const geist = Geist({ subsets: ["latin"] });

const SEO_KEYWORDS = [
  "football 2026", "soccer 2026", "world cup 2026", "worldcup 2026",
  "2026 world cup", "2026 soccer world cup", "football world cup 2026",
  "world cup prediction", "soccer prediction 2026", "football prediction game",
  "worldcup prediction", "2026 worldcup game", "football 2026 game",
  "soccer worldcup 2026", "world cup 2026 teams", "2026 world cup schedule",
  "world cup 2026 matches", "football 2026 prediction", "soccer 2026 prediction",
  "GoalCoin", "GC coin", "football coin game", "football2026",
].join(", ");

const LOCALE_META: Record<string, { title: string; description: string }> = {
  en: {
    title: "Football2026 — World Cup 2026 Prediction Game | Soccer Worldcup 2026",
    description: "Football2026 is the ultimate World Cup 2026 prediction game. Predict football 2026 match results, earn GoalCoins, climb the leaderboard. Free to play soccer worldcup 2026 prediction platform.",
  },
  zh: {
    title: "Football2026 — 2026世界杯竞猜游戏 | 足球世界杯预测平台",
    description: "Football2026是最好玩的2026世界杯竞猜平台。预测比赛结果，赢取GoalCoin，登上排行榜。免费参与world cup 2026 football soccer预测游戏。",
  },
  es: {
    title: "Football2026 — Predicción Copa del Mundo 2026 | Soccer Worldcup 2026",
    description: "Football2026 es el mejor juego de predicción del Mundial de Fútbol 2026. Predice resultados, gana GoalCoins. World cup 2026 soccer football prediction game.",
  },
  pt: {
    title: "Football2026 — Copa do Mundo 2026 Previsão | Soccer Worldcup 2026",
    description: "Football2026 é o melhor jogo de previsão da Copa do Mundo de Futebol 2026. Preveja resultados, ganhe GoalCoins. World cup 2026 prediction game.",
  },
  fr: {
    title: "Football2026 — Prédiction Coupe du Monde 2026 | Soccer Worldcup 2026",
    description: "Football2026, le meilleur jeu de prédiction de la Coupe du Monde de Football 2026. Prédisez les résultats, gagnez des GoalCoins. World cup 2026 soccer prediction.",
  },
  de: {
    title: "Football2026 — WM 2026 Tippspiel | Soccer Worldcup 2026 Prediction",
    description: "Football2026 ist das beste WM 2026 Tippspiel. Fußball Weltmeisterschaft 2026 Vorhersagen, GoalCoins verdienen. World cup 2026 football soccer prediction game.",
  },
  ar: {
    title: "Football2026 — توقعات كأس العالم 2026 | Soccer Worldcup 2026",
    description: "Football2026 هي أفضل لعبة توقعات كأس العالم لكرة القدم 2026. توقع نتائج المباريات واربح GoalCoins.",
  },
  ja: {
    title: "Football2026 — 2026ワールドカップ予想ゲーム | Soccer Worldcup 2026",
    description: "Football2026はサッカーワールドカップ2026の最高の予想ゲームです。試合結果を予想してGoalCoinを獲得しよう。",
  },
  ko: {
    title: "Football2026 — 2026 월드컵 예측 게임 | Soccer Worldcup 2026",
    description: "Football2026은 2026 축구 월드컵 최고의 예측 게임입니다. 경기 결과를 예측하고 GoalCoin을 획득하세요.",
  },
  ru: {
    title: "Football2026 — Прогнозы Чемпионат Мира 2026 | Soccer Worldcup 2026",
    description: "Football2026 — лучшая игра для прогнозов на Чемпионат Мира по футболу 2026. Предсказывайте результаты, зарабатывайте GoalCoins.",
  },
  vi: {
    title: "Football2026 — Dự Đoán World Cup 2026 | Soccer Worldcup 2026",
    description: "Football2026 là trò chơi dự đoán World Cup bóng đá 2026 tốt nhất. Dự đoán kết quả, kiếm GoalCoin. Soccer worldcup 2026 prediction game.",
  },
  id: {
    title: "Football2026 — Prediksi Piala Dunia 2026 | Soccer Worldcup 2026",
    description: "Football2026 adalah game prediksi Piala Dunia Sepak Bola 2026 terbaik. Prediksi hasil pertandingan, menangkan GoalCoin. World cup 2026 soccer football prediction.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = LOCALE_META[locale] ?? LOCALE_META.en;

  return {
    title: meta.title,
    description: meta.description,
    keywords: SEO_KEYWORDS,
    authors: [{ name: "Football2026" }],
    creator: "Football2026",
    publisher: "Football2026",
    metadataBase: new URL("https://football2026.net"),
    icons: {
      icon:     { url: "/icons/levels/favicon.png", type: "image/png", sizes: "32x32" },
      shortcut: { url: "/icons/levels/favicon.png" },
    },
    alternates: {
      canonical: `https://football2026.net/${locale === "en" ? "" : locale}`,
      languages: {
        "en": "https://football2026.net",
        "zh": "https://football2026.net/zh",
        "es": "https://football2026.net/es",
        "fr": "https://football2026.net/fr",
        "de": "https://football2026.net/de",
        "pt": "https://football2026.net/pt",
        "ru": "https://football2026.net/ru",
        "ar": "https://football2026.net/ar",
        "ja": "https://football2026.net/ja",
        "ko": "https://football2026.net/ko",
        "vi": "https://football2026.net/vi",
        "id": "https://football2026.net/id",
      },
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: "https://football2026.net",
      siteName: "Football2026",
      type: "website",
      locale: locale,
      images: [
        {
          url: "https://football2026.net/og-image.png",
          width: 1200,
          height: 630,
          alt: "Football2026 — World Cup 2026 Prediction Game",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: ["https://football2026.net/og-image.png"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();
  const isRtl = rtlLocales.includes(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let gcBalance: number | undefined;
  let nickname: string | undefined;
  let unreadMessages = 0;
  if (user) {
    const [profileRes, unreadRes] = await Promise.all([
      supabase.from("users").select("gc_balance, nickname").eq("id", user.id).single(),
      supabase.from("messages").select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id).eq("is_read", false),
    ]);
    gcBalance      = profileRes.data?.gc_balance;
    nickname       = profileRes.data?.nickname;
    unreadMessages = unreadRes.count ?? 0;

    // OAuth / trigger sign-ups may have gc_balance = NULL (trigger skips initial grant).
    // Initialise to 100 M GC on first load so the betting UI works immediately.
    if (gcBalance == null) {
      const INITIAL_GC = 100_000_000;
      await supabase
        .from("users")
        .update({ gc_balance: INITIAL_GC, gc_total: INITIAL_GC })
        .eq("id", user.id);
      gcBalance = INITIAL_GC;
    }
  }

  return (
    <html lang={locale} dir={isRtl ? "rtl" : "ltr"}>
      <head>
        {/* Favicon — fallback for browsers that don't read Next.js metadata */}
        <link rel="icon"          href="/icons/levels/favicon.png" type="image/png" sizes="32x32" />
        <link rel="shortcut icon" href="/icons/levels/favicon.png" type="image/png" />
        <link rel="manifest" href={`/${locale}/manifest.webmanifest`} />
        <link rel="apple-touch-icon" href="/icons/levels/logo.png" />
        <meta name="theme-color" content="#0A1628" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Football2026" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        {/* Extra SEO: structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Football2026",
              "alternateName": ["football 2026", "soccer worldcup 2026", "world cup 2026 prediction", "2026 football game"],
              "url": "https://football2026.net",
              "description": "Free football soccer world cup 2026 prediction game. Earn GoalCoins by predicting match results.",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://football2026.net/matches?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            }),
          }}
        />
      </head>
      <body className={`${geist.className} bg-[#0A1628]`}>
        <NextIntlClientProvider messages={messages}>
          <GcBalanceProvider initial={gcBalance ?? 0}>
            <MobilePwaRegister />
            <Navbar user={user} gcBalance={gcBalance} nickname={nickname} unreadMessages={unreadMessages} />
            <div className="pt-16">
              <SidebarLayout locale={locale} sidebar={<GlobalSidebar locale={locale} />}>
                {children}
              </SidebarLayout>
            </div>
          </GcBalanceProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
