/** Shared HTML email templates for Football2026.net */

const BASE_URL = "https://football2026.net";

const STYLES = `
  body { margin:0; padding:0; background:#0A1628; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#e2e8f0; }
  .wrap { max-width:560px; margin:0 auto; padding:40px 20px; }
  .logo { text-align:center; margin-bottom:32px; }
  .logo a { color:#FFD700; font-size:22px; font-weight:900; text-decoration:none; }
  .card { background:#0F2040; border:1px solid #1E3A5F; border-radius:16px; padding:32px; }
  .title { font-size:22px; font-weight:800; color:#ffffff; margin:0 0 8px; }
  .sub { font-size:14px; color:#94a3b8; margin:0 0 24px; }
  .btn { display:inline-block; background:#FFD700; color:#0A1628; font-weight:900; font-size:14px; padding:14px 28px; border-radius:12px; text-decoration:none; margin:8px 0; }
  .divider { border:none; border-top:1px solid #1E3A5F; margin:24px 0; }
  .note { font-size:12px; color:#475569; line-height:1.6; }
  .badge { display:inline-block; background:#FFD700; color:#0A1628; font-weight:900; font-size:18px; padding:8px 20px; border-radius:8px; margin:16px 0; }
  .footer { text-align:center; margin-top:24px; font-size:11px; color:#334155; }
  .footer a { color:#475569; text-decoration:none; }
`;

function shell(body: string): string {
  return `<!DOCTYPE html>
<html lang="zh">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>${STYLES}</style></head>
<body>
<div class="wrap">
  <div class="logo"><a href="${BASE_URL}">⚽ Football2026</a></div>
  <div class="card">${body}</div>
  <div class="footer">
    <p>© 2026 Football2026.net · <a href="${BASE_URL}/zh/auth/unsubscribe">退订</a> · <a href="${BASE_URL}/unsubscribe">Unsubscribe</a></p>
  </div>
</div>
</body></html>`;
}

// ── Auth: email confirmation ────────────────────────────────────────────────

export function confirmEmailHtml(confirmUrl: string, locale = "zh"): string {
  const zh = locale === "zh";
  return shell(`
    <h1 class="title">${zh ? "✅ 确认你的邮箱" : "✅ Confirm your email"}</h1>
    <p class="sub">${zh ? "感谢注册 Football2026！点击下方按钮激活账号。" : "Thanks for signing up! Click below to activate your account."}</p>
    <a href="${confirmUrl}" class="btn">${zh ? "激活账号" : "Activate Account"}</a>
    <hr class="divider">
    <p class="note">${zh ? "此链接 24 小时内有效。如果不是你注册的，请忽略此邮件。" : "This link expires in 24 hours. If you didn't register, please ignore this email."}</p>
  `);
}

// ── Auth: password reset ────────────────────────────────────────────────────

export function resetPasswordHtml(resetUrl: string, locale = "zh"): string {
  const zh = locale === "zh";
  return shell(`
    <h1 class="title">${zh ? "🔑 重置密码" : "🔑 Reset your password"}</h1>
    <p class="sub">${zh ? "我们收到了你的密码重置请求，点击下方按钮设置新密码。" : "We received a password reset request. Click below to set a new password."}</p>
    <a href="${resetUrl}" class="btn">${zh ? "重置密码" : "Reset Password"}</a>
    <hr class="divider">
    <p class="note">${zh ? "此链接 1 小时内有效。如果不是你发起的，请忽略此邮件，你的账号是安全的。" : "This link expires in 1 hour. If you didn't request this, your account is safe."}</p>
  `);
}

// ── Notification: GC awarded ────────────────────────────────────────────────

export function gcAwardedHtml(opts: {
  nickname: string;
  amount: number;
  newBalance: number;
  reason: string;
  locale?: string;
}): string {
  const zh = (opts.locale ?? "zh") === "zh";
  const fmt = (n: number) =>
    n >= 1_000_000 ? (n / 1_000_000).toFixed(2) + "M" : n.toLocaleString();
  return shell(`
    <h1 class="title">${zh ? "🪙 GoalCoin 到账啦！" : "🪙 GoalCoins Received!"}</h1>
    <p class="sub">${zh ? `嗨 ${opts.nickname}，你获得了新的 GC：` : `Hi ${opts.nickname}, you received new GC:`}</p>
    <div class="badge">+${fmt(opts.amount)} GC</div>
    <p style="font-size:13px;color:#94a3b8;margin:4px 0 20px;">
      ${zh ? "原因：" : "Reason: "}${opts.reason}
    </p>
    <p style="font-size:13px;color:#64748b;">
      ${zh ? `当前余额：<strong style="color:#FFD700">${fmt(opts.newBalance)} GC</strong>` : `Current balance: <strong style="color:#FFD700">${fmt(opts.newBalance)} GC</strong>`}
    </p>
    <hr class="divider">
    <a href="${BASE_URL}/zh/profile" class="btn" style="font-size:13px;padding:10px 20px;">${zh ? "查看账户" : "View Account"}</a>
  `);
}

// ── Notification: prediction won ───────────────────────────────────────────

export function predictionWonHtml(opts: {
  nickname: string;
  matchTitle: string;
  prediction: string;
  gcWon: number;
  locale?: string;
}): string {
  const zh = (opts.locale ?? "zh") === "zh";
  const fmt = (n: number) =>
    n >= 1_000_000 ? (n / 1_000_000).toFixed(2) + "M" : n.toLocaleString();
  return shell(`
    <h1 class="title">${zh ? "🎉 预测命中！" : "🎉 Prediction Won!"}</h1>
    <p class="sub">${zh ? `嗨 ${opts.nickname}，你的预测命中了：` : `Hi ${opts.nickname}, your prediction was correct:`}</p>
    <p style="font-size:15px;font-weight:700;color:#fff;margin:0 0 4px;">${opts.matchTitle}</p>
    <p style="font-size:13px;color:#94a3b8;margin:0 0 16px;">${zh ? "你的预测：" : "Your prediction: "}<strong style="color:#FFD700">${opts.prediction}</strong></p>
    <div class="badge">+${fmt(opts.gcWon)} GC</div>
    <hr class="divider">
    <a href="${BASE_URL}/zh/predict" class="btn" style="font-size:13px;padding:10px 20px;">${zh ? "继续预测" : "Keep Predicting"}</a>
  `);
}

// ── Notification: level up ──────────────────────────────────────────────────

export function levelUpHtml(opts: {
  nickname: string;
  newLevel: number;
  levelName: string;
  locale?: string;
}): string {
  const zh = (opts.locale ?? "zh") === "zh";
  return shell(`
    <h1 class="title">${zh ? "⬆️ 恭喜升级！" : "⬆️ Level Up!"}</h1>
    <p class="sub">${zh ? `嗨 ${opts.nickname}，你已升至新等级：` : `Hi ${opts.nickname}, you've reached a new level:`}</p>
    <div class="badge">Lv.${opts.newLevel} · ${opts.levelName}</div>
    <p style="font-size:13px;color:#94a3b8;margin:16px 0;">${zh ? "继续预测和参与活动，解锁更多特权！" : "Keep predicting and participating to unlock more perks!"}</p>
    <hr class="divider">
    <a href="${BASE_URL}/zh/profile" class="btn" style="font-size:13px;padding:10px 20px;">${zh ? "查看等级" : "View Level"}</a>
  `);
}

// ── Notification: welcome ───────────────────────────────────────────────────

export function welcomeHtml(opts: { nickname: string; locale?: string }): string {
  const zh = (opts.locale ?? "zh") === "zh";
  return shell(`
    <h1 class="title">${zh ? "👋 欢迎加入 Football2026！" : "👋 Welcome to Football2026!"}</h1>
    <p class="sub">${zh ? `嗨 ${opts.nickname}！账号已激活，免费领取 10,000 GC 开始你的预测之旅。` : `Hi ${opts.nickname}! Your account is ready. Claim 10,000 free GC and start predicting.`}</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin:20px 0;">
      <a href="${BASE_URL}/zh/matches" class="btn">⚽ ${zh ? "查看赛事" : "Browse Matches"}</a>
      <a href="${BASE_URL}/zh/predict" class="btn" style="background:#1E3A5F;color:#FFD700;">🎯 ${zh ? "开始预测" : "Start Predicting"}</a>
    </div>
    <hr class="divider">
    <p class="note">${zh ? "每日签到可领取 GC，邀请好友还有额外奖励。" : "Check in daily for GC rewards, and earn bonuses by inviting friends."}</p>
  `);
}
