"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { getFlagUrl, getTeamDisplayName } from "@/lib/flags";
import { getTeamColor } from "@/lib/teamColors";
import { lc } from "@/i18n/content";
import MatchFanSection from "@/components/matches/MatchFanSection";

interface LiveScore {
  homeScore: number | null;
  awayScore: number | null;
  status: string | null;
}

interface Props {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  stage: string | null;
  venue: string | null;
  locale: string;
  isLoggedIn: boolean;
}

export default function PcLiveMatchHero({
  matchId,
  homeTeam,
  awayTeam,
  homeScore: initHome,
  awayScore: initAway,
  status: initStatus,
  stage,
  venue,
  locale,
  isLoggedIn,
}: Props) {
  const [score, setScore] = useState<LiveScore>({
    homeScore: initHome,
    awayScore: initAway,
    status: initStatus,
  });
  const [celebrating, setCelebrating] = useState<"home" | "away" | null>(null);
  const prevRef = useRef({ home: initHome, away: initAway });

  useEffect(() => {
    let active = true;
    function poll() {
      fetch(`/api/mobile/live-score?matchId=${matchId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: LiveScore | null) => {
          if (!active || !data) return;
          const prev = prevRef.current;
          if (data.homeScore !== null && (data.homeScore ?? 0) > (prev.home ?? 0)) {
            setCelebrating("home");
            window.setTimeout(() => setCelebrating(null), 2500);
          } else if (data.awayScore !== null && (data.awayScore ?? 0) > (prev.away ?? 0)) {
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
  }, [matchId]);

  const homeTeamName = getTeamDisplayName(homeTeam, locale);
  const awayTeamName = getTeamDisplayName(awayTeam, locale);
  const homeColors = getTeamColor(homeTeam);
  const awayColors = getTeamColor(awayTeam);
  const homeScore = score.homeScore ?? 0;
  const awayScore = score.awayScore ?? 0;
  const isPaused = score.status === "paused";

  return (
    <section className="border-b border-[#FFD700]/20 bg-[linear-gradient(160deg,#050D1E_0%,#0d1e36_45%,#050D1E_100%)]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">

        {/* ── Score row ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-8">

          {/* Home team */}
          <div className="flex flex-1 flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getFlagUrl(homeTeam)}
              alt={homeTeamName}
              className="h-16 w-24 rounded-lg object-cover shadow-lg"
            />
            <span className="text-center text-lg font-black leading-tight text-white">
              {homeTeamName}
            </span>
          </div>

          {/* Center: badge + big score + meta */}
          <div className="flex shrink-0 flex-col items-center gap-2">
            {/* LIVE badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-black text-red-400">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              {isPaused
                ? `LIVE · ${lc(locale, "中场", "HT")}`
                : "LIVE"}
            </div>

            {/* Score */}
            <div
              className={`flex items-center gap-5 transition-transform duration-300 ${
                celebrating ? "scale-110" : "scale-100"
              }`}
            >
              <span
                className={`text-7xl font-black tabular-nums leading-none ${
                  celebrating === "home" ? "text-[#FFD700]" : "text-white"
                }`}
              >
                {homeScore}
              </span>
              <span className="text-5xl font-bold leading-none text-slate-600">–</span>
              <span
                className={`text-7xl font-black tabular-nums leading-none ${
                  celebrating === "away" ? "text-[#FFD700]" : "text-white"
                }`}
              >
                {awayScore}
              </span>
            </div>

            {stage && (
              <span className="mt-0.5 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                {stage}
              </span>
            )}
            {venue && (
              <span className="text-[11px] text-slate-600">📍 {venue}</span>
            )}
            <Link
              href={`/${locale}/matches/${matchId}`}
              className="mt-1 flex items-center gap-1 text-xs text-[#FFD700]/60 transition-colors hover:text-[#FFD700]"
            >
              {lc(locale, "查看完整赛事页", "Full match details")}
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {/* Away team */}
          <div className="flex flex-1 flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getFlagUrl(awayTeam)}
              alt={awayTeamName}
              className="h-16 w-24 rounded-lg object-cover shadow-lg"
            />
            <span className="text-center text-lg font-black leading-tight text-white">
              {awayTeamName}
            </span>
          </div>
        </div>

        {/* ── Fan map ────────────────────────────────────────────────────── */}
        <div className="mt-8">
          <MatchFanSection
            key={String(matchId)}
            matchId={matchId}
            homeTeam={homeTeamName}
            awayTeam={awayTeamName}
            homeColors={homeColors}
            awayColors={awayColors}
            zh={locale === "zh"}
            loggedIn={isLoggedIn}
            canPersistProps={isLoggedIn}
            showCurrentUserMarker
          />
        </div>
      </div>
    </section>
  );
}
