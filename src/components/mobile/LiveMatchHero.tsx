"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { getFlagUrl, getTeamDisplayName } from "@/lib/flags";
import { getTeamColor } from "@/lib/teamColors";
import { lc } from "@/i18n/content";
import MatchFanSection from "@/components/matches/MatchFanSection";
import type { MobileMatch } from "@/components/mobile/MobileHome";

interface LiveScore {
  homeScore: number | null;
  awayScore: number | null;
  status: string | null;
}

function getMobileMatchUrl(locale: string, matchId: number): string {
  const prefix = locale === "en" ? "" : `/${locale}`;
  return `${prefix}/matches/${matchId}`;
}

export default function LiveMatchHero({
  match,
  locale,
  isLoggedIn,
  canPersistActions,
}: {
  match: MobileMatch;
  locale: string;
  isLoggedIn: boolean;
  canPersistActions: boolean;
}) {
  const [score, setScore] = useState<LiveScore>({
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    status: match.status,
  });
  const [celebrating, setCelebrating] = useState<"home" | "away" | null>(null);
  const prevRef = useRef({ home: match.homeScore, away: match.awayScore });

  // Poll for live score every 30 s
  useEffect(() => {
    let active = true;

    function poll() {
      fetch(`/api/mobile/live-score?matchId=${match.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: LiveScore | null) => {
          if (!active || !data) return;
          const prev = prevRef.current;
          if (
            data.homeScore !== null &&
            prev.home !== null &&
            data.homeScore > (prev.home ?? 0)
          ) {
            setCelebrating("home");
            window.setTimeout(() => setCelebrating(null), 2500);
          } else if (
            data.awayScore !== null &&
            prev.away !== null &&
            data.awayScore > (prev.away ?? 0)
          ) {
            setCelebrating("away");
            window.setTimeout(() => setCelebrating(null), 2500);
          }
          prevRef.current = { home: data.homeScore, away: data.awayScore };
          setScore(data);
        })
        .catch(() => {});
    }

    const id = window.setInterval(poll, 30_000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [match.id]);

  const homeTeamName = getTeamDisplayName(match.homeTeam, locale);
  const awayTeamName = getTeamDisplayName(match.awayTeam, locale);
  const homeColors = getTeamColor(match.homeTeam);
  const awayColors = getTeamColor(match.awayTeam);
  const homeScore = score.homeScore ?? 0;
  const awayScore = score.awayScore ?? 0;
  const isPaused = score.status === "paused";

  return (
    <section className="overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(145deg,#0d1a2b_0%,#10345b_58%,#14533b_100%)]">
      {/* ── Live score header ──────────────────────────────────────────────── */}
      <div className="relative p-3 pb-1">
        {/* Goal flash overlay */}
        {celebrating && (
          <div
            className={`pointer-events-none absolute inset-0 rounded-t-xl transition-opacity duration-300 ${
              celebrating === "home"
                ? "bg-gradient-to-r from-[#FFD700]/15 to-transparent"
                : "bg-gradient-to-l from-[#FFD700]/15 to-transparent"
            }`}
          />
        )}

        {/* Top row: LIVE badge + half-time label + details link */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] font-black text-red-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            LIVE
          </div>

          {isPaused && (
            <span className="text-[11px] font-bold text-slate-400">
              {lc(locale, "中场休息", "Half Time")}
            </span>
          )}

          <a
            href={getMobileMatchUrl(locale, match.id)}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-400"
          >
            {lc(locale, "详情", "Details")}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Score row */}
        <div className="flex items-center justify-between gap-2">
          {/* Home team */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getFlagUrl(match.homeTeam)}
              alt={homeTeamName}
              className="h-10 w-10 rounded-full object-cover shadow-md"
            />
            <span className="line-clamp-2 text-center text-[12px] font-black leading-tight text-white">
              {homeTeamName}
            </span>
          </div>

          {/* Score */}
          <div className="flex shrink-0 flex-col items-center gap-0.5">
            <div
              className={`flex items-center gap-2 transition-transform duration-300 ${
                celebrating ? "scale-110" : "scale-100"
              }`}
            >
              <span
                className={`text-4xl font-black tabular-nums leading-none ${
                  celebrating === "home" ? "text-[#FFD700]" : "text-white"
                }`}
              >
                {homeScore}
              </span>
              <span className="text-2xl font-bold leading-none text-slate-500">–</span>
              <span
                className={`text-4xl font-black tabular-nums leading-none ${
                  celebrating === "away" ? "text-[#FFD700]" : "text-white"
                }`}
              >
                {awayScore}
              </span>
            </div>
            {match.stage && (
              <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {match.stage}
              </span>
            )}
          </div>

          {/* Away team */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getFlagUrl(match.awayTeam)}
              alt={awayTeamName}
              className="h-10 w-10 rounded-full object-cover shadow-md"
            />
            <span className="line-clamp-2 text-center text-[12px] font-black leading-tight text-white">
              {awayTeamName}
            </span>
          </div>
        </div>

        {match.venue && match.city && (
          <p className="mt-2 text-center text-[10px] text-slate-500">
            {match.city} · {match.venue}
          </p>
        )}
      </div>

      {/* ── Fan map (votes + world map + share + fireworks) ─────────────────── */}
      <MatchFanSection
        key={String(match.id)}
        matchId={match.id}
        homeTeam={homeTeamName}
        awayTeam={awayTeamName}
        homeColors={homeColors}
        awayColors={awayColors}
        zh={locale === "zh"}
        loggedIn={isLoggedIn || canPersistActions}
        canPersistProps={canPersistActions}
        showCurrentUserMarker
        mobileAudioUnlock
      />
    </section>
  );
}
