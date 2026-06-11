"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { ComposableMap, Geographies, Geography, Marker, type GeoFeature } from "react-simple-maps";
import { COUNTRY_CENTROIDS } from "@/lib/countryCentroids";
import { getFlagUrl, getTeamDisplayName } from "@/lib/flags";

const GEO_URL = "/countries-110m.json";
const centroidMap = new Map(COUNTRY_CENTROIDS.map((c) => [c.code, c]));
const A2_NAMES    = new Map(COUNTRY_CENTROIDS.map((c) => [c.code, { en: c.en, zh: c.zh }]));
const MAX_DOTS    = 60;

// ── Equal-Earth projection (same math as MatchFanSection) ─────────────────────
const _DEG   = Math.PI / 180;
const _EE_A1 = 1.340264, _EE_A2 = -0.081106, _EE_A3 = 0.000893, _EE_A4 = 0.003796;
const _EE_M  = Math.sqrt(3) / 2;
const _cosDp = Math.cos(-10 * _DEG);
const _sinDp = Math.sin(-10 * _DEG);

function _preRotate(lngDeg: number, latDeg: number): [number, number] {
  const lambda = lngDeg * _DEG - 10 * _DEG;
  const phi    = latDeg * _DEG;
  const cosPhi = Math.cos(phi);
  const x = Math.cos(lambda) * cosPhi;
  const y = Math.sin(lambda) * cosPhi;
  const z = Math.sin(phi);
  const k = z * _cosDp + x * _sinDp;
  return [Math.atan2(y, x * _cosDp - z * _sinDp), Math.asin(Math.max(-1, Math.min(1, k)))];
}

function _equalEarthRaw(λ: number, φ: number): [number, number] {
  const l  = Math.asin(_EE_M * Math.sin(φ));
  const l2 = l * l, l4 = l2 * l2, l6 = l4 * l2;
  const denom = _EE_M * (9 * _EE_A4 * l6 + 7 * _EE_A3 * l4 + 3 * _EE_A2 * l2 + _EE_A1);
  return [λ * Math.cos(l) / denom, l * (_EE_A4 * l6 + _EE_A3 * l4 + _EE_A2 * l2 + _EE_A1)];
}

function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function jitteredCoords(
  baseLng: number, baseLat: number, code: string, idx: number, total: number,
): [number, number] {
  const spread = Math.min(2.5 + Math.sqrt(total) * 0.7, 9);
  const c0 = code.charCodeAt(0) * 0.01;
  const c1 = (code.charCodeAt(1) ?? 65) * 0.01;
  return [
    baseLng + (pseudoRand(idx * 1.618 + c0) - 0.5) * spread * 1.5,
    baseLat + (pseudoRand(idx * 2.718 + c1) - 0.5) * spread,
  ];
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface CountryVote {
  country_code: string;
  home: number;
  away: number;
}

interface VoterDot {
  coords:  [number, number];
  side:    "home" | "away";
  country: string;
}

interface TooltipState {
  x: number; y: number;
  country: string;
  home: number; away: number;
}

interface TeamColors { primary: string; secondary: string; }

interface Props {
  matchId:    number;
  homeTeam:   string;
  awayTeam:   string;
  homeColors: TeamColors;
  awayColors: TeamColors;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FanMapEmbed({ matchId, homeTeam, awayTeam, homeColors, awayColors }: Props) {
  const [dots,    setDots]    = useState<VoterDot[]>([]);
  const [totals,  setTotals]  = useState({ home: 0, neutral: 0, away: 0 });
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const countryTotals = useMemo(() => {
    return dots.reduce<Map<string, { home: number; away: number }>>((acc, dot) => {
      const existing = acc.get(dot.country) ?? { home: 0, away: 0 };
      acc.set(dot.country, {
        home: existing.home + (dot.side === "home" ? 1 : 0),
        away: existing.away + (dot.side === "away" ? 1 : 0),
      });
      return acc;
    }, new Map());
  }, [dots]);

  const load = useCallback(() => {
    fetch(`/api/match-votes-by-country?match_id=${matchId}`)
      .then((r) => r.json())
      .then((d) => {
        interface PreciseDotRaw { vote: "home" | "away"; lat: number; lng: number; country_code: string; }
        const preciseDots: VoterDot[] = ((d.dots ?? []) as PreciseDotRaw[]).map((r) => ({
          coords:  [r.lng, r.lat] as [number, number],
          side:    r.vote,
          country: r.country_code,
        }));

        const preciseByCountry = new Map<string, { home: number; away: number }>();
        for (const dot of preciseDots) {
          const t = preciseByCountry.get(dot.country) ?? { home: 0, away: 0 };
          preciseByCountry.set(dot.country, {
            home: t.home + (dot.side === "home" ? 1 : 0),
            away: t.away + (dot.side === "away" ? 1 : 0),
          });
        }

        const jittered: VoterDot[] = [];
        for (const cv of (d.countries ?? []) as CountryVote[]) {
          const centroid = centroidMap.get(cv.country_code);
          if (!centroid) continue;
          const pc      = preciseByCountry.get(cv.country_code) ?? { home: 0, away: 0 };
          const homeCap = Math.min(Math.max(0, cv.home - pc.home), MAX_DOTS);
          const awayCap = Math.min(Math.max(0, cv.away - pc.away), MAX_DOTS);
          const total   = cv.home + cv.away;
          for (let i = 0; i < homeCap; i++)
            jittered.push({ coords: jitteredCoords(centroid.lng, centroid.lat, cv.country_code + "H", i, total), side: "home", country: cv.country_code });
          for (let i = 0; i < awayCap; i++)
            jittered.push({ coords: jitteredCoords(centroid.lng, centroid.lat, cv.country_code + "A", i, total), side: "away", country: cv.country_code });
        }

        setDots([...preciseDots, ...jittered]);
        setTotals(d.totals ?? { home: 0, neutral: 0, away: 0 });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [matchId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const mapTotal     = totals.home + totals.away;
  const countryCount = new Set(dots.map((d) => d.country)).size;

  function handleDotEnter(e: React.MouseEvent<SVGGElement>, dot: VoterDot) {
    const rect = (e.currentTarget.closest("[data-map]") as HTMLElement)?.getBoundingClientRect();
    if (!rect) return;
    const ct    = countryTotals.get(dot.country) ?? { home: 0, away: 0 };
    const names = A2_NAMES.get(dot.country);
    setTooltip({
      x:       e.clientX - rect.left,
      y:       e.clientY - rect.top,
      country: names?.en ?? dot.country,
      home:    ct.home,
      away:    ct.away,
    });
  }

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
      <div className="px-4 pt-4 pb-4">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <img src={getFlagUrl(homeTeam, 40)} alt={homeTeam} className="w-6 h-4 object-cover rounded-[2px]" />
            <span className="text-xs font-bold text-gray-200">{getTeamDisplayName(homeTeam, "en")}</span>
            <span className="text-xs text-gray-500 mx-0.5">vs</span>
            <span className="text-xs font-bold text-gray-200">{getTeamDisplayName(awayTeam, "en")}</span>
            <img src={getFlagUrl(awayTeam, 40)} alt={awayTeam} className="w-6 h-4 object-cover rounded-[2px]" />
          </div>
          <span className="text-[10px] text-gray-500">
            {mapTotal > 0 ? `${mapTotal} fans · ${countryCount} countries` : "No votes yet"}
          </span>
        </div>

        <h3 className="text-sm font-bold text-gray-200 mb-2">🌍 Global Fan Support Map</h3>

        {/* ── Legend ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: homeColors.primary, boxShadow: `0 0 0 1.5px ${homeColors.secondary}55` }} />
            <span className="text-xs text-gray-400">{getTeamDisplayName(homeTeam, "en")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">{getTeamDisplayName(awayTeam, "en")}</span>
            <span className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: awayColors.primary, boxShadow: `0 0 0 1.5px ${awayColors.secondary}55` }} />
          </div>
        </div>

        {/* ── Map ──────────────────────────────────────────────────────────── */}
        <div
          data-map
          className="relative w-full rounded-xl overflow-hidden"
          style={{ paddingBottom: "50%", background: "#0a1525" }}
          onMouseLeave={() => setTooltip(null)}
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-gray-600 text-xs animate-pulse">Loading…</span>
            </div>
          ) : (
            <div className="absolute inset-0">
              <ComposableMap
                projectionConfig={{ scale: 147, center: [10, 10] }}
                width={800} height={400}
                style={{ width: "100%", height: "100%" }}
              >
                <Geographies geography={GEO_URL}>
                  {({ geographies }: { geographies: GeoFeature[] }) =>
                    geographies.map((geo: GeoFeature) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill="#111d30"
                        stroke="#1a2d4a"
                        strokeWidth={0.5}
                        style={{ default: { outline: "none" }, hover: { outline: "none" }, pressed: { outline: "none" } }}
                      />
                    ))
                  }
                </Geographies>

                {dots.map((dot, i) => {
                  const tc       = dot.side === "home" ? homeColors : awayColors;
                  const twoColor = tc.secondary !== tc.primary;
                  return (
                    <Marker key={i} coordinates={dot.coords}>
                      <g
                        style={{ cursor: "default" }}
                        onMouseEnter={(e) => handleDotEnter(e as unknown as React.MouseEvent<SVGGElement>, dot)}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <circle r={twoColor ? 5.2 : 3.8} fill={twoColor ? tc.secondary : tc.primary} fillOpacity={twoColor ? 0.62 : 0.85} />
                        {twoColor && <circle r={3.0} fill={tc.primary} fillOpacity={0.95} />}
                      </g>
                    </Marker>
                  );
                })}
              </ComposableMap>

              {tooltip && (
                <div
                  className="pointer-events-none absolute z-50 rounded-lg border border-[#1E3A5F] bg-[#0B1A30]/95 px-2.5 py-1.5 text-[11px] leading-tight shadow-2xl"
                  style={{ left: Math.min(tooltip.x + 8, 260), top: Math.max(tooltip.y - 44, 4) }}
                >
                  <p className="font-bold text-gray-200">{tooltip.country}</p>
                  {(tooltip.home + tooltip.away) > 0 && (
                    <p className="text-gray-400 mt-0.5">
                      <span style={{ color: homeColors.primary }}>
                        {getTeamDisplayName(homeTeam, "en")} {tooltip.home}
                      </span>
                      {" · "}
                      <span style={{ color: awayColors.primary }}>
                        {getTeamDisplayName(awayTeam, "en")} {tooltip.away}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Vote summary bar ─────────────────────────────────────────────── */}
        {mapTotal > 0 && (
          <div className="mt-3 flex text-[10px] gap-1">
            <div className="flex-1 text-center" style={{ color: homeColors.primary }}>
              {getTeamDisplayName(homeTeam, "en")} {totals.home} ({Math.round(totals.home / mapTotal * 100)}%)
            </div>
            <div className="flex-1 text-center text-gray-600">
              Neutral {totals.neutral}
            </div>
            <div className="flex-1 text-center" style={{ color: awayColors.primary }}>
              {getTeamDisplayName(awayTeam, "en")} {totals.away} ({Math.round(totals.away / mapTotal * 100)}%)
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
