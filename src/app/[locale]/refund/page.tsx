import type { Metadata } from "next";
import Link from "next/link";
import { lc } from "@/i18n/content";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const zh = locale === "zh";
  return {
    title: lc(locale, "退款政策 | Football2026", "Refund Policy | Football2026"),
    description: lc(locale, "Football2026 退款政策。GoalCoin (GC) 充值为虚拟数字商品，到账后通常不可退款，但符合条件的情形可申请退款。", "Football2026 Refund Policy. GoalCoin (GC) top-ups are virtual digital goods and are generally non-refundable once credited, with exceptions for eligible cases."),
  };
}

export default async function RefundPage({ params }: Props) {
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
            <span>{lc(locale, "退款政策", "Refund Policy")}</span>
          </div>
          <h1 className="text-3xl font-black text-white">
            {lc(locale, "退款政策", "Refund Policy")}
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            {lc(locale, "最后更新：2026年6月1日", "Last updated: June 1, 2026")}
          </p>
        </div>

        {/* Gold divider */}
        <div className="h-0.5 bg-gradient-to-r from-[#FFD700] via-[#FF8C00] to-transparent mb-8" />

        <div className="prose prose-invert max-w-none space-y-8 text-gray-300 leading-relaxed">

          {/* ── 1. Overview ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {lc(locale, "1. 概述", "1. Overview")}
            </h2>
            <p>
              {lc(locale, "本退款政策适用于您在 Football2026（https://football2026.net）购买的所有 GoalCoin (GC) 充值包及其他虚拟商品。购买前请仔细阅读本政策。完成购买即表示您已理解并接受本退款政策。", "This Refund Policy applies to all GoalCoin (GC) top-up packages and other virtual goods purchased on Football2026 (https://football2026.net). Please read this policy carefully before purchasing. By completing a purchase, you confirm that you understand and accept this Refund Policy.")}
            </p>
          </section>

          {/* ── 2. Nature of GC — CRITICAL ── */}
          <section className="bg-[#FFD700]/8 border border-[#FFD700]/30 rounded-2xl p-6">
            <h2 className="text-xl font-black text-[#FFD700] mb-3">
              {lc(locale, "2. 虚拟商品性质", "2. Nature of Virtual Goods")}
            </h2>
            <ul className="space-y-3 list-none">
              {(zh ? [
                "GoalCoin (GC) 是虚拟娱乐道具，购买后即时充值到您的账户。",
                "GC 属于一经交付即被消费/使用的数字商品，因此成功到账后通常不可退款。",
                "GC 无现金价值，不可兑换为现金或转让至平台外部。",
              ] : [
                "GoalCoin (GC) is a virtual entertainment token, credited to your account instantly upon purchase.",
                "GC is a digital good that is delivered and consumed immediately, and is therefore generally non-refundable once credited.",
                "GC has no cash value and cannot be redeemed for cash or transferred outside the platform.",
              ]).map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-[#FFD700] font-black mt-0.5 shrink-0">✓</span>
                  <span className="text-gray-200">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ── 3. Eligible for Refund ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {lc(locale, "3. 可申请退款的情形", "3. Cases Eligible for a Refund")}
            </h2>
            <p className="mb-3">
              {lc(locale, "尽管 GC 充值原则上不可退款，但在以下情形下，您可以申请退款：", "Although GC top-ups are non-refundable in principle, you may request a refund in the following cases:")}
            </p>
            <ul className="space-y-2 list-disc list-inside text-gray-400">
              {(zh ? [
                "重复扣款：因系统或支付渠道错误导致同一笔订单被重复扣款。",
                "扣款成功但 GC 未到账，且经核实确实未发放。",
                "未经授权的交易：您的支付账户被他人盗用产生的交易（需提供证明）。",
                "适用的消费者保护法律强制要求退款的其他情形。",
              ] : [
                "Duplicate charges: the same order was charged more than once due to a system or payment-channel error.",
                "Payment succeeded but GC was not credited, and the credit is verified as not delivered.",
                "Unauthorized transactions: charges resulting from unauthorized use of your payment account (proof required).",
                "Any other case where a refund is mandatorily required by applicable consumer protection law.",
              ]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          {/* ── 4. Not Eligible ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {lc(locale, "4. 不予退款的情形", "4. Cases Not Eligible for a Refund")}
            </h2>
            <ul className="space-y-2 list-disc list-inside text-gray-400">
              {(zh ? [
                "GC 已成功到账且您改变主意，或不再希望使用。",
                "GC 已部分或全部用于平台内预测、互动等活动。",
                "因违反《服务条款》导致账户被暂停或终止而被没收的 GC 余额。",
                "对娱乐预测结果不满意（预测活动为纯娱乐性质，结果不可逆）。",
              ] : [
                "GC has been successfully credited and you simply changed your mind or no longer wish to use it.",
                "GC has been partially or fully used in prediction, interaction, or other on-platform activities.",
                "GC balance forfeited because an account was suspended or terminated for violating the Terms of Service.",
                "Dissatisfaction with entertainment prediction outcomes (prediction activities are purely for entertainment and outcomes are final).",
              ]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          {/* ── 5. How to Request ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {lc(locale, "5. 如何申请退款", "5. How to Request a Refund")}
            </h2>
            <p className="mb-3">
              {lc(locale, "如需申请退款，请在交易发生后 14 天内通过 support@football2026.net 联系我们，并提供以下信息：", "To request a refund, please contact us at support@football2026.net within 14 days of the transaction, providing the following information:")}
            </p>
            <ul className="space-y-2 list-disc list-inside text-gray-400">
              {(zh ? [
                "您的账户邮箱 / 用户名",
                "订单号或支付交易号",
                "交易日期与金额",
                "申请退款的原因及相关证明（如截图）",
              ] : [
                "Your account email / username",
                "Order number or payment transaction ID",
                "Transaction date and amount",
                "Reason for the refund request and any supporting evidence (e.g. screenshots)",
              ]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          {/* ── 6. Processing ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {lc(locale, "6. 退款处理时间与方式", "6. Processing Time & Method")}
            </h2>
            <p className="mb-2">
              {lc(locale, "我们会在收到您的退款申请后 5 个工作日内审核并回复。审核通过的退款将原路退回至您的原支付方式（银行卡、PayPal 等）。", "We will review and respond to your refund request within 5 business days of receipt. Approved refunds will be returned to your original payment method (bank card, PayPal, etc.).")}
            </p>
            <p>
              {lc(locale, "退款到账时间取决于您的支付机构，通常需要 5–10 个工作日。退款金额将以原支付币种结算。已发放的对应 GC 将从您的账户中扣回。", "The time for the refund to appear depends on your payment provider and usually takes 5–10 business days. Refunds are settled in the original payment currency. The corresponding GC credited will be deducted from your account.")}
            </p>
          </section>

          {/* ── 7. Chargebacks ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {lc(locale, "7. 拒付（Chargeback）", "7. Chargebacks")}
            </h2>
            <p>
              {lc(locale, "在通过银行或支付机构发起拒付前，请先联系我们解决问题。未经沟通直接发起的恶意拒付可能导致您的账户被暂停。我们保留对滥用拒付行为采取相应措施的权利。", "Before initiating a chargeback through your bank or payment provider, please contact us first to resolve the issue. Malicious chargebacks filed without prior communication may result in suspension of your account. We reserve the right to take action against chargeback abuse.")}
            </p>
          </section>

          {/* ── 8. Contact ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {lc(locale, "8. 联系我们", "8. Contact Us")}
            </h2>
            <p>
              {lc(locale, "如有关于退款政策的任何疑问，请通过以下方式联系我们：", "If you have any questions about this Refund Policy, please contact us at:")}
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
            {lc(locale, "← 返回首页", "← Back to Home")}
          </Link>
          <Link href={`/${locale}/terms`} className="hover:text-[#FFD700]">
            {lc(locale, "服务条款", "Terms of Service")}
          </Link>
          <Link href={`/${locale}/privacy`} className="hover:text-[#FFD700]">
            {lc(locale, "隐私政策", "Privacy Policy")}
          </Link>
          <Link href={`/${locale}/help`} className="hover:text-[#FFD700]">
            {lc(locale, "帮助中心", "Help Center")}
          </Link>
        </div>

      </div>
    </div>
  );
}
