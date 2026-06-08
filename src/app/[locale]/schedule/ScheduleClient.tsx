"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getFlagCode, getTeamDisplayName } from "@/lib/flags";
import { lc } from "@/i18n/content";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Match {
  id: number;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  kickoff_time: string;
  status: string;
  group_name: string | null;
  stage: string;
  venue: string | null;
  city: string | null;
}

interface Standing {
  team: string;
  P: number;
  W: number;
  D: number;
  L: number;
  GF: number;
  GA: number;
  GD: number;
  Pts: number;
  qualified?: boolean;
}

interface GroupData {
  group: string;
  matches: Match[];
  standings: Standing[];
}

interface Props {
  locale: string;
  groups: GroupData[];
  knockoutMatches: Record<string, Match[]>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  if (locale === "zh") {
    return `${d.getMonth() + 1}月${d.getDate()}日 ${hh}:${mm}`;
  }
  const months = locale === "es"
    ? ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]
    : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getDate()} ${hh}:${mm}`;
}

function StatusPill({ status, zh, locale }: { status: string; zh: boolean; locale: string }) {
  if (status === "live") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-black text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
        LIVE
      </span>
    );
  }
  if (status === "finished") {
    return (
      <span className="text-[10px] font-bold text-gray-500 bg-gray-500/10 px-2 py-0.5 rounded-full shrink-0">
        {lc(locale, "已结束", "FT")}
      </span>
    );
  }
  return null;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ScheduleClient({ locale, groups, knockoutMatches }: Props) {
  const zh = locale === "zh";
  const groupNames = groups.map((g) => g.group);

  const STAGE_LABELS: Record<string, string> = {
    group:   lc(locale, "小组赛", "Groups"),
    round32: lc(locale, "32强", "R32"),
    round16: lc(locale, "16强", "R16"),
    quarter: lc(locale, "四分之一决赛", "QF"),
    semi:    lc(locale, "半决赛", "SF"),
    third:   lc(locale, "季军赛", "3rd"),
    final:   lc(locale, "决赛", "Final"),
  };

  const knockoutStages = Object.keys(knockoutMatches).filter(
    (s) => knockoutMatches[s].length > 0
  );

  const allTabs = ["group", ...knockoutStages];
  const [activeTab, setActiveTab] = useState("group");
  const [activeGroup, setActiveGroup] = useState(groupNames[0] ?? "A");

  const selectedGroup = groups.find((g) => g.group === activeGroup);

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20">
      <div className="pt-8">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-black text-white">
            🗓️ {lc(locale, "赛程 & 积分榜", "Schedule & Standings")}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {lc(locale, "2026 FIFA 世界杯 · 48 队 · 104 场", "2026 FIFA World Cup · 48 Teams · 104 Matches")}
          </p>
        </div>

        {/* Stage Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-5 scrollbar-hide">
          {allTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-[#FFD700] text-[#0A1628]"
                  : "bg-[#0F2040] border border-[#1E3A5F] text-gray-400 hover:text-white"
              }`}
            >
              {STAGE_LABELS[tab] ?? tab}
            </button>
          ))}
        </div>

        {/* ── Group Stage ── */}
        {activeTab === "group" && (
          <div className="space-y-5">
            {/* Group selector */}
            <div className="flex gap-2 flex-wrap">
              {groupNames.map((g) => (
                <button
                  key={g}
                  onClick={() => setActiveGroup(g)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                    activeGroup === g
                      ? "bg-[#1E3A5F] text-white border border-[#FFD700]/60"
                      : "text-gray-500 hover:text-white"
                  }`}
                >
                  {zh ? `${g}组` : locale === "es" ? `Grupo ${g}` : `Group ${g}`}
                </button>
              ))}
            </div>

            {selectedGroup && (
              <div className="space-y-4">
                {/* Standings table */}
                <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#1E3A5F] flex items-center justify-between">
                    <h2 className="text-sm font-black text-white">
                      {zh ? `${activeGroup}组积分榜` : locale === "es" ? `Clasificación Grupo ${activeGroup}` : `Group ${activeGroup} Standings`}
                    </h2>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                      P · W · D · L · GD · Pts
                    </span>
                  </div>
                  <div className="divide-y divide-[#1E3A5F]/50">
                    {selectedGroup.standings.map((s, i) => {
                      const fc = getFlagCode(s.team);
                      const qualified = i < 2;
                      return (
                        <div
                          key={s.team}
                          className={`flex items-center gap-3 px-4 py-3 ${
                            qualified ? "bg-green-500/5" : ""
                          }`}
                        >
                          {/* Rank */}
                          <span className={`text-sm font-black w-5 shrink-0 ${
                            qualified ? "text-green-400" : "text-gray-600"
                          }`}>
                            {i + 1}
                          </span>
                          {/* Flag + team */}
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {fc ? (
                              <Image
                                src={`https://flagcdn.com/w40/${fc}.png`}
                                alt=""
                                width={22}
                                height={15}
                                className="rounded-sm shrink-0"
                                unoptimized
                              />
                            ) : (
                              <span className="text-sm shrink-0">🏳️</span>
                            )}
                            <span className="text-sm font-bold text-white truncate">{getTeamDisplayName(s.team, locale)}</span>
                            {qualified && (
                              <span className="text-[9px] text-green-400 bg-green-500/15 px-1.5 py-0.5 rounded-full shrink-0 font-bold">
                                {lc(locale, "出线", "Q")}
                              </span>
                            )}
                          </div>
                          {/* Stats */}
                          <div className="flex items-center gap-4 text-sm font-mono shrink-0">
                            <span className="text-gray-500 w-5 text-center">{s.P}</span>
                            <span className="text-gray-300 w-5 text-center">{s.W}</span>
                            <span className="text-gray-300 w-5 text-center">{s.D}</span>
                            <span className="text-gray-300 w-5 text-center">{s.L}</span>
                            <span className={`w-7 text-center font-bold ${
                              s.GD > 0 ? "text-green-400" : s.GD < 0 ? "text-red-400" : "text-gray-400"
                            }`}>
                              {s.GD > 0 ? `+${s.GD}` : s.GD}
                            </span>
                            <span className="text-[#FFD700] font-black w-6 text-center">{s.Pts}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Legend */}
                  <div className="px-4 py-2 border-t border-[#1E3A5F]/50 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <span className="text-[10px] text-gray-500">
                      {lc(locale, "前2名直接晋级32强", "Top 2 advance to Round of 32")}
                    </span>
                  </div>
                </div>

                {/* Group matches */}
                <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#1E3A5F]">
                    <h2 className="text-sm font-black text-white">
                      {zh ? `${activeGroup}组比赛` : locale === "es" ? `Partidos Grupo ${activeGroup}` : `Group ${activeGroup} Matches`}
                    </h2>
                  </div>
                  <div className="divide-y divide-[#1E3A5F]/50">
                    {selectedGroup.matches.map((m) => {
                      const hfc = getFlagCode(m.home_team);
                      const afc = getFlagCode(m.away_team);
                      const finished = m.status === "finished";
                      return (
                        <Link
                          key={m.id}
                          href={`/${locale}/matches/${m.id}`}
                          className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#1E3A5F]/30 transition-colors"
                        >
                          {/* Date */}
                          <span className="text-[10px] text-gray-500 w-20 shrink-0">
                            {fmtDate(m.kickoff_time, locale)}
                          </span>
                          {/* Home */}
                          <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                            <span className="text-xs font-bold text-white truncate text-right">{getTeamDisplayName(m.home_team, locale)}</span>
                            {hfc ? (
                              <Image src={`https://flagcdn.com/w40/${hfc}.png`} alt="" width={20} height={14} className="rounded-sm shrink-0" unoptimized />
                            ) : <span className="text-sm shrink-0">🏳️</span>}
                          </div>
                          {/* Score / VS */}
                          <div className="shrink-0 w-14 text-center">
                            {finished && m.home_score !== null ? (
                              <span className="text-sm font-black text-white">
                                {m.home_score} – {m.away_score}
                              </span>
                            ) : m.status === "live" ? (
                              <span className="text-sm font-black text-red-400">
                                {m.home_score ?? 0} – {m.away_score ?? 0}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-600 font-bold">VS</span>
                            )}
                          </div>
                          {/* Away */}
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            {afc ? (
                              <Image src={`https://flagcdn.com/w40/${afc}.png`} alt="" width={20} height={14} className="rounded-sm shrink-0" unoptimized />
                            ) : <span className="text-sm shrink-0">🏳️</span>}
                            <span className="text-xs font-bold text-white truncate">{getTeamDisplayName(m.away_team, locale)}</span>
                          </div>
                          {/* Status */}
                          <StatusPill status={m.status} zh={zh} locale={locale} />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Knockout Stages ── */}
        {activeTab !== "group" && (
          <div className="space-y-3">
            {(knockoutMatches[activeTab] ?? []).length === 0 ? (
              <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-8 text-center">
                <p className="text-gray-500 text-sm">
                  {lc(locale, "对阵尚未确定", "Fixtures not yet determined")}
                </p>
              </div>
            ) : (
              (knockoutMatches[activeTab] ?? []).map((m) => {
                const hfc = getFlagCode(m.home_team);
                const afc = getFlagCode(m.away_team);
                const finished = m.status === "finished";
                return (
                  <Link
                    key={m.id}
                    href={`/${locale}/matches/${m.id}`}
                    className="flex items-center gap-3 bg-[#0F2040] border border-[#1E3A5F] rounded-xl px-4 py-4 hover:border-[#FFD700]/30 transition-colors"
                  >
                    {/* Date */}
                    <span className="text-[10px] text-gray-500 w-20 shrink-0">
                      {fmtDate(m.kickoff_time, locale)}
                    </span>
                    {/* Home */}
                    <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                      <span className="text-sm font-black text-white truncate text-right">{getTeamDisplayName(m.home_team, locale)}</span>
                      {hfc ? (
                        <Image src={`https://flagcdn.com/w40/${hfc}.png`} alt="" width={28} height={19} className="rounded-sm shrink-0" unoptimized />
                      ) : <span className="text-xl shrink-0">🏳️</span>}
                    </div>
                    {/* Score */}
                    <div className="shrink-0 w-16 text-center">
                      {finished && m.home_score !== null ? (
                        <span className="text-lg font-black text-white">
                          {m.home_score} – {m.away_score}
                        </span>
                      ) : m.status === "live" ? (
                        <span className="text-lg font-black text-red-400">
                          {m.home_score ?? 0} – {m.away_score ?? 0}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500 font-bold">VS</span>
                      )}
                    </div>
                    {/* Away */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {afc ? (
                        <Image src={`https://flagcdn.com/w40/${afc}.png`} alt="" width={28} height={19} className="rounded-sm shrink-0" unoptimized />
                      ) : <span className="text-xl shrink-0">🏳️</span>}
                      <span className="text-sm font-black text-white truncate">{getTeamDisplayName(m.away_team, locale)}</span>
                    </div>
                    {/* Status */}
                    <StatusPill status={m.status} zh={zh} locale={locale} />
                  </Link>
                );
              })
            )}
          </div>
        )}

      </div>
    </div>
  );
}
