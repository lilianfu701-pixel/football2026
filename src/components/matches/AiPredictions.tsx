/**
 * AiPredictions — AI model score predictions panel.
 *
 * Layout (4 columns):
 *   [model name]  [home score]  [away score]  [success rate]
 *
 * The header merges team names + section title into one row.
 * No separator column. Always renders (shows "–" until admin fills data).
 *
 * DB prerequisite:
 *   ALTER TABLE matches ADD COLUMN IF NOT EXISTS ai_predictions JSONB;
 */

import { AI_MODELS, type AiPredictions, type AiPrediction } from "@/lib/aiModels";
import { getTeamDisplayName } from "@/lib/flags";
import { lc } from "@/i18n/content";

export interface AiSuccessRates {
  [modelKey: string]: { correct: number; total: number } | undefined;
}

interface Props {
  predictions:  AiPredictions | null;
  successRates: AiSuccessRates;
  homeTeam:     string;
  awayTeam:     string;
  locale:       string;
}

export default function AiPredictions({
  predictions, successRates, homeTeam, awayTeam, locale,
}: Props) {
  const zh       = locale === "zh";
  const homeName = getTeamDisplayName(homeTeam, locale);
  const awayName = getTeamDisplayName(awayTeam, locale);

  // grid: [model 11rem] [home score flex-1] [away score 1.3fr] [rate 1.5rem]
  const grid = "grid grid-cols-[11rem_1fr_1.3fr_3rem] items-center";

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden mb-4">

      {/* ── Header row: title + team names + "成功率" label ─────────────────── */}
      <div className={`${grid} px-4 py-2 border-b border-[#1E3A5F]`}>
        {/* Section title */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🤖</span>
          <span className="text-sm font-bold text-white whitespace-nowrap">
            {lc(locale, "AI 预测", "AI Picks")}
          </span>
        </div>

        {/* Home team name */}
        <span className="text-xs font-bold text-[#FFD700] text-center truncate px-1">
          {homeName}
        </span>

        {/* Away team name */}
        <span className="text-xs font-bold text-purple-400 text-center truncate px-1">
          {awayName}
        </span>

        {/* Success rate label */}
        <span className="text-xs font-bold text-gray-500 text-center">
          {lc(locale, "准确率", "Acc.")}
        </span>
      </div>

      {/* ── Data rows ────────────────────────────────────────────────────────── */}
      <div className="divide-y divide-[#1E3A5F]/30">
        {AI_MODELS.map((model) => {
          const p      = predictions?.[model.key] as AiPrediction | undefined;
          const filled = p != null;
          const homeWon = filled && p.home > p.away;
          const awayWon = filled && p.away > p.home;
          const isDraw  = filled && p.home === p.away;

          const sr    = successRates[model.key];
          const rateStr = sr && sr.total > 0
            ? `${Math.round((sr.correct / sr.total) * 100)}%`
            : "–";
          const rateColor = sr && sr.total > 0
            ? (sr.correct / sr.total) >= 0.6
              ? "text-green-400"
              : (sr.correct / sr.total) >= 0.4
              ? "text-[#FFD700]"
              : "text-red-400"
            : "text-gray-600";

          return (
            <div key={model.key} className={`${grid} px-4 py-2`}>

              {/* Model name + logo */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-5 h-5 rounded flex items-center justify-center text-xs shrink-0"
                  style={{ background: model.bg, border: `1px solid ${model.color}30` }}
                >
                  {model.logo}
                </span>
                <span
                  className="text-xs font-black truncate"
                  style={{ color: model.color }}
                >
                  {model.name}
                </span>
              </div>

              {/* Home score */}
              <div className="flex justify-center">
                {filled ? (
                  <span
                    className={`text-base font-black tabular-nums ${
                      homeWon || isDraw ? "" : "text-gray-500"
                    }`}
                    style={(homeWon || isDraw) ? { color: model.color } : undefined}
                  >
                    {p.home}
                  </span>
                ) : (
                  <span className="text-base font-black text-gray-700">–</span>
                )}
              </div>

              {/* Away score */}
              <div className="flex justify-center">
                {filled ? (
                  <span
                    className={`text-base font-black tabular-nums ${
                      awayWon || isDraw ? "" : "text-gray-500"
                    }`}
                    style={(awayWon || isDraw) ? { color: model.color } : undefined}
                  >
                    {p.away}
                  </span>
                ) : (
                  <span className="text-base font-black text-gray-700">–</span>
                )}
              </div>

              {/* Success rate */}
              <div className="flex justify-center">
                <span className={`text-xs font-black tabular-nums ${rateColor}`}>
                  {rateStr}
                </span>
              </div>

            </div>
          );
        })}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <div className="px-4 py-2 border-t border-[#1E3A5F]/50">
        <p className="text-[10px] text-gray-600 text-center">
          {lc(locale, "准确率 = 预测比分与实际比分完全一致的比例", "Accuracy = exact score predictions matched over finished matches")}
        </p>
      </div>
    </div>
  );
}
