"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AI_MODELS, type AiPredictions, type AiModelKey } from "@/lib/aiModels";

interface Props {
  matchId:     number;
  homeTeam:    string;
  awayTeam:    string;
  initial:     AiPredictions | null;
  zh:          boolean;
}

type ScoreState = { home: string; away: string };

function emptyScores(): Record<AiModelKey, ScoreState> {
  return Object.fromEntries(
    AI_MODELS.map((m) => [m.key, { home: "", away: "" }])
  ) as Record<AiModelKey, ScoreState>;
}

export default function AiPredictForm({ matchId, homeTeam, awayTeam, initial, zh }: Props) {
  const router = useRouter();
  const [open,   setOpen]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  // Initialise from existing data
  const [scores, setScores] = useState<Record<AiModelKey, ScoreState>>(() => {
    const base = emptyScores();
    if (initial) {
      for (const m of AI_MODELS) {
        const p = initial[m.key];
        if (p) base[m.key] = { home: String(p.home), away: String(p.away) };
      }
    }
    return base;
  });

  function setScore(key: AiModelKey, side: "home" | "away", val: string) {
    setScores((prev) => ({ ...prev, [key]: { ...prev[key], [side]: val } }));
  }

  async function save() {
    setSaving(true);
    setSaved(false);

    // Build only filled predictions
    const predictions: AiPredictions = {};
    for (const m of AI_MODELS) {
      const h = parseInt(scores[m.key].home, 10);
      const a = parseInt(scores[m.key].away, 10);
      if (!isNaN(h) && !isNaN(a)) {
        predictions[m.key] = { home: h, away: a };
      }
    }

    await fetch(`/api/admin/match/${matchId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ai_predictions: predictions }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    router.refresh();
  }

  // Count how many models have scores filled
  const filledCount = AI_MODELS.filter(
    (m) => scores[m.key].home !== "" && scores[m.key].away !== ""
  ).length;

  const inp =
    "w-10 text-center bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-1.5 py-1 text-sm font-bold text-white outline-none focus:border-[#FFD700]/50";

  return (
    <div className="mt-2 border-t border-[#1E3A5F]/60 pt-2">
      {/* Toggle row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-[11px] text-gray-500 hover:text-[#FFD700] transition-colors"
      >
        <span>{open ? "▼" : "▶"}</span>
        <span className="font-bold">
          🤖 {zh ? "AI 预测" : "AI Predictions"}
          {filledCount > 0 && (
            <span className="ml-1 text-[#10A37F]">({filledCount}/{AI_MODELS.length})</span>
          )}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {/* Column headers */}
          <div className="grid grid-cols-[4.5rem_auto] gap-2 items-center px-1">
            <span className="text-[9px] text-gray-600 uppercase tracking-widest">
              {zh ? "模型" : "Model"}
            </span>
            <div className="flex items-center gap-1 text-[9px] text-gray-600 uppercase tracking-widest">
              <span className="w-10 text-center truncate">{homeTeam.slice(0, 6)}</span>
              <span className="w-3 text-center">:</span>
              <span className="w-10 text-center truncate">{awayTeam.slice(0, 6)}</span>
            </div>
          </div>

          {/* Per-model score row */}
          {AI_MODELS.map((model) => (
            <div key={model.key} className="grid grid-cols-[4.5rem_auto] gap-2 items-center">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-5 h-5 rounded flex items-center justify-center text-xs shrink-0"
                  style={{ background: model.bg, border: `1px solid ${model.color}30` }}
                >
                  {model.logo}
                </span>
                <span className="text-[11px] font-black" style={{ color: model.color }}>
                  {model.name}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <input
                  type="number" min={0} max={20}
                  value={scores[model.key].home}
                  onChange={(e) => setScore(model.key, "home", e.target.value)}
                  placeholder="–"
                  className={inp}
                />
                <span className="text-gray-600 font-bold text-xs w-3 text-center">:</span>
                <input
                  type="number" min={0} max={20}
                  value={scores[model.key].away}
                  onChange={(e) => setScore(model.key, "away", e.target.value)}
                  placeholder="–"
                  className={inp}
                />
              </div>
            </div>
          ))}

          {/* Save */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={save}
              disabled={saving}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all disabled:opacity-50 ${
                saved
                  ? "bg-green-500/20 border border-green-500/40 text-green-400"
                  : "bg-[#10A37F]/10 border border-[#10A37F]/30 text-[#10A37F] hover:bg-[#10A37F]/20"
              }`}
            >
              {saving ? "…" : saved ? (zh ? "✓ 已保存" : "✓ Saved") : (zh ? "保存 AI 预测" : "Save AI Predictions")}
            </button>
            {filledCount > 0 && !saved && (
              <span className="text-[10px] text-gray-600">
                {filledCount} {zh ? "个模型已填写" : "models filled"}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
