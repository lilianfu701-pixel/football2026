"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { lc } from "@/i18n/content";

interface FaqItem {
  q: string;
  a: string;
}

interface FaqSection {
  title: string;
  icon: string;
  items: FaqItem[];
}

function getContent(locale: string): FaqSection[] {
  const zh = locale === "zh";
  return [
    {
      title: lc(locale, "关于 GoalCoin (GC)", "About GoalCoin (GC)"),
      icon: "🪙",
      items: [
        {
          q: lc(locale, "GoalCoin (GC) 是什么？", "What is GoalCoin (GC)?"),
          a: lc(locale, "GoalCoin (GC) 是 Football2026 平台专属的虚拟娱乐道具。它仅用于平台内的互动娱乐活动（如预测比赛结果），没有任何实际货币价值，不可兑换为现金或实物商品。", "GoalCoin (GC) is a virtual entertainment token exclusive to the Football2026 platform. It is used solely for in-platform interactive entertainment activities (such as predicting match results). GC has no real monetary value and cannot be redeemed for cash or physical goods."),
        },
        {
          q: lc(locale, "GC 可以提现或转换成真实货币吗？", "Can I withdraw or exchange GC for real money?"),
          a: lc(locale, "不可以。GC 是纯粹的虚拟娱乐道具，不可提现、不可转让到平台外部、不可兑换为任何形式的法定货币或实物商品。Football2026 不是赌博平台。", "No. GC is a purely virtual entertainment token. It cannot be withdrawn, transferred outside the platform, or exchanged for any form of legal tender or physical goods. Football2026 is not a gambling platform."),
        },
        {
          q: lc(locale, "如何获得 GC？", "How do I earn GC?"),
          a: lc(locale, "您可以通过以下方式获得 GC：① 注册新账户（赠送 2000万GC）② 每日签到（每天免费领取）③ 预测比赛结果正确（获得倍率奖励）④ 在论坛获得点赞或打赏 ⑤ 邀请好友注册 ⑥ 充值购买 GC 礼包。", "You can earn GC by: ① Registering a new account (20M GC welcome gift) ② Daily check-in (free GC every day) ③ Correctly predicting match outcomes (multiplier reward) ④ Receiving ratings/tips on forum posts ⑤ Inviting friends to register ⑥ Purchasing GC top-up packages."),
        },
        {
          q: lc(locale, "GC 余额有有效期吗？", "Does my GC balance expire?"),
          a: lc(locale, "GC 余额在您账户持续正常使用期间不会过期。但若账户因违反服务条款被封禁，账户内 GC 将被没收。", "Your GC balance does not expire as long as your account remains active. However, if your account is suspended for violating the Terms of Service, the GC balance will be forfeited."),
        },
      ],
    },
    {
      title: lc(locale, "预测玩法", "How Predictions Work"),
      icon: "⚽",
      items: [
        {
          q: lc(locale, "如何参与比赛预测？", "How do I participate in match predictions?"),
          a: lc(locale, "进入任意比赛详情页，在「预测」面板中选择您预测的结果（主队赢/平局/客队赢），输入消耗的 GC 数量，点击「确认预测」即可。比赛开赛前均可参与预测，开赛后将无法再提交。", "Go to any match detail page, select your predicted outcome (Home Win / Draw / Away Win) in the Prediction panel, enter the amount of GC to stake, and click \"Confirm Prediction\". You can predict up to kick-off time; predictions close when the match starts."),
        },
        {
          q: lc(locale, "倍率是如何计算的？", "How are odds/multipliers calculated?"),
          a: lc(locale, "每场比赛的倍率根据全站用户的预测分布动态调整——选择该结果的用户越少，倍率越高（奖励越多）。倍率在您提交预测时即锁定，后续不受其他用户影响。", "Multipliers for each match are dynamically adjusted based on the prediction distribution across all users — the fewer users who pick a given outcome, the higher the multiplier (and the greater the reward). Your multiplier is locked at the time you submit your prediction and is not affected by subsequent predictions."),
        },
        {
          q: lc(locale, "预测正确能赢多少 GC？", "How much GC do I win if my prediction is correct?"),
          a: lc(locale, "预测正确后，您将获得「消耗 GC × 倍率」的 GC 奖励。例如：消耗 10万GC，倍率为 2.5，则获得 25万GC。", "If your prediction is correct, you receive \"GC staked × multiplier\" in GC rewards. For example: if you stake 100,000 GC at a multiplier of 2.5, you receive 250,000 GC."),
        },
        {
          q: lc(locale, "可以取消预测吗？", "Can I cancel a prediction?"),
          a: lc(locale, "在比赛开赛前，您可以取消「待结算」状态的预测。取消后，消耗的 GC 将立即退回到您的账户余额。比赛开赛后无法取消。", "Before the match kicks off, you can cancel a \"Pending\" prediction. Upon cancellation, the staked GC is immediately refunded to your account balance. Predictions cannot be cancelled after the match starts."),
        },
        {
          q: lc(locale, "如果比赛取消或平局怎么办？", "What happens if a match is cancelled or there are special results?"),
          a: lc(locale, "如比赛因不可抗力原因取消或推迟（且无法重新安排），所有相关预测将被退款，GC 全额返还。如比赛正常进行且无法确定最终结果，平台会以实际官方结果为准结算。", "If a match is cancelled due to force majeure and cannot be rescheduled, all related predictions will be refunded in full. If the match proceeds normally, settlement is based on the official final result."),
        },
        {
          q: lc(locale, "比分预测是怎么玩的？", "How does score prediction work?"),
          a: lc(locale, "比分预测需要您猜测比赛最终的精确比分（如 2:1）。正确预测比分的倍率远高于普通输赢预测，但难度也更大。每场比赛只能提交一次比分预测。", "Score prediction requires you to guess the exact final score of a match (e.g., 2:1). The multiplier for a correct score prediction is significantly higher than a regular win/draw/loss prediction, but it is also much harder. Only one score prediction per match per user."),
        },
      ],
    },
    {
      title: lc(locale, "充值与支付", "Top-up & Payments"),
      icon: "💳",
      items: [
        {
          q: lc(locale, "如何充值 GC？", "How do I top up GC?"),
          a: lc(locale, "进入「我的 → 充值」页面，选择所需的 GC 礼包，选择支付方式（信用卡/PayPal/USDT），完成支付后 GC 将立即到账。", "Go to \"Profile → Top Up\", select the GC package you want, choose your payment method (Credit Card / PayPal / USDT TRC-20), and complete the payment. GC is credited instantly after successful payment."),
        },
        {
          q: lc(locale, "支持哪些支付方式？", "What payment methods are supported?"),
          a: lc(locale, "目前支持：① 信用卡/借记卡（Visa、Mastercard 等，通过 Paddle 处理）② PayPal ③ USDT TRC-20（TRON 链稳定币）。", "Currently supported: ① Credit/Debit Card (Visa, Mastercard, etc., processed via Paddle) ② PayPal ③ USDT TRC-20 (TRON network stablecoin)."),
        },
        {
          q: lc(locale, "充值后 GC 没有到账怎么办？", "My GC wasn't credited after payment — what do I do?"),
          a: lc(locale, "大多数情况下，GC 在支付成功后立即到账。如超过 10 分钟仍未到账，请携带支付凭证（截图/交易ID）联系客服 support@football2026.net，我们将在 24 小时内处理。", "In most cases, GC is credited instantly after successful payment. If more than 10 minutes have passed without the credit appearing, please contact support@football2026.net with your payment proof (screenshot/transaction ID). We will resolve it within 24 hours."),
        },
        {
          q: lc(locale, "充值是否可以退款？", "Can I get a refund for a top-up?"),
          a: lc(locale, "根据服务条款，GC 属于虚拟数字商品，一般情况下充值后不可退款。如果您认为存在支付错误或欺诈性扣款，请在 7 天内联系客服，我们将按具体情况处理。", "Per our Terms of Service, GC is a virtual digital good and top-ups are generally non-refundable. If you believe there was a billing error or fraudulent charge, please contact support within 7 days and we will review on a case-by-case basis."),
        },
      ],
    },
    {
      title: lc(locale, "签到与福利", "Check-in & Rewards"),
      icon: "🎁",
      items: [
        {
          q: lc(locale, "每日签到怎么领 GC？", "How does daily check-in work?"),
          a: lc(locale, "每天进入「每日签到」页面，点击签到按钮即可免费获得 GC。每日签到奖励基于您的财富等级，连续签到天数越多，奖励越高（最高额外 +30%）。", "Visit the Daily Check-in page each day and tap the check-in button to receive free GC. The daily reward is based on your wealth level, and consecutive check-in streaks provide bonus GC (up to +30% extra)."),
        },
        {
          q: lc(locale, "邀请系统如何运作？", "How does the invite system work?"),
          a: lc(locale, "在「邀请」页面找到您的专属邀请链接，每成功邀请一位新用户注册，您和被邀请人均可获得 GC 奖励。达到特定邀请里程碑（如邀请5人、10人）还可额外领取奖励。", "Find your unique invite link on the Invite page. For each successful new user registration via your link, both you and the invited user receive GC rewards. Reaching invite milestones (e.g., 5, 10 invites) unlocks additional bonus rewards."),
        },
        {
          q: lc(locale, "财富等级有什么用？", "What does my wealth level do?"),
          a: lc(locale, "财富等级由您的 GC 余额决定。等级越高，每日签到奖励越多，也可以解锁更多平台特权。等级从「平民」到「王者」共7档。", "Your wealth level is determined by your GC balance. Higher levels mean greater daily check-in rewards and unlock additional platform privileges. Levels range from Common to Emperor across 7 tiers."),
        },
      ],
    },
    {
      title: lc(locale, "账户与安全", "Account & Security"),
      icon: "🔐",
      items: [
        {
          q: lc(locale, "忘记密码怎么办？", "What do I do if I forget my password?"),
          a: lc(locale, "在登录页面点击「忘记密码」，输入您的注册邮箱，我们将发送重置密码邮件。如未收到邮件，请检查垃圾邮件文件夹，或联系客服。", "Click \"Forgot Password\" on the login page, enter your registered email, and we will send a password reset email. If you don't receive the email, please check your spam folder or contact support."),
        },
        {
          q: lc(locale, "如何联系客服？", "How do I contact support?"),
          a: lc(locale, "您可以通过电子邮件 support@football2026.net 联系我们的客服团队。我们通常在 24 小时内回复（工作日）。", "You can contact our support team via email at support@football2026.net. We typically respond within 24 hours on business days."),
        },
        {
          q: lc(locale, "如何注销账户？", "How do I delete my account?"),
          a: lc(locale, "账户注销请联系客服 support@football2026.net，提供您的注册邮箱和注销原因。账户注销后，您的 GC 余额将被清零，该邮箱不可再次注册。", "To delete your account, please contact support@football2026.net with your registered email and reason for deletion. After deletion, your GC balance will be zeroed out and the email address cannot be re-registered."),
        },
      ],
    },
  ];
}

export default function HelpPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const zh = locale === "zh";
  const sections = getContent(locale);
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20">
      <div className="max-w-3xl mx-auto px-4 pt-10">

        {/* Header */}
        <div className="mb-8">
          <div className="text-sm text-gray-500 mb-2">
            <Link href={`/${locale}`} className="hover:text-[#FFD700]">Football2026</Link>
            <span className="mx-2">/</span>
            <span>{lc(locale, "帮助中心", "Help Center")}</span>
          </div>
          <h1 className="text-3xl font-black text-white">
            {lc(locale, "❓ 帮助中心", "❓ Help Center")}
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            {lc(locale, "常见问题解答", "Frequently Asked Questions")}
          </p>
        </div>

        <div className="h-0.5 bg-gradient-to-r from-[#FFD700] via-[#FF8C00] to-transparent mb-8" />

        {/* FAQ sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-base font-black text-white mb-3 flex items-center gap-2">
                <span>{section.icon}</span>
                <span>{section.title}</span>
              </h2>
              <div className="space-y-2">
                {section.items.map((item, idx) => {
                  const key = `${section.title}-${idx}`;
                  const open = openItems.has(key);
                  return (
                    <div
                      key={key}
                      className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => toggle(key)}
                        className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-[#1E3A5F]/40 transition-colors"
                      >
                        <span className="text-sm font-bold text-white">{item.q}</span>
                        <span className={`text-gray-400 text-lg shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
                          ▾
                        </span>
                      </button>
                      {open && (
                        <div className="px-4 pb-4 pt-0">
                          <div className="h-px bg-[#1E3A5F] mb-3" />
                          <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 bg-gradient-to-br from-[#1E3A5F] to-[#0F2040] border border-[#1E3A5F] rounded-2xl p-6 text-center">
          <p className="text-lg font-black text-white mb-1">
            {lc(locale, "还有其他问题？", "Still have questions?")}
          </p>
          <p className="text-sm text-gray-400 mb-4">
            {lc(locale, "我们的客服团队随时为您提供帮助", "Our support team is here to help")}
          </p>
          <a
            href="mailto:support@football2026.net"
            className="inline-block bg-[#FFD700] text-[#0A1628] font-black px-6 py-2.5 rounded-xl hover:bg-[#FFED4A] transition-colors text-sm"
          >
            support@football2026.net
          </a>
        </div>

        {/* Bottom nav */}
        <div className="mt-10 pt-6 border-t border-[#1E3A5F] flex flex-wrap gap-4 text-sm text-gray-500">
          <Link href={`/${locale}`} className="hover:text-[#FFD700]">
            {lc(locale, "← 返回首页", "← Back to Home")}
          </Link>
          <Link href={`/${locale}/terms`} className="hover:text-[#FFD700]">
            {lc(locale, "服务条款", "Terms of Service")}
          </Link>
          <Link href={`/${locale}/privacy`} className="hover:text-[#FFD700]">
            {lc(locale, "隐私政策", "Privacy Policy")}
          </Link>
        </div>

      </div>
    </div>
  );
}
