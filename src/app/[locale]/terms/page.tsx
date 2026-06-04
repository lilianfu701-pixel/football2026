import type { Metadata } from "next";
import Link from "next/link";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const zh = locale === "zh";
  return {
    title: zh ? "服务条款 | Football2026" : "Terms of Service | Football2026",
    description: zh
      ? "Football2026 服务条款。GoalCoin (GC) 是虚拟娱乐道具，不可兑换现金。"
      : "Football2026 Terms of Service. GoalCoin (GC) is a virtual entertainment token and cannot be redeemed for cash.",
  };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  const zh = locale === "zh";

  return (
    <div className="min-h-screen bg-[#0A1628] text-white pb-20">
      <div className="max-w-3xl mx-auto px-4 pt-10">

        {/* Header */}
        <div className="mb-8">
          <div className="text-sm text-gray-500 mb-2">
            <Link href={`/${locale}`} className="hover:text-[#FFD700]">Football2026</Link>
            <span className="mx-2">/</span>
            <span>{zh ? "服务条款" : "Terms of Service"}</span>
          </div>
          <h1 className="text-3xl font-black text-white">
            {zh ? "服务条款" : "Terms of Service"}
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            {zh ? "最后更新：2026年6月1日" : "Last updated: June 1, 2026"}
          </p>
        </div>

        {/* Gold divider */}
        <div className="h-0.5 bg-gradient-to-r from-[#FFD700] via-[#FF8C00] to-transparent mb-8" />

        <div className="prose prose-invert max-w-none space-y-8 text-gray-300 leading-relaxed">

          {/* ── 1. Acceptance ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {zh ? "1. 接受条款" : "1. Acceptance of Terms"}
            </h2>
            <p>
              {zh
                ? "通过访问或使用 Football2026（https://football2026.net），您确认已阅读、理解并同意受本服务条款约束。如您不同意这些条款，请勿使用本服务。"
                : "By accessing or using Football2026 (https://football2026.net), you confirm that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree, please do not use the Service."}
            </p>
          </section>

          {/* ── 2. Description of Service ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {zh ? "2. 服务说明" : "2. Description of Service"}
            </h2>
            <p>
              {zh
                ? "Football2026 是一款 2026 年 FIFA 世界杯主题的互动娱乐预测游戏平台。用户可以通过参与比赛结果预测活动赚取虚拟道具 GoalCoin (GC)，并在站内排行榜竞技。"
                : "Football2026 is an interactive entertainment prediction game platform themed around the 2026 FIFA World Cup. Users can earn the virtual token GoalCoin (GC) by participating in match result prediction activities and compete on in-game leaderboards."}
            </p>
          </section>

          {/* ── 3. GoalCoin — CRITICAL ── */}
          <section className="bg-[#FFD700]/8 border border-[#FFD700]/30 rounded-2xl p-6">
            <h2 className="text-xl font-black text-[#FFD700] mb-3">
              {zh ? "3. GoalCoin (GC) 重要声明" : "3. GoalCoin (GC) — Important Declaration"}
            </h2>
            <ul className="space-y-3 list-none">
              {(zh ? [
                "GoalCoin (GC) 是一种虚拟娱乐道具，仅在 Football2026 平台内使用，无任何实际货币价值。",
                "GC 不可兑换为现金、实物商品或任何形式的法定货币，也不可转让到任何平台外部。",
                "购买 GC 充值包属于购买平台内虚拟道具服务，充值后不可退款（法律另有规定除外）。",
                "Football2026 不是赌博平台，任何以 GC 进行的预测活动均为纯娱乐性质，不构成赌博行为。",
                "GC 仅用于平台内娱乐互动，不构成任何形式的投资。",
              ] : [
                "GoalCoin (GC) is a virtual entertainment token for use solely within the Football2026 platform and has no real monetary value.",
                "GC cannot be redeemed for cash, physical goods, or any form of legal tender, nor transferred outside the platform.",
                "Purchasing a GC top-up package constitutes a purchase of in-platform virtual goods. Top-ups are non-refundable except where required by law.",
                "Football2026 is not a gambling platform. All prediction activities conducted with GC are purely for entertainment and do not constitute gambling.",
                "GC is for in-platform entertainment interaction only and does not constitute any form of investment.",
              ]).map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-[#FFD700] font-black mt-0.5 shrink-0">✓</span>
                  <span className="text-gray-200">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ── 4. Eligibility ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {zh ? "4. 使用资格" : "4. Eligibility"}
            </h2>
            <p>
              {zh
                ? "您须年满 18 周岁方可使用本服务及进行 GC 充值购买。您使用本服务即表明您已满足上述年龄要求，且在您所在司法管辖区使用本服务不违反任何法律。"
                : "You must be at least 18 years of age to use the Service and purchase GC top-ups. By using the Service, you represent that you meet this age requirement and that your use of the Service does not violate any law in your jurisdiction."}
            </p>
          </section>

          {/* ── 5. User Accounts ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {zh ? "5. 用户账户" : "5. User Accounts"}
            </h2>
            <p className="mb-2">
              {zh
                ? "每位用户只能注册一个账户。您有责任维护账户凭证的安全，并对该账户下的所有活动负责。您不得将账户转让给他人。"
                : "Each user may only register one account. You are responsible for maintaining the security of your account credentials and are liable for all activities conducted under your account. You may not transfer your account to another person."}
            </p>
            <p>
              {zh
                ? "若发现账户被未授权使用，请立即联系我们的客服团队。"
                : "If you discover unauthorized use of your account, please contact our support team immediately."}
            </p>
          </section>

          {/* ── 6. Prohibited Uses ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {zh ? "6. 禁止行为" : "6. Prohibited Uses"}
            </h2>
            <p className="mb-3">{zh ? "用户不得从事以下行为：" : "Users must not engage in the following:"}</p>
            <ul className="space-y-2 list-disc list-inside text-gray-400">
              {(zh ? [
                "通过程序、脚本或其他自动化手段批量操作或刷取 GC",
                "利用系统漏洞或 bug 获取不当利益",
                "骚扰、威胁或侵犯其他用户",
                "发布违法、淫秽、欺诈性或侵权内容",
                "多账户注册、刷邀请奖励",
                "任何将平台用于赌博、洗钱或其他非法目的的行为",
              ] : [
                "Using programs, scripts, or automation to bulk-generate GC",
                "Exploiting system bugs or vulnerabilities for unfair advantage",
                "Harassing, threatening, or infringing the rights of other users",
                "Posting illegal, obscene, fraudulent, or infringing content",
                "Registering multiple accounts to abuse invite rewards",
                "Using the platform for gambling, money laundering, or any other illegal purpose",
              ]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          {/* ── 7. Payments & Refunds ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {zh ? "7. 支付与退款" : "7. Payments & Refunds"}
            </h2>
            <p className="mb-2">
              {zh
                ? "所有 GC 充值交易均为购买虚拟道具服务，一旦成功充值即时到账。因 GC 属于虚拟数字商品，根据服务性质，充值成功后通常不提供退款，除非适用的消费者保护法律另有强制规定。"
                : "All GC top-up transactions are purchases of virtual goods. Purchased GC is credited instantly upon successful payment. As GC is a virtual digital good, top-ups are generally non-refundable after successful purchase, except where mandatory consumer protection laws apply in your jurisdiction."}
            </p>
            <p>
              {zh
                ? "如果您认为您的账单存在错误，请在 7 个工作日内通过以下联系方式联系我们。"
                : "If you believe there is an error with your billing, please contact us within 7 business days using the contact information below."}
            </p>
          </section>

          {/* ── 8. Intellectual Property ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {zh ? "8. 知识产权" : "8. Intellectual Property"}
            </h2>
            <p>
              {zh
                ? "Football2026 平台上的所有内容（包括但不限于设计、商标、文字、图形、软件及 GC 相关资产）均为 Football2026 的专有财产或已获得相应授权使用。未经书面授权，您不得复制、传播或商业使用上述内容。"
                : "All content on the Football2026 platform (including but not limited to designs, trademarks, text, graphics, software, and GC-related assets) are the proprietary property of Football2026 or licensed for use. You may not reproduce, distribute, or use such content for commercial purposes without prior written consent."}
            </p>
          </section>

          {/* ── 9. Disclaimers & Limitation of Liability ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {zh ? "9. 免责声明与责任限制" : "9. Disclaimers & Limitation of Liability"}
            </h2>
            <p className="mb-2">
              {zh
                ? "本服务按「现状」提供，不作任何明示或暗示的保证。Football2026 不对服务中断、数据丢失、预测结果的准确性或任何间接、附带或后果性损失承担责任。"
                : `The Service is provided "as is" without any express or implied warranties. Football2026 is not liable for service interruptions, data loss, accuracy of prediction outcomes, or any indirect, incidental, or consequential damages.`}
            </p>
            <p>
              {zh
                ? "Football2026 的赔偿责任上限为您在争议发生前 3 个月内向本平台支付的实际金额。"
                : "Football2026's maximum liability is limited to the amount you actually paid to the platform in the 3 months preceding the dispute."}
            </p>
          </section>

          {/* ── 10. Modifications ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {zh ? "10. 条款变更" : "10. Modifications to Terms"}
            </h2>
            <p>
              {zh
                ? "我们保留随时修改本服务条款的权利。重大变更将在平台上公告。变更发布后继续使用本服务即视为您接受修订后的条款。"
                : "We reserve the right to modify these Terms at any time. Material changes will be announced on the platform. Continued use of the Service after changes are posted constitutes your acceptance of the revised Terms."}
            </p>
          </section>

          {/* ── 11. Termination ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {zh ? "11. 账户终止" : "11. Termination"}
            </h2>
            <p>
              {zh
                ? "Football2026 保留因违反本条款而暂停或终止用户账户的权利，恕不另行通知。账户终止后，账户内 GC 余额将被没收，不予退款。"
                : "Football2026 reserves the right to suspend or terminate user accounts for violations of these Terms without prior notice. Upon termination, any remaining GC balance is forfeited and non-refundable."}
            </p>
          </section>

          {/* ── 12. Governing Law ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {zh ? "12. 适用法律与争议解决" : "12. Governing Law & Dispute Resolution"}
            </h2>
            <p>
              {zh
                ? "本条款受适用的国际法律管辖。任何争议应先通过友好协商解决；协商不成时，提交具有管辖权的仲裁机构仲裁。"
                : "These Terms are governed by applicable international law. Any disputes shall first be resolved through amicable negotiation; if unsuccessful, disputes shall be submitted to binding arbitration before a competent arbitration body."}
            </p>
          </section>

          {/* ── 13. Contact ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {zh ? "13. 联系我们" : "13. Contact Us"}
            </h2>
            <p>
              {zh
                ? "如有关于本服务条款的任何疑问，请通过以下方式联系我们："
                : "If you have any questions about these Terms of Service, please contact us at:"}
            </p>
            <div className="mt-3 bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4 text-sm">
              <p className="text-[#FFD700] font-bold">Football2026</p>
              <p className="text-gray-400 mt-1">support@football2026.net</p>
              <p className="text-gray-400">https://football2026.net</p>
            </div>
          </section>

        </div>

        {/* Bottom nav */}
        <div className="mt-12 pt-6 border-t border-[#1E3A5F] flex flex-wrap gap-4 text-sm text-gray-500">
          <Link href={`/${locale}`} className="hover:text-[#FFD700]">
            {zh ? "← 返回首页" : "← Back to Home"}
          </Link>
          <Link href={`/${locale}/privacy`} className="hover:text-[#FFD700]">
            {zh ? "隐私政策" : "Privacy Policy"}
          </Link>
          <Link href={`/${locale}/refund`} className="hover:text-[#FFD700]">
            {zh ? "退款政策" : "Refund Policy"}
          </Link>
          <Link href={`/${locale}/help`} className="hover:text-[#FFD700]">
            {zh ? "帮助中心" : "Help Center"}
          </Link>
        </div>

      </div>
    </div>
  );
}
