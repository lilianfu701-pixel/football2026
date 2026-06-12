"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Scorer {
  id:             number;
  player_name:    string;
  player_name_zh: string | null;
  team:           string;
  photo_url:      string | null;
  goals:          number;
  assists:        number;
  matches_played: number;
  sort_order:     number;
  is_visible:     boolean;
  updated_at:     string;
}

interface Props { scorer: Scorer; zh: boolean }

export default function ScorerAdminForm({ scorer, zh }: Props) {
  const router = useRouter();
  const [goals,   setGoals]   = useState(String(scorer.goals));
  const [assists, setAssists] = useState(String(scorer.assists));
  const [apps,    setApps]    = useState(String(scorer.matches_played));
  const [visible, setVisible] = useState(scorer.is_visible);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");

  async function save() {
    setSaving(true); setSaved(false); setError("");
    const res = await fetch(`/api/admin/scorer/${scorer.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        goals:          parseInt(goals,   10) || 0,
        assists:        parseInt(assists, 10) || 0,
        matches_played: parseInt(apps,    10) || 0,
        is_visible:     visible,
      }),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); router.refresh(); }
    else { const d = await res.json(); setError(d.error ?? "Error"); }
  }

  const updatedAt = scorer.updated_at
    ? new Date(scorer.updated_at).toLocaleString(zh ? "zh-CN" : "en-US", { timeZone: "UTC" })
    : "—";

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-4">
        {scorer.photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={scorer.photo_url} alt={scorer.player_name}
            className="w-12 h-12 rounded-full object-cover border border-[#1E3A5F]" />
        )}
        <div>
          <p className="font-black text-white text-sm">{scorer.player_name}</p>
          {scorer.player_name_zh && (
            <p className="text-xs text-gray-500">{scorer.player_name_zh}</p>
          )}
          <p className="text-xs text-[#FFD700]/70">{scorer.team}</p>
        </div>
        <div className="ml-auto text-[10px] text-gray-600">
          {zh ? "更新于" : "Updated"} {updatedAt}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Goals */}
        <label className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-500 uppercase tracking-wide">
            {zh ? "进球" : "Goals"}
          </span>
          <input type="number" min={0} value={goals}
            onChange={(e) => setGoals(e.target.value)}
            className="w-16 text-center bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-2 py-1.5 text-sm font-black text-[#FFD700] outline-none focus:border-[#FFD700]/50" />
        </label>

        {/* Assists */}
        <label className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-500 uppercase tracking-wide">
            {zh ? "助攻" : "Assists"}
          </span>
          <input type="number" min={0} value={assists}
            onChange={(e) => setAssists(e.target.value)}
            className="w-16 text-center bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-2 py-1.5 text-sm font-black text-white outline-none focus:border-[#FFD700]/50" />
        </label>

        {/* Apps */}
        <label className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-500 uppercase tracking-wide">
            {zh ? "出场" : "Apps"}
          </span>
          <input type="number" min={0} value={apps}
            onChange={(e) => setApps(e.target.value)}
            className="w-16 text-center bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-2 py-1.5 text-sm font-black text-white outline-none focus:border-[#FFD700]/50" />
        </label>

        {/* Visible toggle */}
        <label className="flex items-center gap-2 cursor-pointer ml-1">
          <span className="text-[11px] text-gray-500 uppercase tracking-wide">
            {zh ? "显示" : "Visible"}
          </span>
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className={`relative w-9 h-5 rounded-full transition-colors ${visible ? "bg-green-500" : "bg-gray-700"}`}
          >
            <span
              style={{ left: visible ? "18px" : "2px" }}
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
            />
          </button>
        </label>

        {/* Save button */}
        <button
          onClick={save}
          disabled={saving}
          className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all disabled:opacity-50 ${
            saved
              ? "bg-green-500/20 border border-green-500/40 text-green-400"
              : "bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] hover:bg-[#FFD700]/20"
          }`}
        >
          {saving ? "…" : saved ? (zh ? "已保存 ✓" : "Saved ✓") : (zh ? "保存" : "Save")}
        </button>

        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
