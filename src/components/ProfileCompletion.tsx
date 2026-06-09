"use client";

import Link from "next/link";
import { PROFILE_REWARDS, ALL_COMPLETE_BONUS, MAX_TOTAL_REWARD } from "@/lib/profileRewards";
import { lc } from "@/i18n/content";

interface Props {
  /** Which fields are currently filled (key → true). */
  filledFields:   Record<string, boolean>;
  /** Which fields have already been rewarded (key → true). */
  rewardedFields: Record<string, boolean>;
  locale:         string;
  zh:             boolean;
}

export default function ProfileCompletion({ filledFields, rewardedFields, locale, zh }: Props) {
  const filledCount = PROFILE_REWARDS.filter((f) => filledFields[f.key]).length;
  const total       = PROFILE_REWARDS.length;
  const pct         = Math.round((filledCount / total) * 100);
  const allDone     = filledCount === total;

  // GC already earned
  let earned = 0;
  for (const f of PROFILE_REWARDS) {
    if (rewardedFields[f.key]) earned += f.gc;
  }
  if (rewardedFields["__all_complete"]) earned += ALL_COMPLETE_BONUS;

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-white font-bold text-base">
            {lc(locale, "资料完善度", "Profile Completion")}
          </h3>
          <p className="text-gray-500 text-[11px] mt-0.5">
            {lc(locale,
              `完善资料可获得最多 ${MAX_TOTAL_REWARD.toLocaleString()} GC`,
              `Complete your profile to earn up to ${MAX_TOTAL_REWARD.toLocaleString()} GC`)}
          </p>
        </div>
        <Link
          href={`/${locale}/profile/settings`}
          className="shrink-0 text-xs font-bold text-[#FFD700] hover:underline"
        >
          {lc(locale, "去完善 →", "Edit →")}
        </Link>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-[#0A1628] rounded-full overflow-hidden mb-1.5">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: allDone
              ? "linear-gradient(90deg, #FFD700, #FFA500)"
              : "linear-gradient(90deg, #4F46E5, #7C6FE0)",
          }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] mb-4">
        <span className={allDone ? "text-[#FFD700] font-bold" : "text-gray-500"}>
          {filledCount}/{total} {lc(locale, "项", "fields")} · {pct}%
        </span>
        <span className="text-gray-600">
          {lc(locale, "已获", "Earned")}: <span className="text-[#FFD700] font-bold">{earned.toLocaleString()} GC</span>
        </span>
      </div>

      {/* Field list */}
      <div className="grid grid-cols-1 gap-1.5">
        {PROFILE_REWARDS.map((field) => {
          const filled   = filledFields[field.key];
          const rewarded = rewardedFields[field.key];
          return (
            <div
              key={field.key}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                filled
                  ? "bg-green-500/10 border border-green-500/20"
                  : "bg-[#0A1628] border border-[#1E3A5F]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={filled ? "text-green-400" : "text-gray-600"}>
                  {filled ? "✅" : "⬜"}
                </span>
                <span className={filled ? "text-green-300 font-semibold" : "text-gray-400"}>
                  {lc(locale, field.labelZh, field.labelEn)}
                </span>
              </div>
              <span className={`font-bold ${rewarded ? "text-green-400" : filled ? "text-[#FFD700]" : "text-gray-600"}`}>
                {rewarded ? (lc(locale, "已领", "Claimed")) : `+${field.gc} GC`}
              </span>
            </div>
          );
        })}

        {/* All-complete bonus */}
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
            allDone
              ? "bg-[#FFD700]/10 border border-[#FFD700]/30"
              : "bg-[#0A1628] border border-[#1E3A5F]"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={allDone ? "text-[#FFD700]" : "text-gray-600"}>
              {allDone ? "🎉" : "🏆"}
            </span>
            <span className={allDone ? "text-[#FFD700] font-bold" : "text-gray-500"}>
              {lc(locale, "全部完成奖励", "All Complete Bonus")}
            </span>
          </div>
          <span className={`font-bold ${
            rewardedFields["__all_complete"]
              ? "text-green-400"
              : allDone
                ? "text-[#FFD700]"
                : "text-gray-600"
          }`}>
            {rewardedFields["__all_complete"]
              ? (lc(locale, "已领", "Claimed"))
              : `+${ALL_COMPLETE_BONUS.toLocaleString()} GC`}
          </span>
        </div>
      </div>
    </div>
  );
}
