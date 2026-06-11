export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { getTeamColor } from "@/lib/teamColors";
import { getTeamDisplayName, getFlagCode } from "@/lib/flags";
import MatchFanSection from "@/components/matches/MatchFanSection";
import { lc } from "@/i18n/content";

interface PageProps {
  params:       Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ vote?: string }>;
}

export async function generateMetadata(
  { params, searchParams }: PageProps,
): Promise<Metadata> {
  const { locale, id } = await params;
  const { vote }       = await searchParams;
  const zh             = locale === "zh";

  const anon    = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const service = createServiceClient();

  const [matchRes, votesRes] = await Promise.all([
    anon.from("matches").select("id, home_team, away_team").eq("id", id).single(),
    service.from("match_votes").select("vote").eq("match_id", id),
  ]);

  if (!matchRes.data) return { title: "Fan Map | Football2026" };

  const { home_team, away_team } = matchRes.data as { home_team: string; away_team: string };
  const home = getTeamDisplayName(home_team, locale);
  const away = getTeamDisplayName(away_team, locale);

  // Count vote totals
  const votes  = (votesRes.data ?? []) as { vote: string }[];
  const homeN  = votes.filter((v) => v.vote === "home").length;
  const awayN  = votes.filter((v) => v.vote === "away").length;
  const total  = votes.length;
  const homePct = total > 0 ? Math.round((homeN / total) * 100) : 50;
  const awayPct = total > 0 ? Math.max(0, Math.round((awayN / total) * 100)) : 50;

  const homeColors = getTeamColor(home_team);
  const awayColors = getTeamColor(away_team);
  const homeCode   = getFlagCode(home_team);
  const awayCode   = getFlagCode(away_team);

  const title = zh
    ? `🌍 ${home} vs ${away} 全球球迷支持地图 | Football2026`
    : `🌍 ${home} vs ${away} — Global Fan Support Map | Football2026`;

  const description = total > 0
    ? zh
      ? `${homeN} 人支持 ${home}（${homePct}%）vs ${awayN} 人支持 ${away}（${awayPct}%）。加入 Football2026 球迷地图，投票助威，发射道具！`
      : `${homeN} fans support ${home} (${homePct}%) vs ${awayN} back ${away} (${awayPct}%). Join Football2026 — vote, fire props, earn GoalCoins!`
    : zh
      ? `为 ${home} 或 ${away} 投票，加入全球球迷支持地图。发射道具，赢取 GoalCoin！`
      : `Vote for ${home} or ${away} on the Football2026 global fan map. Fire props, earn GoalCoins!`;

  // Build OG image URL with all match + vote data encoded
  const ogParams = new URLSearchParams({
    home,
    away,
    homeCode,
    awayCode,
    homePct:   String(homePct),
    awayPct:   String(awayPct),
    fans:      String(total),
    homeColor: homeColors.primary.replace("#", ""),
    awayColor: awayColors.primary.replace("#", ""),
    locale,
  });
  if (vote === "home" || vote === "away") {
    ogParams.set("vote", vote);
  }

  const canonicalPath = locale === "en" ? `/fan-map/${id}` : `/${locale}/fan-map/${id}`;
  const ogImageUrl    = `https://www.football2026.net/api/og/fan-map?${ogParams.toString()}`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.football2026.net${canonicalPath}`,
    },
    openGraph: {
      title,
      description,
      url:      `https://www.football2026.net${canonicalPath}`,
      siteName: "Football2026",
      type:     "website",
      images: [{
        url:    ogImageUrl,
        width:  1200,
        height: 630,
        alt:    title,
      }],
    },
    twitter: {
      card:        "summary_large_image",
      title,
      description,
      images:      [ogImageUrl],
    },
  };
}

export default async function FanMapSharePage({ params }: PageProps) {
  const { locale, id } = await params;
  const matchId = parseInt(id);
  if (isNaN(matchId)) notFound();

  const anon = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: match } = await anon
    .from("matches")
    .select("id, home_team, away_team")
    .eq("id", matchId)
    .single();

  if (!match) notFound();

  const { home_team, away_team } = match as { home_team: string; away_team: string };
  const homeColors = getTeamColor(home_team);
  const awayColors = getTeamColor(away_team);
  const zh         = locale === "zh";

  const matchPath = locale === "en"
    ? `/matches/${matchId}`
    : `/${locale}/matches/${matchId}`;

  return (
    <div className="min-h-screen bg-[#0A1628]">
      {/* ── Back link ─────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-1">
        <a
          href={matchPath}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#FFD700] transition-colors"
        >
          ← {lc(locale, "返回比赛详情", "Back to match")}
        </a>
      </div>

      {/* ── Full interactive fan map ───────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 pb-10">
        <MatchFanSection
          matchId={matchId}
          homeTeam={home_team}
          awayTeam={away_team}
          homeColors={homeColors}
          awayColors={awayColors}
          zh={zh}
          loggedIn={false}
        />
      </div>
    </div>
  );
}
