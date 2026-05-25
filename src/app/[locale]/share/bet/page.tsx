import type { Metadata } from "next";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
// /[locale]/share/bet?home=Brazil&away=France&hc=br&ac=fr
//   &pick=home&gc=10000000&odds=2.5&user=Alice&match_id=123
//   &locale=en&stage=Group+A
//
// This page exists solely so Facebook (and other scrapers) can read
// og:image = the prediction card PNG.  The user is immediately shown a
// "View Match" CTA and the page auto-redirects after 2 s.
// ─────────────────────────────────────────────────────────────────────────────

type Params      = Promise<{ locale: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function sp(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params:      Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { locale } = await params;
  const raw        = await searchParams;

  const home  = sp(raw.home)  || "Home";
  const away  = sp(raw.away)  || "Away";
  const pick  = sp(raw.pick)  || "home";
  const gc    = sp(raw.gc)    || "0";
  const odds  = sp(raw.odds)  || "1";
  const user  = sp(raw.user)  || "Someone";
  const stage = sp(raw.stage);

  const zh = locale === "zh";

  const pickLabel: Record<string, string> = {
    home: zh ? `${home} 胜` : `${home} Win`,
    draw: zh ? "平局"        : "Draw",
    away: zh ? `${away} 胜` : `${away} Win`,
  };
  const gcFmt = Number(gc) >= 1_000_000
    ? `${(Number(gc) / 1_000_000).toFixed(0)}M`
    : gc;

  const title = zh
    ? `${user} 在 Football2026 押注了 ${home} vs ${away}！`
    : `${user} predicted ${home} vs ${away} on Football2026!`;

  const description = zh
    ? `预测：${pickLabel[pick] ?? pick} · 押注 ${gcFmt} GC · 赔率 ${odds}× · 快来加入2026世界杯竞猜！`
    : `Pick: ${pickLabel[pick] ?? pick} · ${gcFmt} GC staked · ${odds}× odds${stage ? ` · ${stage}` : ""} · Join the World Cup 2026 prediction game!`;

  // Rebuild OG image params from whatever was passed
  const ogEntries = (["home","away","hc","ac","pick","gc","odds","user","locale","stage"] as const)
    .map(k => [k, sp(raw[k])])
    .filter(([, v]) => v !== "");
  const ogParams = new URLSearchParams(Object.fromEntries(ogEntries));
  const ogImageUrl = `https://football2026.net/api/og/share-bet?${ogParams.toString()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url:      `https://football2026.net/${locale}/share/bet?${new URLSearchParams(Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,sp(v)]))).toString()}`,
      siteName: "Football2026",
      type:     "website",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card:        "summary_large_image",
      title,
      description,
      images:      [ogImageUrl],
    },
    robots: { index: false, follow: false },
  };
}

export default async function ShareBetPage({
  params,
  searchParams,
}: {
  params:      Params;
  searchParams: SearchParams;
}) {
  const { locale }  = await params;
  const raw         = await searchParams;

  const home     = sp(raw.home)     || "Home";
  const away     = sp(raw.away)     || "Away";
  const pick     = sp(raw.pick)     || "home";
  const gc       = sp(raw.gc)       || "0";
  const odds     = sp(raw.odds)     || "1";
  const user     = sp(raw.user)     || "Someone";
  const matchId  = sp(raw.match_id);

  const zh = locale === "zh";

  const pickLabel: Record<string, string> = {
    home: zh ? `${home} 胜` : `${home} Win`,
    draw: zh ? "平局"        : "Draw",
    away: zh ? `${away} 胜` : `${away} Win`,
  };
  const gcFmt = Number(gc) >= 1_000_000
    ? `${(Number(gc) / 1_000_000).toFixed(0)}M`
    : gc;

  const ogEntries = (["home","away","hc","ac","pick","gc","odds","user","locale","stage"] as const)
    .map(k => [k, sp(raw[k])])
    .filter(([, v]) => v !== "");
  const ogImageUrl = `/api/og/share-bet?${new URLSearchParams(Object.fromEntries(ogEntries)).toString()}`;

  const matchHref = matchId ? `/${locale}/matches/${matchId}` : `/${locale}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0A1628]"
      // Auto-redirect via client script
      suppressHydrationWarning
    >
      <script
        dangerouslySetInnerHTML={{
          __html: `setTimeout(function(){window.location.replace(${JSON.stringify(matchHref)})},2000)`,
        }}
      />
        {/* Prediction card preview */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ogImageUrl}
          alt="Prediction card"
          className="w-full max-w-lg rounded-2xl shadow-2xl border border-[#1E3A5F]"
        />

        {/* Info */}
        <div className="mt-6 text-center space-y-1">
          <p className="text-white font-black text-lg">
            {zh
              ? `${user} 押注了 ${home} vs ${away}`
              : `${user} predicted ${home} vs ${away}`}
          </p>
          <p className="text-[#FFD700] font-bold">
            {pickLabel[pick] ?? pick} · {gcFmt} GC · {odds}×
          </p>
          <p className="text-gray-500 text-sm mt-2">
            {zh ? "正在跳转到比赛页面…" : "Redirecting to the match…"}
          </p>
        </div>

        <Link
          href={matchHref}
          className="mt-6 px-8 py-3 bg-[#FFD700] text-[#0A1628] font-black rounded-xl hover:bg-[#FFC200] transition-colors"
        >
          {zh ? "立即查看比赛 →" : "View Match →"}
        </Link>

        <p className="mt-4 text-[10px] text-gray-600">
          Football2026 — World Cup 2026 Prediction Game
        </p>
    </div>
  );
}
