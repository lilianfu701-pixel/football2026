import Link from "next/link";
import { AWARD_META, dbToAwardKey, type AwardKey } from "@/data/players";
import type { AwardPhase } from "@/lib/awardPhase";

interface AwardBetSummary {
  award_type: string;
  player_id: number;
  player_name: string;
  player_name_zh: string;
  gc_amount: number;
  odds_multiplier: number;
}

interface Props {
  locale: string;
  bets: AwardBetSummary[];
  phase: AwardPhase;
}

export default function AwardSidebarCard({ locale, bets, phase }: Props) {
  const zh = locale === "zh";

  const phaseLabel = {
    pre:      { text: zh ? `⭐ 开赛前 20×`  : "⭐ Pre-Tournament 20×", color: "#FFD700" },
    group:    { text: zh ? `🔥 小组赛 10×`  : "🔥 Group Stage 10×",    color: "#FB923C" },
    knockout: { text: zh ? `🏆 淘汰赛 3×`   : "🏆 Knockout 3×",        color: "#34D399" },
    closed:   { text: zh ? "🔒 已截止"       : "🔒 Closed",              color: "#6B7280" },
  }[phase];

  const awards: AwardKey[] = ["goldenBoot", "goldenBall", "goldenGlove", "bestYoung"];

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-[#1E3A5F] flex items-center justify-between bg-gradient-to-r from-[#FFD700]/8 to-transparent">
        <div>
          <p className="text-sm font-black text-white">🏅 {zh ? "大奖预测" : "Award Bets"}</p>
          <p className="text-[10px] font-semibold mt-0.5" style={{ color: phaseLabel.color }}>
            {phaseLabel.text}
          </p>
        </div>
        <Link
          href={`/${locale}/awards`}
          className="text-xs text-[#7C6FE0] hover:text-white font-semibold transition-colors whitespace-nowrap"
        >
          {zh ? "全部 →" : "View →"}
        </Link>
      </div>

      <div className="px-4 py-3 space-y-1">
        {awards.map((key) => {
          const meta  = AWARD_META[key];
          const count = bets.filter((b) => dbToAwardKey(b.award_type) === key).length;

          return (
            <Link
              key={key}
              href={`/${locale}/predict#awards`}
              className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-[#1E3A5F]/60 transition-colors group"
            >
              <span className="text-base w-5 text-center shrink-0">{meta.icon}</span>
              <span className="text-xs text-gray-400 flex-1 group-hover:text-white transition-colors">
                {zh ? meta.nameZh : meta.name.split(" ")[1] ?? meta.name}
              </span>
              {count > 0 ? (
                <span className="text-sm font-black text-[#FFD700]">{count}</span>
              ) : (
                <span className="text-xs text-gray-600">—</span>
              )}
              <svg className="w-3 h-3 text-gray-600 group-hover:text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          );
        })}
      </div>

      {/* CTA */}
      <div className="px-5 pb-4 pt-1">
        <Link
          href={`/${locale}/awards`}
          className={`block w-full text-center font-black py-2.5 rounded-xl text-xs transition-all ${
            phase !== "closed"
              ? "bg-[#FFD700] text-[#0A1628] hover:bg-[#FFC200]"
              : "bg-[#1E3A5F] text-gray-500 border border-[#1E3A5F] cursor-default"
          }`}
        >
          {phase !== "closed"
            ? `${meta_icon(bets)} ${zh ? "前往大奖预测" : "Place Award Bets"}`
            : (zh ? "查看大奖预测" : "View Award Bets")}
        </Link>
      </div>
    </div>
  );
}

// Helper: pick a relevant emoji for the CTA
function meta_icon(bets: AwardBetSummary[]) {
  const total = bets.length;
  if (total === 0) return "🏅";
  if (total < 4)   return "🎯";
  return "✅";
}
