import type { Metadata } from "next";
import Link from "next/link";
import { lc } from "@/i18n/content";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ locale: string }>;
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const zh = locale === "zh";
  return {
    title: lc(locale, "GC 奖励说明 | Football2026", "GC Rewards Guide | Football2026"),
    description: lc(locale, "了解如何在 Football2026 平台赚取和使用 GoalCoin (GC)。", "Learn how to earn and use GoalCoin (GC) on Football2026."),
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function RewardsPage({ params }: Props) {
  const { locale } = await params;
  const zh = locale === "zh";

  const earningMethods = zh
    ? [
        { icon: "📅", title: "每日签到", desc: "每天签到免费领取 GC，连续签到每天额外 +1%（最高 +30%）。", href: `/${locale}/profile/checkin` },
        { icon: "⚽", title: "比赛预测", desc: "参与比赛结果预测，预测正确即可获得 GC 倍率奖励。", href: `/${locale}/matches` },
        { icon: "📢", title: "邀请好友", desc: "成功邀请好友注册并完成首次预测，即可领取邀请奖励。", href: `/${locale}/invite` },
        { icon: "📝", title: "论坛发帖", desc: "在论坛发布优质内容，优秀帖子可获得管理员打赏 GC。", href: `/${locale}/forum` },
        { icon: "🏆", title: "排行榜奖励", desc: "每期排行榜结算后，前排名用户可获得额外 GC 奖励。", href: `/${locale}/leaderboard` },
        { icon: "🎖️", title: "成就里程碑", desc: "解锁成就后，系统自动发放相应的 GC 里程碑奖励。", href: `/${locale}/missions` },
      ]
    : [
        { icon: "📅", title: "Daily Check-In",    desc: "Check in each day for free GC. Consecutive days add +1% per day (up to +30%).", href: `/${locale}/profile/checkin` },
        { icon: "⚽", title: "Match Predictions", desc: "Make predictions on match outcomes. Correct calls earn GC at the stated multiplier.", href: `/${locale}/matches` },
        { icon: "📢", title: "Invite Friends",    desc: "Earn GC for each friend who registers and completes their first prediction.", href: `/${locale}/invite` },
        { icon: "📝", title: "Forum Posts",       desc: "Write quality forum posts. Admins can tip outstanding content with GC.", href: `/${locale}/forum` },
        { icon: "🏆", title: "Leaderboard",       desc: "Top-ranked users receive bonus GC each settlement cycle.", href: `/${locale}/leaderboard` },
        { icon: "🎖️", title: "Achievements",      desc: "Unlock achievement milestones to receive automatic GC rewards.", href: `/${locale}/missions` },
      ];

  const levelRows = zh
    ? [
        { icon: "🪣", name: "乞丐",  range: "余额 < 0",             daily: "10,000" },
        { icon: "🥉", name: "平民",  range: "0 – 99.9 万",          daily: "30,000" },
        { icon: "🥈", name: "精英",  range: "100 万 – 999 万",       daily: "100,000" },
        { icon: "🥇", name: "贵族",  range: "1,000 万 – 9,999 万",   daily: "500,000" },
        { icon: "💎", name: "钻石",  range: "1 亿 – 9.9 亿",         daily: "2,000,000" },
        { icon: "👑", name: "王者",  range: "10 亿+",                 daily: "10,000,000" },
      ]
    : [
        { icon: "🪣", name: "Beggar",  range: "Balance < 0",         daily: "10,000" },
        { icon: "🥉", name: "Common",  range: "0 – 999,999",         daily: "30,000" },
        { icon: "🥈", name: "Elite",   range: "1M – 9.9M",           daily: "100,000" },
        { icon: "🥇", name: "Noble",   range: "10M – 99.9M",         daily: "500,000" },
        { icon: "💎", name: "Diamond", range: "100M – 999M",         daily: "2,000,000" },
        { icon: "👑", name: "King",    range: "1B+",                  daily: "10,000,000" },
      ];

  const faqItems = zh
    ? [
        {
          q: "GC 有什么用？",
          a: "GC（GoalCoin）是 Football2026 平台内的虚拟娱乐道具，用于参与比赛预测、展示排行榜地位等站内互动。GC 无任何现金价值。",
        },
        {
          q: "GC 可以提现或兑换吗？",
          a: "不可以。GC 是纯虚拟娱乐道具，不可兑换现金、礼品卡或任何实物，也不可转移到平台外部。请参阅服务条款了解详情。",
        },
        {
          q: "充值 GC 是干什么？",
          a: "充值后可获得更多虚拟道具用于预测互动，提升账户等级与竞技体验。充值属于购买平台虚拟道具服务，不可退款（法律强制规定除外）。",
        },
        {
          q: "GC 余额会过期吗？",
          a: "正常情况下 GC 不会过期。违规账户根据服务条款可能被没收余额。",
        },
        {
          q: "如何提升签到奖励？",
          a: "连续签到天数越多，次日基础奖励的加成比例越高（每天 +1%），最高可达 +30% 加成。中断后从 0% 重新计算。",
        },
      ]
    : [
        {
          q: "What is GC used for?",
          a: "GoalCoin (GC) is Football2026's virtual entertainment token. Use it to participate in match predictions, showcase your leaderboard rank, and interact on the platform. GC has no monetary value.",
        },
        {
          q: "Can I cash out or exchange GC?",
          a: "No. GC is a purely virtual entertainment token. It cannot be redeemed for cash, gift cards, physical goods, or transferred outside the platform. See the Terms of Service for details.",
        },
        {
          q: "Why top up GC?",
          a: "Topping up gives you more tokens for in-platform prediction interactions, helping you climb leaderboards and level up your account. Top-ups are purchases of virtual goods and are non-refundable except where required by law.",
        },
        {
          q: "Does GC expire?",
          a: "GC does not expire under normal circumstances. Accounts that violate our Terms of Service may have their GC balance forfeited.",
        },
        {
          q: "How do I boost my check-in rewards?",
          a: "Check in on consecutive days to grow a streak bonus (+1% per day, capped at +30%). The bonus resets if you miss a day.",
        },
      ];

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20 pt-8 space-y-8">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-black text-white">🪙 {lc(locale, "GC 奖励说明", "GC Rewards Guide")}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {lc(locale, "了解如何赚取 GoalCoin，提升你的排名", "Learn how to earn GoalCoin and climb the leaderboard")}
        </p>
      </div>

      {/* ── Compliance banner ── */}
      <div className="bg-[#FFD700]/8 border border-[#FFD700]/25 rounded-2xl p-4">
        <p className="text-xs text-[#FFD700]/80 font-medium leading-relaxed">
          {lc(locale, "⚠️ GoalCoin (GC) 是虚拟娱乐道具，仅限 Football2026 平台内使用，无任何现金价值，不可兑换现金或实物。", "⚠️ GoalCoin (GC) is a virtual entertainment token for use within Football2026 only. It has no cash value and cannot be redeemed for cash or physical goods.")}
        </p>
      </div>

      {/* ── How to earn ── */}
      <section>
        <h2 className="text-sm font-black text-white mb-3">
          💰 {lc(locale, "如何赚取 GC", "How to Earn GC")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {earningMethods.map((item, i) => (
            <Link
              key={i}
              href={item.href}
              className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4 hover:border-[#FFD700]/30 transition-all flex gap-3"
            >
              <span className="text-2xl shrink-0 mt-0.5">{item.icon}</span>
              <div>
                <p className="text-sm font-black text-white">{item.title}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Wealth levels table ── */}
      <section>
        <h2 className="text-sm font-black text-white mb-3">
          🏅 {lc(locale, "账户等级与每日签到 GC", "Account Levels & Daily Check-In GC")}
        </h2>
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1E3A5F]">
                <th className="px-4 py-3 text-left text-gray-500 font-medium">{lc(locale, "等级", "Level")}</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium">{lc(locale, "GC 余额", "GC Balance")}</th>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">{lc(locale, "每日签到（基础）", "Daily Base GC")}</th>
              </tr>
            </thead>
            <tbody>
              {levelRows.map((row, i) => (
                <tr key={i} className="border-b border-[#1E3A5F]/40">
                  <td className="px-4 py-3">
                    <span className="text-base mr-1.5">{row.icon}</span>
                    <span className="font-black text-white">{row.name}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{row.range}</td>
                  <td className="px-4 py-3 text-right text-[#FFD700] font-black">{row.daily}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2.5 text-[10px] text-gray-600 border-t border-[#1E3A5F]/40">
            {lc(locale, "* 连续签到加成：每天 +1%，最高 +30%（中断后归零）", "* Streak bonus: +1% per consecutive day, capped at +30% (resets on break)")}
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section>
        <h2 className="text-sm font-black text-white mb-3">
          ❓ {lc(locale, "常见问题", "Frequently Asked Questions")}
        </h2>
        <div className="space-y-2">
          {faqItems.map((item, i) => (
            <div key={i} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4">
              <p className="text-sm font-black text-white mb-1.5">{item.q}</p>
              <p className="text-xs text-gray-400 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom links ── */}
      <div className="pt-4 border-t border-[#1E3A5F] flex flex-wrap gap-4 text-sm text-gray-500">
        <Link href={`/${locale}/profile/checkin`} className="hover:text-[#FFD700] transition-colors">
          {lc(locale, "每日签到 →", "Daily Check-In →")}
        </Link>
        <Link href={`/${locale}/missions`} className="hover:text-[#FFD700] transition-colors">
          {lc(locale, "任务中心 →", "Missions →")}
        </Link>
        <Link href={`/${locale}/leaderboard`} className="hover:text-[#FFD700] transition-colors">
          {lc(locale, "排行榜 →", "Leaderboard →")}
        </Link>
        <Link href={`/${locale}/terms`} className="hover:text-[#FFD700] transition-colors">
          {lc(locale, "服务条款", "Terms of Service")}
        </Link>
      </div>

    </div>
  );
}
