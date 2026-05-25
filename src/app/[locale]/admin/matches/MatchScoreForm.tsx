"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  matchId: number;
  initialHome: number | null;
  initialAway: number | null;
  initialStatus: string;
  zh: boolean;
}

const statusOptions = [
  { value: "scheduled", labelZh: "未开始", labelEn: "Scheduled" },
  { value: "live",      labelZh: "进行中", labelEn: "Live" },
  { value: "finished",  labelZh: "已结束", labelEn: "Finished" },
];

export default function MatchScoreForm({ matchId, initialHome, initialAway, initialStatus, zh }: Props) {
  const router = useRouter();
  const [home,   setHome]   = useState<string>(initialHome !== null ? String(initialHome) : "");
  const [away,   setAway]   = useState<string>(initialAway !== null ? String(initialAway) : "");
  const [status, setStatus] = useState(initialStatus ?? "scheduled");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    const body: Record<string, unknown> = { status };
    if (home !== "") body.home_score = parseInt(home, 10);
    if (away !== "") body.away_score = parseInt(away, 10);
    await fetch(`/api/admin/match/${matchId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Score inputs */}
      <div className="flex items-center gap-1.5">
        <input
          type="number" min={0} max={99}
          value={home}
          onChange={(e) => setHome(e.target.value)}
          placeholder="–"
          className="w-12 text-center bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-2 py-1.5 text-sm font-bold text-white outline-none focus:border-[#FFD700]/50"
        />
        <span className="text-gray-600 font-bold text-xs">:</span>
        <input
          type="number" min={0} max={99}
          value={away}
          onChange={(e) => setAway(e.target.value)}
          placeholder="–"
          className="w-12 text-center bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-2 py-1.5 text-sm font-bold text-white outline-none focus:border-[#FFD700]/50"
        />
      </div>

      {/* Status selector */}
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-2.5 py-1.5 text-xs text-gray-300 outline-none focus:border-[#FFD700]/50"
      >
        {statusOptions.map((s) => (
          <option key={s.value} value={s.value}>
            {zh ? s.labelZh : s.labelEn}
          </option>
        ))}
      </select>

      {/* Save button */}
      <button
        onClick={save}
        disabled={saving}
        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all disabled:opacity-50 ${
          saved
            ? "bg-green-500/20 border border-green-500/40 text-green-400"
            : "bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] hover:bg-[#FFD700]/20"
        }`}
      >
        {saving ? "…" : saved ? (zh ? "已保存 ✓" : "Saved ✓") : (zh ? "保存" : "Save")}
      </button>
    </div>
  );
}
