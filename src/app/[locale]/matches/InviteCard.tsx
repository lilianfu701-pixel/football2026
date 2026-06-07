"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MILESTONES, PER_INVITE_GC, nextMilestone, formatGcShort } from "@/lib/inviteMilestones";
import { lc } from "@/i18n/content";

interface Props {
  username: string;
  locale: string;
  baseUrl: string;
  inviteCount?: number;
}

const PLATFORMS = (url: string, text: string) => [
  {
    name: "Facebook",
    emoji: "f",
    bg: "#1877F2",
    href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: "X / Twitter",
    emoji: "𝕏",
    bg: "#000000",
    href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    name: "WhatsApp",
    emoji: "W",
    bg: "#25D366",
    href: `https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`,
  },
  {
    name: "Telegram",
    emoji: "✈",
    bg: "#229ED9",
    href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    name: "LINE",
    emoji: "L",
    bg: "#06C755",
    href: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`,
  },
  {
    name: "Pinterest",
    emoji: "P",
    bg: "#E60023",
    href: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(text)}`,
  },
  {
    name: "Reddit",
    emoji: "R",
    bg: "#FF4500",
    href: `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
  },
  {
    name: "Email",
    emoji: "✉",
    bg: "#EA4335",
    href: `mailto:?subject=${encodeURIComponent("Join Football2026 & Win 20M GC!")}&body=${encodeURIComponent(text + "\n\n" + url)}`,
  },
];

export default function InviteCard({ username, locale, baseUrl, inviteCount = 0 }: Props) {
  const zh = locale === "zh";
  const [copied, setCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);

  // Milestone progress
  const next = nextMilestone(inviteCount);
  const prevCount = next
    ? (MILESTONES.find((m) => m.count < next.count && m.gcBonus > 0)?.count ?? 0)
    : (MILESTONES[MILESTONES.length - 1]?.count ?? 0);
  const segStart  = prevCount;
  const segEnd    = next?.count ?? inviteCount;
  const segPct    = segEnd > segStart
    ? Math.min(100, Math.round(((inviteCount - segStart) / (segEnd - segStart)) * 100))
    : 100;

  const referralUrl = `${baseUrl}/${locale}/auth/register?ref=${username}`;
  const shareText = zh
    ? `🎉 加入 Football2026，免费注册即得 100,000 GC，一起助威世界杯！`
    : `🎉 Join Football2026! Sign up free & get 100,000 GC. Let's predict the World Cup!`;

  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(referralUrl)}&color=FFD700&bgcolor=0F2040&margin=8&qzone=1`;

  async function copyText() {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${referralUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* silent */
    }
  }

  async function saveQr() {
    try {
      const res = await fetch(qrApiUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `goalcoin-invite-${username}.png`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(qrApiUrl, "_blank");
    }
  }

  const platforms = PLATFORMS(referralUrl, shareText);

  return (
    <>
      {/* ── Invite card ── */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-4 pb-3 bg-gradient-to-r from-[#FFD700]/10 to-transparent border-b border-[#1E3A5F]">
          <p className="text-sm font-black text-white">
            🎁 {lc(locale, "邀请朋友，赚取 Goal Coin", "Invite Friends, Earn GC")}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {lc(locale, "每成功邀请一位好友注册，双方均可获得 GC 奖励", "Both you & your friend earn GC when they sign up")}
          </p>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* ── Milestone progress ── */}
          <div className="bg-[#0A1628] rounded-xl p-3.5 space-y-2.5">
            {/* Stats row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-base">👥</span>
                <span className="text-white font-black text-sm">
                  {inviteCount}
                </span>
                <span className="text-gray-500 text-xs">
                  {lc(locale, "人已加入", "invited")}
                </span>
              </div>
              <Link
                href={`/${locale}/invite`}
                className="text-[10px] text-[#FFD700] hover:underline font-semibold"
              >
                {lc(locale, "查看排行榜 →", "Leaderboard →")}
              </Link>
            </div>

            {/* Per-invite reward note */}
            <p className="text-[10px] text-gray-500">
              {zh
                ? `每成功邀请 +${formatGcShort(PER_INVITE_GC)} GC（双方同享）`
                : `Each invite: +${formatGcShort(PER_INVITE_GC)} GC for both`}
            </p>

            {/* Progress bar toward next milestone */}
            {next ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-400">
                    {zh ? `距 ${next.emoji} ${next.labelZh}` : `Toward ${next.emoji} ${next.label}`}
                  </span>
                  <span className="text-gray-400 font-bold">
                    {inviteCount}/{next.count}
                    {next.gcBonus > 0 && (
                      <span className="text-[#FFD700] ml-1">
                        +{formatGcShort(next.gcBonus)}
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2 bg-[#1E3A5F] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#FFD700] to-[#FF8C00] transition-all duration-500"
                    style={{ width: `${segPct}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-purple-400 text-base">👑</span>
                <span className="text-xs text-purple-300 font-bold">
                  {lc(locale, "已达传奇等级！", "Legend status achieved!")}
                </span>
              </div>
            )}

            {/* Milestone dots */}
            <div className="flex items-center gap-1.5 pt-0.5">
              {MILESTONES.filter((m) => m.gcBonus > 0).map((m) => (
                <div key={m.count} className="flex flex-col items-center gap-0.5 flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs
                    ${inviteCount >= m.count
                      ? `${m.bg} ${m.color} ring-1 ring-current`
                      : "bg-[#1E3A5F] text-gray-600"
                    }`}
                  >
                    {m.emoji}
                  </div>
                  <span className={`text-[8px] font-bold ${inviteCount >= m.count ? m.color : "text-gray-600"}`}>
                    {m.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Referral link row */}
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
              {lc(locale, "你的专属邀请链接", "Your referral link")}
            </p>
            <div className="flex items-center gap-2 bg-[#0A1628] border border-[#1E3A5F] rounded-xl px-3 py-2">
              <span className="text-[11px] text-gray-400 truncate flex-1 font-mono">
                {referralUrl.replace(/^https?:\/\//, "")}
              </span>
              <button
                onClick={copyText}
                className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                  copied
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-[#1E3A5F] text-gray-300 hover:text-white hover:bg-[#7C6FE0]/30 border border-[#1E3A5F]"
                }`}
              >
                {copied ? (lc(locale, "✓ 已复制", "✓ Copied")) : (lc(locale, "复制", "Copy"))}
              </button>
            </div>
          </div>

          {/* One-click share text + email */}
          <div className="flex gap-2">
            <button
              onClick={copyText}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#1E3A5F] hover:bg-[#7C6FE0]/30 border border-[#1E3A5F] hover:border-[#7C6FE0]/50 text-gray-300 hover:text-white text-xs font-semibold transition-all"
            >
              <span>📋</span>
              {lc(locale, "复制文本", "Copy Text")}
            </button>
            <a
              href={`mailto:?subject=${encodeURIComponent(lc(locale, "邀请你加入 Football2026！", "Join Football2026 & Win GC!"))}&body=${encodeURIComponent(shareText + "\n\n" + referralUrl)}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#1E3A5F] hover:bg-red-500/20 border border-[#1E3A5F] hover:border-red-500/30 text-gray-300 hover:text-red-400 text-xs font-semibold transition-all"
            >
              <span>📧</span>
              {lc(locale, "发送邮件", "Email")}
            </a>
          </div>

          {/* QR code */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest self-start">
              {lc(locale, "专属邀请二维码", "Your Exclusive QR Code")}
            </p>
            <div className="p-2 bg-[#0A1628] rounded-2xl border border-[#FFD700]/20">
              <Image
                src={qrApiUrl}
                alt="Referral QR"
                width={160}
                height={160}
                className="rounded-xl"
                unoptimized
              />
            </div>
            {/* Share + Save */}
            <div className="flex gap-2 w-full">
              {/* 分享二维码：桌面全宽，移动端与保存并排 */}
              <button
                onClick={() => setShowShare(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#FFD700] hover:bg-[#FFC200] text-[#0A1628] text-xs font-black transition-colors"
              >
                📤 {lc(locale, "分享二维码", "Share QR")}
              </button>
              {/* 保存二维码：仅移动端显示（lg 及以上隐藏） */}
              <button
                onClick={saveQr}
                className="lg:hidden flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#1E3A5F] hover:bg-[#1E3A5F]/80 border border-[#1E3A5F] hover:border-[#7C6FE0]/40 text-gray-300 hover:text-white text-xs font-semibold transition-all"
              >
                💾 {lc(locale, "保存二维码", "Save QR")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Share modal ── */}
      {showShare && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowShare(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative bg-[#0D1E3A] border border-[#1E3A5F] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-5 pt-5 pb-3 border-b border-[#1E3A5F]">
              <h3 className="text-white font-black text-lg">
                📤 {lc(locale, "分享给朋友", "Share with Friends")}
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">
                {lc(locale, "选择分享方式", "Choose how to share")}
              </p>
            </div>

            {/* QR preview */}
            <div className="flex justify-center py-4">
              <Image
                src={qrApiUrl}
                alt="Share QR"
                width={120}
                height={120}
                className="rounded-xl"
                unoptimized
              />
            </div>

            {/* Platform grid */}
            <div className="px-5 pb-4 grid grid-cols-4 gap-3">
              {platforms.map((p) => (
                <a
                  key={p.name}
                  href={p.href}
                  target={p.href.startsWith("mailto") ? "_self" : "_blank"}
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-lg group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: p.bg }}
                  >
                    {p.emoji}
                  </div>
                  <span className="text-[10px] text-gray-400 text-center leading-tight group-hover:text-white transition-colors">
                    {p.name}
                  </span>
                </a>
              ))}

              {/* WeChat: show QR tip */}
              <button
                className="flex flex-col items-center gap-1.5 group"
                onClick={() => {
                  alert(lc(locale, "请截图保存二维码，然后在微信中扫描", "Please screenshot the QR code and scan it in WeChat"));
                }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg group-hover:scale-105 transition-transform bg-[#07C160]">
                  微
                </div>
                <span className="text-[10px] text-gray-400 text-center leading-tight group-hover:text-white transition-colors">
                  WeChat
                </span>
              </button>
            </div>

            {/* Copy row */}
            <div className="px-5 pb-5">
              <button
                onClick={() => { copyText(); setShowShare(false); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1E3A5F] hover:bg-[#7C6FE0]/30 border border-[#1E3A5F] hover:border-[#7C6FE0]/50 text-gray-300 hover:text-white text-sm font-semibold transition-all"
              >
                🔗 {lc(locale, "复制链接", "Copy Link")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
