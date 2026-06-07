import { Resend } from "resend";
import {
  confirmEmailHtml,
  resetPasswordHtml,
  gcAwardedHtml,
  predictionWonHtml,
  levelUpHtml,
  welcomeHtml,
} from "./templates";
import { lc } from "@/i18n/content";

const FROM = "Football2026 <support@mail.football2026.net>";

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

// ── Auth emails (called from Supabase hooks or server actions) ──────────────

export async function sendConfirmEmail(to: string, confirmUrl: string, locale = "zh") {
  const resend = getResend();
  const zh = locale === "zh";
  return resend.emails.send({
    from: FROM,
    to,
    subject: lc(locale, "✅ 激活你的 Football2026 账号", "✅ Confirm your Football2026 account"),
    html: confirmEmailHtml(confirmUrl, locale),
  });
}

export async function sendResetPasswordEmail(to: string, resetUrl: string, locale = "zh") {
  const resend = getResend();
  const zh = locale === "zh";
  return resend.emails.send({
    from: FROM,
    to,
    subject: lc(locale, "🔑 Football2026 密码重置", "🔑 Football2026 Password Reset"),
    html: resetPasswordHtml(resetUrl, locale),
  });
}

// ── Welcome email (after email confirmed) ──────────────────────────────────

export async function sendWelcomeEmail(to: string, nickname: string, locale = "zh") {
  const resend = getResend();
  const zh = locale === "zh";
  return resend.emails.send({
    from: FROM,
    to,
    subject: lc(locale, "👋 欢迎加入 Football2026！", "👋 Welcome to Football2026!"),
    html: welcomeHtml({ nickname, locale }),
  });
}

// ── GC award notification ───────────────────────────────────────────────────

export async function sendGcAwardedEmail(opts: {
  to: string;
  nickname: string;
  amount: number;
  newBalance: number;
  reason: string;
  locale?: string;
}) {
  const resend = getResend();
  const zh = (opts.locale ?? "zh") === "zh";
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: zh
      ? `🪙 你获得了 ${opts.amount >= 1_000_000 ? (opts.amount / 1_000_000).toFixed(2) + "M" : opts.amount.toLocaleString()} GC！`
      : `🪙 You received GoalCoins!`,
    html: gcAwardedHtml(opts),
  });
}

// ── Prediction won notification ─────────────────────────────────────────────

export async function sendPredictionWonEmail(opts: {
  to: string;
  nickname: string;
  matchTitle: string;
  prediction: string;
  gcWon: number;
  locale?: string;
}) {
  const resend = getResend();
  const locale = opts.locale ?? "zh";
  const zh = locale === "zh";
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: lc(locale, "🎉 预测命中，GC 到账！", "🎉 Prediction Won — GC Awarded!"),
    html: predictionWonHtml(opts),
  });
}

// ── Level-up notification ───────────────────────────────────────────────────

export async function sendLevelUpEmail(opts: {
  to: string;
  nickname: string;
  newLevel: number;
  levelName: string;
  locale?: string;
}) {
  const resend = getResend();
  const zh = (opts.locale ?? "zh") === "zh";
  return resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: zh ? `⬆️ 恭喜升至 Lv.${opts.newLevel}！` : `⬆️ You reached Level ${opts.newLevel}!`,
    html: levelUpHtml(opts),
  });
}

// ── Batch: send to multiple users (chunks of 50) ───────────────────────────

export async function sendBatch(
  emails: Array<{
    from?: string;
    to: string;
    subject: string;
    html: string;
  }>
) {
  const resend = getResend();
  const chunks: typeof emails[] = [];
  for (let i = 0; i < emails.length; i += 50) {
    chunks.push(emails.slice(i, i + 50));
  }
  const results = [];
  for (const chunk of chunks) {
    const batch = chunk.map((e) => ({ ...e, from: e.from ?? FROM }));
    results.push(await resend.batch.send(batch));
  }
  return results;
}
