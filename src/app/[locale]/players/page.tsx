import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getFlagUrl, getTeamDisplayName } from "@/lib/flags";
import { lc } from "@/i18n/content";

interface Props {
  params:       Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; team?: string; position?: string; page?: string }>;
}

interface PlayerRow {
  id:           number;
  name:         string;
  name_zh:      string | null;
  team:         string;
  country_code: string | null;
  position:     string | null;
  shirt_number: number | null;
  club:         string | null;
  age:          number | null;
  photo_url:    string | null;
  golden_boot:  boolean;
  golden_ball:  boolean;
  golden_glove: boolean;
  best_young:   boolean;
}

const POS_META: Record<string, { en: string; zh: string; color: string }> = {
  GK: { en: "Goalkeeper", zh: "门将", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
  DF: { en: "Defender",   zh: "后卫", color: "text-blue-400 bg-blue-400/10 border-blue-400/30" },
  MF: { en: "Midfielder", zh: "中场", color: "text-green-400 bg-green-400/10 border-green-400/30" },
  FW: { en: "Forward",    zh: "前锋", color: "text-red-400 bg-red-400/10 border-red-400/30" },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const zh = locale === "zh";
  return {
    title: lc(locale, "球员 | Football2026", "Players | Football2026"),
    description: lc(locale, "浏览 2026 FIFA 世界杯 48 支球队的全部球员资料，包含头像、位置、俱乐部和获奖预测。", "Browse all players from 48 nations at the 2026 FIFA World Cup. Stats, clubs, positions, and award contenders."),
  };
}

export default async function PlayersPage({ params, searchParams }: Props) {
  const { locale }               = await params;
  const { q = "", team = "", position = "", page: pageStr = "1" } = await searchParams;
  const zh   = locale === "zh";
  const page = Math.max(1, parseInt(pageStr, 10));
  const size = 48;
  const from = (page - 1) * size;

  const supabase = await createClient();

  let query = supabase
    .from("players")
    .select("id, name, name_zh, team, country_code, position, shirt_number, club, age, photo_url, golden_boot, golden_ball, golden_glove, best_young", { count: "exact" })
    .order("team").order("position").order("name")
    .range(from, from + size - 1);

  if (q)        query = query.or(`name.ilike.%${q}%,name_zh.ilike.%${q}%`);
  if (team)     query = query.eq("team", team);
  if (position) query = query.eq("position", position);

  const { data: players, count } = await query;

  // Teams for filter
  const { data: teamRows } = await supabase
    .from("players").select("team").order("team");
  const teams = [...new Set((teamRows ?? []).map((r) => r.team as string))];

  const totalPages = Math.ceil((count ?? 0) / size);
  const hasPlayers = (players?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20 pt-8">
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-white">
            👤 {lc(locale, "2026 世界杯球员", "WC 2026 Players")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {zh
              ? `${count ?? 0} 名球员 · 浏览 48 支球队阵容`
              : `${count ?? 0} players · Browse 48 national team squads`}
          </p>
        </div>

        {/* Filters */}
        <form method="GET" className="flex flex-wrap gap-2">
          <input name="q" defaultValue={q}
            placeholder={lc(locale, "搜索球员姓名…", "Search player name…")}
            className="flex-1 min-w-[160px] bg-[#0F2040] border border-[#1E3A5F] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[#FFD700]/40" />
          <select name="team" defaultValue={team}
            className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#FFD700]/40">
            <option value="">{lc(locale, "所有球队", "All teams")}</option>
            {teams.map((t) => (
              <option key={t} value={t}>{getTeamDisplayName(t, locale)}</option>
            ))}
          </select>
          <select name="position" defaultValue={position}
            className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#FFD700]/40">
            <option value="">{lc(locale, "所有位置", "All positions")}</option>
            {Object.entries(POS_META).map(([k, v]) => (
              <option key={k} value={k}>{k} · {zh ? v.zh : v.en}</option>
            ))}
          </select>
          <button type="submit"
            className="px-4 py-2.5 bg-[#FFD700] text-[#0A1628] font-black rounded-xl text-sm hover:bg-[#FFC200]">
            {lc(locale, "搜索", "Search")}
          </button>
        </form>

        {/* Empty state */}
        {!hasPlayers && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">⚽</p>
            <p className="text-lg font-bold text-white mb-2">
              {lc(locale, "暂无球员数据", "No players yet")}
            </p>
            <p className="text-sm text-gray-500">
              {lc(locale, "管理员请前往后台导入球员数据", "Admins: go to the admin panel to import player data")}
            </p>
          </div>
        )}

        {/* Player grid */}
        {hasPlayers && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(players ?? []).map((player) => {
              const p        = player as PlayerRow;
              const posMeta  = POS_META[p.position ?? ""] ?? null;
              const name     = zh && p.name_zh ? p.name_zh : p.name;
              const teamDisp = getTeamDisplayName(p.team, locale);
              const flagUrl  = getFlagUrl(p.team, 80);
              const awards   = [
                p.golden_boot  && "🥾",
                p.golden_ball  && "🏆",
                p.golden_glove && "🧤",
                p.best_young   && "🌟",
              ].filter(Boolean);

              return (
                <Link key={p.id} href={`/${locale}/players/${p.id}`}
                  className="flex items-center gap-3 bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-3.5 hover:border-[#FFD700]/30 transition-all group">

                  {/* Avatar */}
                  {p.photo_url ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#1E3A5F] relative shrink-0">
                      <Image src={p.photo_url} alt={p.name} fill className="object-cover" unoptimized />
                    </div>
                  ) : (
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black shrink-0 border border-[#1E3A5F] bg-gradient-to-br ${
                      p.position === "GK" ? "from-yellow-700 to-yellow-900" :
                      p.position === "DF" ? "from-blue-700 to-blue-900" :
                      p.position === "MF" ? "from-green-700 to-green-900" :
                      "from-red-700 to-red-900"
                    }`}>
                      <span className="text-white text-lg">
                        {p.shirt_number ?? (p.name[0] ?? "?")}
                      </span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-white truncate group-hover:text-[#FFD700] transition-colors">
                        {name}
                      </span>
                      {awards.map((icon, i) => (
                        <span key={i} className="text-[11px]">{icon}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {flagUrl && (
                        <div className="w-5 h-3.5 relative overflow-hidden rounded-sm shrink-0">
                          <Image src={flagUrl} alt={p.team} fill className="object-cover" unoptimized />
                        </div>
                      )}
                      <span className="text-[11px] text-gray-400 truncate">{teamDisp}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {posMeta && (
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${posMeta.color}`}>
                          {p.position}
                        </span>
                      )}
                      {p.club && (
                        <span className="text-[10px] text-gray-600 truncate">{p.club}</span>
                      )}
                    </div>
                  </div>

                  {/* Age */}
                  {p.age && (
                    <div className="shrink-0 text-right">
                      <span className="text-xs text-gray-600">{p.age}</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            {page > 1 && (
              <Link href={`?q=${q}&team=${team}&position=${position}&page=${page - 1}`}
                className="px-4 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-xl text-sm text-gray-400 hover:border-[#FFD700]/40">
                ← {lc(locale, "上一页", "Prev")}
              </Link>
            )}
            <span className="text-xs text-gray-500">
              {zh ? `第 ${page} / ${totalPages} 页` : `Page ${page} of ${totalPages}`}
            </span>
            {page < totalPages && (
              <Link href={`?q=${q}&team=${team}&position=${position}&page=${page + 1}`}
                className="px-4 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-xl text-sm text-gray-400 hover:border-[#FFD700]/40">
                {lc(locale, "下一页", "Next")} →
              </Link>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
