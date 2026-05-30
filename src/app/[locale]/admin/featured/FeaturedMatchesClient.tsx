"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getTeamDisplayName } from "@/lib/flags";

interface MatchRow {
  id: number;
  match_code: string | null;
  home_team: string;
  away_team: string;
  kickoff_time: string;
  stage: string;
  group_name: string | null;
  status: string;
  is_featured: boolean;
}

interface Props {
  locale: string;
  allMatches: MatchRow[];
  featuredMatches: MatchRow[];
}

const STAGE_LABELS: Record<string, string> = {
  group: "小组赛", round32: "32强", round16: "16强",
  quarter: "四分之一决赛", semi: "半决赛", third: "季军赛", final: "决赛",
};

export default function FeaturedMatchesClient({ locale, allMatches, featuredMatches }: Props) {
  const zh = locale === "zh";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const featuredIds = new Set(featuredMatches.map((m) => m.id));

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleString(zh ? "zh-CN" : "en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC",
    });
  }

  async function toggle(match: MatchRow) {
    setError(null);
    setSuccess(null);
    const newVal = !match.is_featured;

    // Guard: can't add a 5th featured match
    if (newVal && featuredIds.size >= 4) {
      setError(zh ? "最多只能设置 4 场焦点对决" : "Maximum 4 featured matches allowed");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/admin/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id, featured: newVal }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed");
        return;
      }
      setSuccess(newVal
        ? `${match.match_code ?? match.id} ${zh ? "已设为焦点对决" : "set as featured"}`
        : `${match.match_code ?? match.id} ${zh ? "已移除" : "removed from featured"}`);
      router.refresh();
    });
  }

  async function addByCode() {
    setError(null);
    setSuccess(null);
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    const match = allMatches.find(
      (m) => m.match_code?.toUpperCase() === code
    );
    if (!match) {
      setError(zh ? `找不到赛事编码 "${code}"` : `Match code "${code}" not found`);
      return;
    }
    if (featuredIds.has(match.id)) {
      setError(zh ? "该场次已在焦点对决中" : "Match already featured");
      return;
    }
    setCodeInput("");
    await toggle({ ...match, is_featured: false });
  }

  return (
    <div className="space-y-6">

      {/* ── Add by code ── */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
        <h2 className="text-white font-bold mb-3">
          {zh ? "按赛事编码添加" : "Add by Match Code"}
        </h2>
        <p className="text-gray-500 text-xs mb-4">
          {zh
            ? "小组赛编码格式：A1、A2、B1 … L4；淘汰赛：M73、M74 …"
            : "Group stage codes: A1, A2, B1 … L4 · Knockout: M73, M74 …"}
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addByCode()}
            placeholder={zh ? "输入编码，如 A1 或 M73" : "Enter code e.g. A1 or M73"}
            className="flex-1 bg-[#0A1628] border border-[#1E3A5F] rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FFD700]/50"
          />
          <button
            onClick={addByCode}
            disabled={isPending}
            className="px-5 py-2.5 bg-[#FFD700] text-[#0A1628] font-black text-sm rounded-xl hover:bg-[#FFC200] transition-colors disabled:opacity-50"
          >
            {zh ? "添加" : "Add"}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-red-400 text-xs flex items-center gap-1">
            <span>⚠</span> {error}
          </p>
        )}
        {success && (
          <p className="mt-2 text-green-400 text-xs flex items-center gap-1">
            <span>✓</span> {success}
          </p>
        )}
      </div>

      {/* ── Current featured matches ── */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold">
            🔥 {zh ? "当前焦点对决" : "Current Featured"} ({featuredMatches.length}/4)
          </h2>
        </div>

        {featuredMatches.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-gray-600 text-sm">
              {zh ? "暂无焦点对决，请用上方输入框按编码添加" : "No featured matches. Add some using the code input above."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {featuredMatches.map((m) => (
              <div key={m.id}
                className="flex items-center justify-between gap-3 bg-[#0A1628] border border-[#FFD700]/20 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[#FFD700] font-black text-xs shrink-0 w-10">
                    {m.match_code ?? `#${m.id}`}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {getTeamDisplayName(m.home_team, locale)} vs {getTeamDisplayName(m.away_team, locale)}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {STAGE_LABELS[m.stage] ?? m.stage}
                      {m.group_name ? ` · ${zh ? "小组" : "Group"} ${m.group_name}` : ""}
                      {" · "}{fmtTime(m.kickoff_time)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggle(m)}
                  disabled={isPending}
                  className="shrink-0 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  {zh ? "移除" : "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── All matches table ── */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
        <h2 className="text-white font-bold mb-4">
          {zh ? "所有赛事" : "All Matches"}
          <span className="text-gray-500 text-xs font-normal ml-2">
            ({zh ? "点击星号快速添加/移除" : "click ★ to toggle"})
          </span>
        </h2>

        <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
          {allMatches.map((m) => {
            const isFeat = featuredIds.has(m.id);
            return (
              <div key={m.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                  isFeat ? "bg-[#FFD700]/5 border border-[#FFD700]/15" : "hover:bg-[#1E3A5F]/30"
                }`}>
                <span className="text-gray-600 text-xs w-10 shrink-0 font-mono">
                  {m.match_code ?? `#${m.id}`}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-white">
                    {getTeamDisplayName(m.home_team, locale)} vs {getTeamDisplayName(m.away_team, locale)}
                  </span>
                  <span className="text-[10px] text-gray-600 ml-2">
                    {STAGE_LABELS[m.stage] ?? m.stage}
                    {m.group_name ? ` · ${m.group_name}` : ""}
                    {" · "}{fmtTime(m.kickoff_time)}
                  </span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  m.status === "live" ? "bg-red-500/20 text-red-400" :
                  m.status === "finished" ? "bg-gray-700 text-gray-500" :
                  "bg-blue-500/10 text-blue-400"
                }`}>
                  {m.status === "live" ? "🔴" : m.status === "finished" ? "FT" : zh ? "待赛" : "soon"}
                </span>
                <button
                  onClick={() => toggle(m)}
                  disabled={isPending || (!isFeat && featuredIds.size >= 4)}
                  title={isFeat ? (zh ? "移除焦点" : "Remove featured") : (zh ? "设为焦点" : "Set featured")}
                  className={`shrink-0 text-lg transition-all disabled:opacity-30 ${
                    isFeat ? "text-[#FFD700]" : "text-gray-700 hover:text-[#FFD700]/50"
                  }`}
                >
                  {isFeat ? "★" : "☆"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
