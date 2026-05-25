import Link from "next/link";
import Image from "next/image";
import { AWARD_META, PLAYERS, dbToAwardKey, type AwardKey } from "@/data/players";
import { formatGc } from "@/lib/levels";
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
          <p className="text-sm font-black text-white">🏅 {zh ? "大奖竞猜" : "Award Bets"}</p>
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

      <div className="px-5 py-3 space-y-2.5">
        {awards.map((key) => {
          const meta   = AWARD_META[key];
          const myBets = bets.filter((b) => dbToAwardKey(b.award_type) === key);
          // Show top pick (highest gc_amount)
          const top    = myBets.sort((a, b) => b.gc_amount - a.gc_amount)[0];
          const player = top ? PLAYERS.find((p) => p.id === top.player_id) : null;

          return (
            <div key={key} className="flex items-center gap-2.5">
              {/* Award icon */}
              <span className="text-base w-5 text-center shrink-0">{meta.icon}</span>

              {/* Award name */}
              <span className="text-xs text-gray-500 w-16 shrink-0 truncate">
                {zh ? meta.nameZh : meta.name.split(" ")[1] ?? meta.name}
              </span>

              {/* Pick or empty */}
              {top && player ? (
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <div className="w-4 h-3 relative overflow-hidden rounded-sm shrink-0">
                    <Image
                      src={`https://flagcdn.com/w40/${player.countryCode}.png`}
                      alt={player.country} fill className="object-cover" unoptimized
                    />
                  </div>
                  <span className="text-xs text-gray-200 font-semibold truncate flex-1">
                    {zh ? top.player_name_zh : top.player_name}
                  </span>
                  <span className="text-[10px] text-[#FFD700] font-bold shrink-0">
                    {formatGc(top.gc_amount)}
                  </span>
                  {myBets.length > 1 && (
                    <span className="text-[9px] text-gray-600 shrink-0">+{myBets.length - 1}</span>
                  )}
                </div>
              ) : (
                <Link
                  href={`/${locale}/awards`}
                  className="flex-1 text-xs text-gray-600 hover:text-[#7C6FE0] transition-colors italic"
                >
                  {phase === "closed"
                    ? (zh ? "已截止" : "Closed")
                    : (zh ? "未竞猜" : "No pick yet")}
                </Link>
              )}
            </div>
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
            ? `${meta_icon(bets)} ${zh ? "前往押注大奖" : "Place Award Bets"}`
            : (zh ? "查看大奖竞猜" : "View Award Bets")}
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
