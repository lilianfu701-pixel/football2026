"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { getFlagUrl, isTBD, getTeamDisplayName } from "@/lib/flags";

export interface BriefMatch {
  id: number;
  home_team: string;
  away_team: string;
  kickoff_time: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

interface Props {
  matches: BriefMatch[];
  locale: string;
}

function getCountdown(kickoffStr: string, locale: string): string {
  const now = new Date();
  const kickoff = new Date(kickoffStr);
  const diffMs = kickoff.getTime() - now.getTime();
  if (diffMs <= 0) return "";
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffDays >= 1) return locale === "zh" ? `${diffDays}天后开赛` : `In ${diffDays}d`;
  if (diffHours >= 1) return locale === "zh" ? `${diffHours}小时后` : `In ${diffHours}h`;
  return locale === "zh" ? "即将开赛" : "Starting soon";
}

export default function FavoritesCard({ matches, locale }: Props) {
  const zh = locale === "zh";
  const [followedIds, setFollowedIds] = useState<number[] | null>(null);

  useEffect(() => {
    const ids: number[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("follow_")) {
        const id = parseInt(key.replace("follow_", ""), 10);
        if (!isNaN(id)) ids.push(id);
      }
    }
    setFollowedIds(ids);
  }, []);

  // Still loading from localStorage
  if (followedIds === null) return null;

  // Filter: only show matches the user is following, prefer upcoming first
  const favoriteMatches = matches
    .filter((m) => followedIds.includes(m.id))
    .sort((a, b) => {
      // live first, then upcoming by kickoff, then finished
      const order = (s: string) => (s === "live" ? 0 : s === "upcoming" ? 1 : 2);
      if (order(a.status) !== order(b.status)) return order(a.status) - order(b.status);
      return new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime();
    })
    .slice(0, 2);

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 bg-gradient-to-r from-red-500/10 to-transparent border-b border-[#1E3A5F] flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-white">❤️ {zh ? "我的收藏" : "My Favorites"}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {zh ? "已关注的比赛" : "Matches you're following"}
          </p>
        </div>
        {favoriteMatches.length > 0 && (
          <Link
            href={`/${locale}/profile/favorites`}
            className="text-xs text-[#7C6FE0] hover:text-white font-semibold transition-colors whitespace-nowrap"
          >
            {zh ? "管理 →" : "Manage →"}
          </Link>
        )}
      </div>

      <div className="px-5 py-4">
        {favoriteMatches.length === 0 ? (
          /* ── Empty state ── */
          <div className="text-center py-2">
            <p className="text-3xl mb-2">🔕</p>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              {zh
                ? "还没有收藏任何比赛\n在比赛列表点击关注按钮"
                : "No favorites yet.\nFollow a match to get push alerts."}
            </p>
            <Link
              href={`/${locale}/matches`}
              className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2.5 rounded-xl bg-[#FFD700] text-[#0A1628] text-xs font-black hover:bg-[#FFC200] transition-colors"
            >
              🔔 {zh ? "收藏比赛，开启推送通知" : "Follow matches & get alerts"}
            </Link>
          </div>
        ) : (
          /* ── Match list ── */
          <div className="space-y-2.5">
            {favoriteMatches.map((m) => {
              const isFinished = m.status === "finished";
              const isLive     = m.status === "live";
              const countdown  = !isFinished && !isLive
                ? getCountdown(m.kickoff_time, locale)
                : "";

              return (
                <Link
                  key={m.id}
                  href={`/${locale}/matches/${m.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-[#0A1628] border border-[#1E3A5F] rounded-xl px-3 py-2.5 hover:border-[#FFD700]/30 transition-all group"
                >
                  {/* Teams row */}
                  <div className="flex items-center gap-2">
                    {/* Home team */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {!isTBD(m.home_team) && (
                        <div className="w-5 h-3.5 relative overflow-hidden rounded-sm shrink-0">
                          <Image
                            src={getFlagUrl(m.home_team, 40)}
                            alt={m.home_team}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      )}
                      <span className="text-xs text-gray-200 font-semibold truncate group-hover:text-white transition-colors">
                        {getTeamDisplayName(m.home_team, locale)}
                      </span>
                    </div>

                    {/* Score / vs */}
                    <div className="shrink-0 px-1 text-center">
                      {isFinished || isLive ? (
                        <span className={`text-xs font-black ${isLive ? "text-green-400" : "text-white"}`}>
                          {m.home_score ?? 0} : {m.away_score ?? 0}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-600 font-bold">vs</span>
                      )}
                    </div>

                    {/* Away team */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                      <span className="text-xs text-gray-200 font-semibold truncate text-right group-hover:text-white transition-colors">
                        {getTeamDisplayName(m.away_team, locale)}
                      </span>
                      {!isTBD(m.away_team) && (
                        <div className="w-5 h-3.5 relative overflow-hidden rounded-sm shrink-0">
                          <Image
                            src={getFlagUrl(m.away_team, 40)}
                            alt={m.away_team}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status / countdown */}
                  <div className="mt-1.5 flex items-center justify-center">
                    {isLive ? (
                      <span className="text-[10px] text-green-400 font-bold animate-pulse">
                        🔴 {zh ? "正在直播" : "LIVE"}
                      </span>
                    ) : isFinished ? (
                      <span className="text-[10px] text-gray-500">
                        {zh ? "已结束" : "Full Time"}
                      </span>
                    ) : countdown ? (
                      <span className="text-[10px] text-orange-400/80 font-medium">
                        ⏱ {countdown}
                      </span>
                    ) : null}
                  </div>
                </Link>
              );
            })}

            {/* Manage button */}
            <Link
              href={`/${locale}/profile/favorites`}
              className="block w-full text-center bg-[#1E3A5F] hover:bg-[#7C6FE0]/30 border border-[#1E3A5F] hover:border-[#7C6FE0]/50 text-gray-400 hover:text-white font-semibold py-2 rounded-xl text-xs transition-all"
            >
              {zh ? "管理收藏 →" : "Manage Favorites →"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
