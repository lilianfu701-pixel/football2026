"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  matchId:      number;
  initialHome:  number | null;
  initialDraw:  number | null;
  initialAway:  number | null;
  zh:           boolean;
}

export default function OddsForm({ matchId, initialHome, initialDraw, initialAway, zh }: Props) {
  const router = useRouter();
  const [home,   setHome]   = useState(initialHome !== null ? String(initialHome) : "");
  const [draw,   setDraw]   = useState(initialDraw !== null ? String(initialDraw) : "");
  const [away,   setAway]   = useState(initialAway !== null ? String(initialAway) : "");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  async function save() {
    const h = parseFloat(home);
    const d = parseFloat(draw);
    const a = parseFloat(away);
    if ([h, d, a].some((v) => isNaN(v) || v < 1.01)) {
      setError(zh ? "赔率需 ≥ 1.01" : "Odds must be ≥ 1.01");
      return;
    }
    setError(null);
    setSaving(true);
    await fetch(`/api/admin/match/${matchId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ odds_home: h, odds_draw: d, odds_away: a }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  const inputCls =
    "w-16 text-center bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-2 py-1.5 " +
    "text-sm font-bold text-white outline-none focus:border-[#FFD700]/50";

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest shrink-0">
        {zh ? "赔率（Bet365）" : "Odds (Bet365)"}
      </span>

      {/* Home */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-[#FFD700] font-bold">{zh ? "主" : "H"}</span>
        <input
          type="number" step="0.01" min="1.01"
          value={home}
          onChange={(e) => setHome(e.target.value)}
          placeholder="2.00"
          className={inputCls}
        />
      </div>

      {/* Draw */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-blue-400 font-bold">{zh ? "平" : "D"}</span>
        <input
          type="number" step="0.01" min="1.01"
          value={draw}
          onChange={(e) => setDraw(e.target.value)}
          placeholder="3.20"
          className={inputCls}
        />
      </div>

      {/* Away */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-purple-400 font-bold">{zh ? "客" : "A"}</span>
        <input
          type="number" step="0.01" min="1.01"
          value={away}
          onChange={(e) => setAway(e.target.value)}
          placeholder="2.80"
          className={inputCls}
        />
      </div>

      <button
        onClick={save}
        disabled={saving}
        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all disabled:opacity-50 ${
          saved
            ? "bg-green-500/20 border border-green-500/40 text-green-400"
            : "bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
        }`}
      >
        {saving ? "…" : saved ? (zh ? "已保存 ✓" : "Saved ✓") : (zh ? "保存赔率" : "Save Odds")}
      </button>

      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
