import type { Metadata } from "next";
import Link from "next/link";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const zh = locale === "zh";
  return {
    title: zh ? "隐私政策 | Football2026" : "Privacy Policy | Football2026",
    description: zh
      ? "Football2026 隐私政策。我们如何收集、使用和保护您的个人数据。"
      : "Football2026 Privacy Policy. How we collect, use, and protect your personal data.",
  };
}

export default async function PrivacyPage({ params }: Props) {
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
            <span>{zh ? "隐私政策" : "Privacy Policy"}</span>
          </div>
          <h1 className="text-3xl font-black text-white">
            {zh ? "隐私政策" : "Privacy Policy"}
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            {zh ? "最后更新：2026年6月1日" : "Last updated: June 1, 2026"}
          </p>
        </div>

        <div className="h-0.5 bg-gradient-to-r from-[#FFD700] via-[#FF8C00] to-transparent mb-8" />

        <div className="prose prose-invert max-w-none space-y-8 text-gray-300 leading-relaxed">

          {/* Intro */}
          <p>
            {zh
              ? "Football2026（\"我们\"）非常重视您的隐私。本隐私政策说明了我们如何收集、使用、存储和披露您的个人信息。"
              : "Football2026 (\"we\", \"our\") takes your privacy seriously. This Privacy Policy explains how we collect, use, store, and disclose your personal information."}
          </p>

          {/* ── 1. Information We Collect ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {zh ? "1. 我们收集的信息" : "1. Information We Collect"}
            </h2>

            <h3 className="text-base font-bold text-gray-200 mb-2">
              {zh ? "账户信息" : "Account Information"}
            </h3>
            <p className="mb-4">
              {zh
                ? "注册时，我们收集您的电子邮箱地址、用户名及密码（加密存储）。如使用第三方登录（如 Google），我们将获取您的基本公开资料。"
                : "When you register, we collect your email address, username, and password (stored encrypted). If you use third-party login (e.g., Google), we receive your basic public profile."}
            </p>

            <h3 className="text-base font-bold text-gray-200 mb-2">
              {zh ? "使用数据" : "Usage Data"}
            </h3>
            <p className="mb-4">
              {zh
                ? "我们自动记录您的预测记录、GC 余额变动、登录时间和 IP 地址，以维护账户安全和服务正常运行。"
                : "We automatically record your prediction history, GC balance changes, login times, and IP addresses to maintain account security and service operation."}
            </p>

            <h3 className="text-base font-bold text-gray-200 mb-2">
              {zh ? "支付信息" : "Payment Information"}
            </h3>
            <p>
              {zh
                ? "GC 充值支付由第三方支付处理商（Paddle, PayPal）处理。我们不直接存储您的信用卡号或完整支付凭证；我们仅记录交易状态和金额用于核账。"
                : "GC top-up payments are processed by third-party payment processors (Paddle, PayPal). We do not directly store your credit card numbers or full payment credentials; we only record transaction status and amounts for reconciliation."}
            </p>
          </section>

          {/* ── 2. How We Use Your Information ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {zh ? "2. 信息使用方式" : "2. How We Use Your Information"}
            </h2>
            <ul className="space-y-2 list-disc list-inside text-gray-400">
              {(zh ? [
                "提供、维护和改进平台服务",
                "处理 GC 充值交易并更新账户余额",
                "发送服务相关通知（如预测结算结果）",
                "检测并防范欺诈、滥用或非法活动",
                "分析匿名化使用数据以改进产品体验",
                "遵守适用法律法规的要求",
              ] : [
                "Providing, maintaining, and improving platform services",
                "Processing GC top-up transactions and updating account balances",
                "Sending service-related notifications (e.g., prediction settlement results)",
                "Detecting and preventing fraud, abuse, or illegal activities",
                "Analyzing anonymized usage data to improve the product experience",
                "Complying with applicable laws and regulations",
              ]).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </section>

          {/* ── 3. Information Sharing ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {zh ? "3. 信息共享" : "3. Information Sharing"}
            </h2>
            <p className="mb-4">
              {zh
                ? "我们不会出售您的个人信息。在以下情况下，我们可能向第三方披露您的信息："
                : "We do not sell your personal information. We may disclose your information to third parties in the following circumstances:"}
            </p>

            <div className="space-y-3">
              {[
                {
                  name: "Supabase",
                  desc: zh ? "数据库和身份验证服务提供商" : "Database and authentication service provider",
                  link: "https://supabase.com/privacy",
                },
                {
                  name: "Paddle",
                  desc: zh ? "支付处理和发票服务" : "Payment processing and billing services",
                  link: "https://www.paddle.com/legal/privacy",
                },
                {
                  name: "PayPal",
                  desc: zh ? "支付处理服务" : "Payment processing services",
                  link: "https://www.paypal.com/privacy",
                },
                {
                  name: "Vercel",
                  desc: zh ? "云端托管和内容分发网络" : "Cloud hosting and content delivery network",
                  link: "https://vercel.com/legal/privacy-policy",
                },
              ].map((p) => (
                <div key={p.name} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold">{p.name}</span>
                    <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-xs text-[#FFD700] hover:underline">
                      {zh ? "隐私政策 →" : "Privacy Policy →"}
                    </a>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">{p.desc}</p>
                </div>
              ))}
            </div>

            <p className="mt-4">
              {zh
                ? "我们也可能在法律要求、保护我们的合法权益或防止欺诈时披露您的信息。"
                : "We may also disclose your information when required by law, to protect our legitimate interests, or to prevent fraud."}
            </p>
          </section>

          {/* ── 4. Data Retention ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {zh ? "4. 数据保留" : "4. Data Retention"}
            </h2>
            <p>
              {zh
                ? "您的账户数据在账户存续期间保留。注销账户后，我们将在 90 天内删除您的个人数据，但法律要求保留的记录（如财务流水）除外，此类数据将保留至法定期限届满。"
                : "Your account data is retained for the duration of your account. After account deletion, we will delete your personal data within 90 days, except for records required to be retained by law (e.g., financial transaction records), which will be kept until the statutory retention period expires."}
            </p>
          </section>

          {/* ── 5. Security ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {zh ? "5. 数据安全" : "5. Data Security"}
            </h2>
            <p>
              {zh
                ? "我们采用行业标准的安全措施保护您的数据，包括 TLS 加密传输、密码哈希存储和访问控制机制。但请注意，没有任何网络传输方法是绝对安全的。"
                : "We employ industry-standard security measures to protect your data, including TLS encrypted transmission, password hash storage, and access control mechanisms. However, please be aware that no method of internet transmission is absolutely secure."}
            </p>
          </section>

          {/* ── 6. Cookies ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {zh ? "6. Cookie 和追踪技术" : "6. Cookies & Tracking"}
            </h2>
            <p>
              {zh
                ? "我们使用必要的 Cookie 维持登录状态和会话安全。我们不使用第三方广告追踪 Cookie。您可以在浏览器中管理 Cookie 设置，但禁用某些 Cookie 可能影响服务功能。"
                : "We use essential cookies to maintain login state and session security. We do not use third-party advertising tracking cookies. You can manage cookie settings in your browser, though disabling certain cookies may affect service functionality."}
            </p>
          </section>

          {/* ── 7. Your Rights ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {zh ? "7. 您的权利" : "7. Your Rights"}
            </h2>
            <p className="mb-3">
              {zh
                ? "根据适用的数据保护法律，您享有以下权利："
                : "Under applicable data protection laws, you have the following rights:"}
            </p>
            <ul className="space-y-2 list-disc list-inside text-gray-400">
              {(zh ? [
                "访问权：查阅我们持有的您的个人数据",
                "更正权：纠正不准确的个人数据",
                "删除权：要求删除您的个人数据",
                "可携带权：以可读格式获取您的数据副本",
                "反对权：反对出于特定目的使用您的数据",
              ] : [
                "Access: Review the personal data we hold about you",
                "Correction: Correct inaccurate personal data",
                "Deletion: Request deletion of your personal data",
                "Portability: Receive a copy of your data in a readable format",
                "Objection: Object to the use of your data for specific purposes",
              ]).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
            <p className="mt-3">
              {zh
                ? "如需行使上述权利，请联系 support@football2026.net。"
                : "To exercise these rights, please contact support@football2026.net."}
            </p>
          </section>

          {/* ── 8. Children's Privacy ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {zh ? "8. 未成年人保护" : "8. Children's Privacy"}
            </h2>
            <p>
              {zh
                ? "本服务不面向 18 周岁以下的未成年人。如我们发现不满 18 周岁的未成年人创建了账户，我们将立即删除该账户及相关数据。"
                : "The Service is not directed to persons under 18 years of age. If we discover that a minor under 18 has created an account, we will promptly delete that account and associated data."}
            </p>
          </section>

          {/* ── 9. Changes ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {zh ? "9. 政策变更" : "9. Changes to this Policy"}
            </h2>
            <p>
              {zh
                ? "我们可能不时更新本隐私政策。重大变更将通过站内通知告知您。继续使用本服务即视为接受更新后的政策。"
                : "We may update this Privacy Policy from time to time. Material changes will be communicated to you via in-app notifications. Continued use of the Service constitutes acceptance of the updated policy."}
            </p>
          </section>

          {/* ── 10. Contact ── */}
          <section>
            <h2 className="text-xl font-black text-white mb-3">
              {zh ? "10. 联系我们" : "10. Contact Us"}
            </h2>
            <p>
              {zh
                ? "如有关于本隐私政策或数据保护的任何疑问，请联系："
                : "If you have any questions about this Privacy Policy or data protection, please contact:"}
            </p>
            <div className="mt-3 bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4 text-sm">
              <p className="text-[#FFD700] font-bold">Football2026 Data Privacy</p>
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
          <Link href={`/${locale}/terms`} className="hover:text-[#FFD700]">
            {zh ? "服务条款" : "Terms of Service"}
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
