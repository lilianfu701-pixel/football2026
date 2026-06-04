import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getFlagUrl, getTeamDisplayName } from "@/lib/flags";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

interface PlayerRow {
  id:            number;
  name:          string;
  name_zh:       string | null;
  team:          string;
  country_code:  string | null;
  position:      string | null;
  shirt_number:  number | null;
  club:          string | null;
  age:           number | null;
  date_of_birth: string | null;
  height_cm:     number | null;
  market_value:  string | null;
  photo_url:     string | null;
  bio_en:        string | null;
  bio_zh:        string | null;
  golden_boot:   boolean;
  golden_ball:   boolean;
  golden_glove:  boolean;
  best_young:    boolean;
}

const POS_META: Record<string, { en: string; zh: string; color: string; emoji: string }> = {
  GK: { en: "Goalkeeper",  zh: "门将", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30", emoji: "🧤" },
  DF: { en: "Defender",    zh: "后卫", color: "text-blue-400 bg-blue-400/10 border-blue-400/30",       emoji: "🛡️" },
  MF: { en: "Midfielder",  zh: "中场", color: "text-green-400 bg-green-400/10 border-green-400/30",    emoji: "⚡" },
  FW: { en: "Forward",     zh: "前锋", color: "text-red-400 bg-red-400/10 border-red-400/30",          emoji: "🥅" },
};

const AWARD_META = [
  { key: "golden_boot",  icon: "🥾", en: "Golden Boot",       zh: "金靴奖" },
  { key: "golden_ball",  icon: "🏆", en: "Golden Ball",       zh: "金球奖" },
  { key: "golden_glove", icon: "🧤", en: "Golden Glove",      zh: "金手套奖" },
  { key: "best_young",   icon: "🌟", en: "Best Young Player", zh: "最佳年轻球员" },
] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const supabase = await createClient();
  const { data: p } = await supabase.from("players").select("name, name_zh, team, position").eq("id", id).single();
  if (!p) return { title: "Player | Football2026" };
  const zh   = locale === "zh";
  const name = zh && p.name_zh ? p.name_zh : p.name;
  const team = getTeamDisplayName(p.team as string, locale);
  return {
    title: `${name} · ${team} | Football2026`,
    description: zh
      ? `${name} 2026 FIFA 世界杯球员资料 — ${team}`
      : `${p.name} — ${team} at the 2026 FIFA World Cup`,
  };
}

export default async function PlayerPage({ params }: Props) {
  const { locale, id } = await params;
  const zh = locale === "zh";
  const supabase = await createClient();

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .single();

  if (!player) notFound();

  const p          = player as PlayerRow;
  const posMeta    = POS_META[p.position ?? ""] ?? null;
  const displayName = zh && p.name_zh ? p.name_zh : p.name;
  const teamDisplay = getTeamDisplayName(p.team, locale);
  const flagUrl     = getFlagUrl(p.team, 120);

  // Compute age from DOB if age not stored
  const age = p.age ?? (
    p.date_of_birth
      ? Math.floor((new Date("2026-06-11").getTime() - new Date(p.date_of_birth).getTime()) / (365.25 * 86400000))
      : null
  );

  const awards = AWARD_META.filter((a) => p[a.key]);

  // Fetch teammates (same team, same position group, excluding self)
  const { data: teammates } = await supabase
    .from("players")
    .select("id, name, name_zh, position, shirt_number, photo_url, age, club")
    .eq("team", p.team)
    .neq("id", p.id)
    .order("position")
    .order("name")
    .limit(12);

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20 pt-8">
      <div className="max-w-2xl mx-auto space-y-6 px-1">

        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 flex items-center gap-1 flex-wrap">
          <Link href={`/${locale}/players`} className="hover:text-[#FFD700]">
            {zh ? "球员" : "Players"}
          </Link>
          <span>/</span>
          <Link href={`/${locale}/teams/${encodeURIComponent(p.team)}`} className="hover:text-[#FFD700]">
            {teamDisplay}
          </Link>
          <span>/</span>
          <span className="text-gray-400">{displayName}</span>
        </nav>

        {/* ── Player hero card ── */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
          {/* Top bar gradient */}
          <div className="h-1.5 bg-gradient-to-r from-[#FFD700]/60 via-[#FFD700] to-[#FFD700]/60" />

          <div className="p-6">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="shrink-0">
                {p.photo_url ? (
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#1E3A5F] relative">
                    <Image src={p.photo_url} alt={p.name} fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-black border-2 border-[#1E3A5F] bg-gradient-to-br ${
                    p.position === "GK" ? "from-yellow-700 to-yellow-900" :
                    p.position === "DF" ? "from-blue-700 to-blue-900" :
                    p.position === "MF" ? "from-green-700 to-green-900" :
                    "from-red-700 to-red-900"
                  }`}>
                    {p.shirt_number != null ? (
                      <span className="text-white">{p.shirt_number}</span>
                    ) : (
                      <span>{posMeta?.emoji ?? "⚽"}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Names + meta */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-black text-white leading-tight">{displayName}</h1>
                {zh && p.name_zh && p.name !== p.name_zh && (
                  <p className="text-sm text-gray-400 mt-0.5">{p.name}</p>
                )}

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {posMeta && (
                    <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${posMeta.color}`}>
                      {zh ? posMeta.zh : posMeta.en}
                    </span>
                  )}
                  {p.shirt_number != null && (
                    <span className="text-xs font-bold text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/30 px-2.5 py-1 rounded-full">
                      #{p.shirt_number}
                    </span>
                  )}
                </div>

                {/* Team */}
                <Link href={`/${locale}/teams/${encodeURIComponent(p.team)}`}
                  className="flex items-center gap-2 mt-3 group w-fit">
                  {flagUrl && (
                    <div className="w-8 h-5 relative overflow-hidden rounded-sm">
                      <Image src={flagUrl} alt={p.team} fill className="object-cover" unoptimized />
                    </div>
                  )}
                  <span className="text-sm font-bold text-gray-300 group-hover:text-[#FFD700] transition-colors">
                    {teamDisplay}
                  </span>
                </Link>
              </div>
            </div>

            {/* Award badges */}
            {awards.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#1E3A5F]">
                {awards.map((a) => (
                  <span key={a.key}
                    className="text-xs font-bold text-[#FFD700] bg-[#FFD700]/8 border border-[#FFD700]/25 px-3 py-1.5 rounded-full">
                    {a.icon} {zh ? a.zh : a.en}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#1E3A5F]">
            <h2 className="font-black text-sm">{zh ? "📋 球员资料" : "📋 Player Info"}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-[#1E3A5F]/30">
            {[
              {
                label:  zh ? "年龄" : "Age",
                value:  age != null ? `${age}` : "—",
                sub:    p.date_of_birth
                  ? new Date(p.date_of_birth).toLocaleDateString(zh ? "zh-CN" : "en-US", { year: "numeric", month: "short", day: "numeric" })
                  : undefined,
              },
              {
                label: zh ? "位置" : "Position",
                value: posMeta ? (zh ? posMeta.zh : posMeta.en) : "—",
              },
              {
                label: zh ? "俱乐部" : "Club",
                value: p.club ?? "—",
              },
              {
                label: zh ? "身高" : "Height",
                value: p.height_cm ? `${p.height_cm} cm` : "—",
              },
              {
                label: zh ? "身价" : "Market Value",
                value: p.market_value ?? "—",
              },
              {
                label: zh ? "号码" : "Shirt",
                value: p.shirt_number != null ? `#${p.shirt_number}` : "—",
              },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-[#0F2040] px-4 py-3.5">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-black text-white mt-1">{value}</p>
                {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* ── Bio ── */}
        {(zh ? p.bio_zh : p.bio_en) && (
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
            <h2 className="font-black text-sm mb-3">📖 {zh ? "球员简介" : "About"}</h2>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
              {zh ? p.bio_zh : p.bio_en}
            </p>
          </div>
        )}

        {/* ── Teammates ── */}
        {(teammates ?? []).length > 0 && (
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#1E3A5F] flex items-center justify-between">
              <h2 className="font-black text-sm">
                👥 {zh ? `${teamDisplay} 阵容` : `${teamDisplay} Squad`}
              </h2>
              <Link href={`/${locale}/teams/${encodeURIComponent(p.team)}`}
                className="text-[10px] text-gray-500 hover:text-[#FFD700]">
                {zh ? "球队详情" : "Team page"} →
              </Link>
            </div>
            <div className="divide-y divide-[#1E3A5F]/30">
              {(teammates ?? []).map((tm) => {
                const tmPos  = POS_META[tm.position ?? ""] ?? null;
                const tmName = zh && tm.name_zh ? tm.name_zh : tm.name;
                return (
                  <Link key={tm.id} href={`/${locale}/players/${tm.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-white/2 transition-colors">
                    {/* Mini avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border border-[#1E3A5F] shrink-0 bg-gradient-to-br ${
                      tm.position === "GK" ? "from-yellow-700 to-yellow-900" :
                      tm.position === "DF" ? "from-blue-700 to-blue-900" :
                      tm.position === "MF" ? "from-green-700 to-green-900" :
                      "from-red-700 to-red-900"
                    }`}>
                      {tm.shirt_number ?? (tm.name[0] ?? "?")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{tmName}</p>
                      <p className="text-[10px] text-gray-500 truncate">
                        {tmPos ? (zh ? tmPos.zh : tmPos.en) : ""}
                        {tm.club ? ` · ${tm.club}` : ""}
                      </p>
                    </div>
                    {tm.age && (
                      <span className="text-xs text-gray-600 shrink-0">{tm.age}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
