"use client";

import { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography, type GeoFeature } from "react-simple-maps";
import { COUNTRY_CENTROIDS } from "@/lib/countryCentroids";
import { lc } from "@/i18n/content";
import { useLocale } from "next-intl";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ISO 3166-1 numeric → alpha-2 (covers the countries in our centroid list + major others)
const NUM_TO_A2: Record<number, string> = {
  4: "AF",   8: "AL",  12: "DZ",  24: "AO",  32: "AR",  36: "AU",
 40: "AT",  50: "BD",  56: "BE",  68: "BO",  76: "BR", 100: "BG",
120: "CM", 124: "CA", 152: "CL", 156: "CN", 170: "CO", 191: "HR",
192: "CU", 203: "CZ", 208: "DK", 218: "EC", 231: "ET", 246: "FI",
250: "FR", 276: "DE", 288: "GH", 300: "GR", 320: "GT", 348: "HU",
356: "IN", 360: "ID", 364: "IR", 368: "IQ", 380: "IT", 388: "JM",
392: "JP", 400: "JO", 404: "KE", 410: "KR", 422: "LB", 430: "LR",
434: "LY", 458: "MY", 484: "MX", 504: "MA", 516: "NA", 528: "NL",
554: "NZ", 566: "NG", 578: "NO", 586: "PK", 591: "PA", 600: "PY",
604: "PE", 608: "PH", 616: "PL", 620: "PT", 634: "QA", 642: "RO",
643: "RU", 682: "SA", 686: "SN", 703: "SK", 705: "SI", 704: "VN",
710: "ZA", 724: "ES", 752: "SE", 756: "CH", 764: "TH", 784: "AE",
788: "TN", 792: "TR", 800: "UG", 804: "UA", 818: "EG", 826: "GB",
834: "TZ", 840: "US", 858: "UY", 860: "UZ", 862: "VE", 384: "CI",
};

// Build reverse lookup from centroids for names
const A2_NAMES = new Map(COUNTRY_CENTROIDS.map((c) => [c.code, { en: c.en, zh: c.zh }]));

interface CountryVote {
  country_code: string;
  dominant: "home" | "neutral" | "away";
  home: number;
  neutral: number;
  away: number;
  total: number;
}
interface Totals { home: number; neutral: number; away: number }

interface Props {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  zh?: boolean;
}

interface TooltipState {
  x: number; y: number;
  country: string;
  home: number; away: number;
  dominant: "home" | "away" | "neutral" | null;
}

export default function MatchFanMap({ matchId, homeTeam, awayTeam, zh }: Props) {
  const locale = useLocale();
  const [voteMap, setVoteMap] = useState<Map<string, CountryVote>>(new Map());
  const [totals, setTotals] = useState<Totals>({ home: 0, neutral: 0, away: 0 });
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/match-votes-by-country?match_id=${matchId}`)
      .then((r) => r.json())
      .then((d) => {
        const m = new Map<string, CountryVote>();
        for (const c of (d.countries ?? []) as CountryVote[]) m.set(c.country_code, c);
        setVoteMap(m);
        setTotals(d.totals ?? { home: 0, neutral: 0, away: 0 });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [matchId]);

  const total = totals.home + totals.away;
  const countryCount = [...voteMap.values()].filter((v) => v.total > 0).length;

  function getFill(geoId: number) {
    const a2 = NUM_TO_A2[geoId];
    if (!a2) return "#1a2d4a";
    const cv = voteMap.get(a2);
    if (!cv || cv.total === 0) return "#1a2d4a";
    if (cv.dominant === "home")    return "#FFD700";
    if (cv.dominant === "away")    return "#A855F7";
    return "#60A5FA"; // neutral / tie
  }

  function getStroke(geoId: number) {
    const a2 = NUM_TO_A2[geoId];
    if (!a2) return "#0d1f35";
    const cv = voteMap.get(a2);
    if (!cv || cv.total === 0) return "#0d1f35";
    return "rgba(255,255,255,0.25)";
  }

  function handleMouseEnter(e: React.MouseEvent<SVGPathElement>, geoId: number) {
    const a2 = NUM_TO_A2[geoId];
    const names = a2 ? A2_NAMES.get(a2) : undefined;
    const cv = a2 ? voteMap.get(a2) : undefined;
    const name = names ? (zh ? names.zh : names.en) : String(geoId);

    const rect = (e.currentTarget.closest("[data-map]") as HTMLElement)?.getBoundingClientRect();
    if (!rect) return;

    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      country: name,
      home: cv?.home ?? 0,
      away: cv?.away ?? 0,
      dominant: cv && cv.total > 0 ? cv.dominant : null,
    });
  }

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5 mb-4">
      {/* Header */}
      <h3 className="text-sm font-bold text-gray-200 mb-1">
        🌍 {lc(locale, "全球球迷支持地图", "Global Fan Support Map")}
      </h3>
      <p className="text-xs text-gray-500 mb-3">
        {total > 0
          ? (zh
            ? `来自 ${countryCount} 个国家和地区的 ${total} 名球迷参与了投票`
            : `${total} fans across ${countryCount} countries have voted`)
          : (lc(locale, "暂无投票数据，快来成为第一个！", "No votes yet — be the first!"))}
      </p>

      {/* Legend */}
      <div className="flex items-center gap-5 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-sm bg-[#FFD700] inline-block shrink-0" />
          <span className="text-xs text-gray-300">{zh ? `支持 ${homeTeam}` : homeTeam}</span>
          {total > 0 && (
            <span className="text-xs font-black text-[#FFD700] ml-1">{totals.home}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-sm bg-purple-500 inline-block shrink-0" />
          <span className="text-xs text-gray-300">{zh ? `支持 ${awayTeam}` : awayTeam}</span>
          {total > 0 && (
            <span className="text-xs font-black text-purple-400 ml-1">{totals.away}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="w-4 h-4 rounded-sm bg-[#1a2d4a] border border-[#1E3A5F] inline-block shrink-0" />
          <span className="text-xs text-gray-600">{lc(locale, "未投票", "No votes")}</span>
        </div>
      </div>

      {/* Map */}
      <div
        data-map
        className="relative w-full rounded-xl overflow-hidden bg-[#0a1628]"
        style={{ paddingBottom: "52%" }}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-600 text-xs animate-pulse">
              {lc(locale, "地图加载中…", "Loading map…")}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0">
            <ComposableMap
              projectionConfig={{ scale: 147, center: [10, 10] }}
              width={800}
              height={420}
              style={{ width: "100%", height: "100%" }}
            >
              <Geographies geography={GEO_URL}>
                {({ geographies }: { geographies: GeoFeature[] }) =>
                  geographies.map((geo: GeoFeature) => {
                    const id = Number(geo.id);
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={getFill(id)}
                        stroke={getStroke(id)}
                        strokeWidth={0.4}
                        onMouseEnter={(e) => handleMouseEnter(e, id)}
                        onMouseLeave={() => setTooltip(null)}
                        style={{
                          default: { outline: "none" },
                          hover:   { outline: "none", opacity: 0.85, cursor: "pointer" },
                          pressed: { outline: "none" },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ComposableMap>

            {/* Tooltip */}
            {tooltip && (
              <div
                className="absolute pointer-events-none z-20 bg-[#0A1628]/95 border border-[#1E3A5F] text-white text-xs px-3 py-2 rounded-xl shadow-xl whitespace-nowrap"
                style={{
                  left: Math.min(tooltip.x + 12, 65) + "%",
                  top: Math.max(tooltip.y - 40, 6),
                }}
              >
                <p className="font-bold text-sm mb-0.5">{tooltip.country}</p>
                {tooltip.dominant ? (
                  <div className="space-y-0.5">
                    {tooltip.home > 0 && (
                      <p className="text-[#FFD700]">
                        {zh ? `支持${homeTeam}：` : `${homeTeam}: `}
                        <span className="font-black">{tooltip.home}</span>
                      </p>
                    )}
                    {tooltip.away > 0 && (
                      <p className="text-purple-400">
                        {zh ? `支持${awayTeam}：` : `${awayTeam}: `}
                        <span className="font-black">{tooltip.away}</span>
                      </p>
                    )}
                    <p className={`text-[10px] font-bold mt-1 ${
                      tooltip.dominant === "home" ? "text-[#FFD700]" : "text-purple-400"
                    }`}>
                      {tooltip.dominant === "home"
                        ? (zh ? `↑ 多数支持${homeTeam}` : `↑ Mostly for ${homeTeam}`)
                        : (zh ? `↑ 多数支持${awayTeam}` : `↑ Mostly for ${awayTeam}`)}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">{lc(locale, "暂未投票", "No votes yet")}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Country breakdown - top supporters */}
      {countryCount > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {/* Top home supporters */}
          <div>
            <p className="text-[10px] text-[#FFD700]/70 font-bold mb-1.5 uppercase tracking-wide">
              {zh ? `支持${homeTeam}` : `For ${homeTeam}`}
            </p>
            <div className="space-y-1">
              {[...voteMap.values()]
                .filter((v) => v.home > 0)
                .sort((a, b) => b.home - a.home)
                .slice(0, 4)
                .map((v) => {
                  const names = A2_NAMES.get(v.country_code);
                  return (
                    <div key={v.country_code} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">
                        {names ? (zh ? names.zh : names.en) : v.country_code}
                      </span>
                      <span className="text-[#FFD700] font-black">{v.home}</span>
                    </div>
                  );
                })}
            </div>
          </div>
          {/* Top away supporters */}
          <div>
            <p className="text-[10px] text-purple-400/70 font-bold mb-1.5 uppercase tracking-wide">
              {zh ? `支持${awayTeam}` : `For ${awayTeam}`}
            </p>
            <div className="space-y-1">
              {[...voteMap.values()]
                .filter((v) => v.away > 0)
                .sort((a, b) => b.away - a.away)
                .slice(0, 4)
                .map((v) => {
                  const names = A2_NAMES.get(v.country_code);
                  return (
                    <div key={v.country_code} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">
                        {names ? (zh ? names.zh : names.en) : v.country_code}
                      </span>
                      <span className="text-purple-400 font-black">{v.away}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
