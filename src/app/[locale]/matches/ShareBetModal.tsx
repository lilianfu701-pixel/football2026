"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { formatGc } from "@/lib/levels";
import { getFlagCode } from "@/lib/flags";

export type BetPick = "home" | "draw" | "away";

export interface ShareBetProps {
  locale: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamZh?: string;
  awayTeamZh?: string;
  pick: BetPick;
  gcAmount: number;
  odds: number;
  username: string;
  stageLabel?: string;
  onClose: () => void;
}

const PLATFORMS = (url: string, text: string) => [
  {
    name: "X",        bg: "#000000", emoji: "𝕏",
    href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    name: "WhatsApp", bg: "#25D366", emoji: "W",
    href: `https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`,
  },
  {
    name: "Telegram", bg: "#229ED9", emoji: "✈",
    href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    name: "Facebook", bg: "#1877F2", emoji: "f",
    href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: "Reddit",   bg: "#FF4500", emoji: "R",
    href: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
  },
  {
    name: "LINE",     bg: "#06C755", emoji: "L",
    href: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`,
  },
  {
    name: "微博",     bg: "#E6162D", emoji: "微",
    href: `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
  },
  {
    name: "Email",    bg: "#6B7280", emoji: "✉",
    href: `mailto:?subject=${encodeURIComponent("Football2026 竞猜")}&body=${encodeURIComponent(text + "\n\n" + url)}`,
  },
];

export default function ShareBetModal({
  locale, matchId, homeTeam, awayTeam, homeTeamZh, awayTeamZh,
  pick, gcAmount, odds, username, stageLabel, onClose,
}: ShareBetProps) {
  const zh = locale === "zh";
  const [copied, setCopied] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [sharing, setSharing] = useState(false);

  const hc = getFlagCode(homeTeam);
  const ac = getFlagCode(awayTeam);

  // OG card image — now includes QR code + match_id in the image itself
  const ogParams = new URLSearchParams({
    home:     homeTeamZh && zh ? homeTeamZh : homeTeam,
    away:     awayTeamZh && zh ? awayTeamZh : awayTeam,
    hc, ac, pick,
    gc:       String(gcAmount),
    odds:     String(odds),
    user:     username,
    locale,
    match_id: matchId,
    ...(stageLabel ? { stage: stageLabel } : {}),
  });
  const ogImageUrl = `/api/og/share-bet?${ogParams.toString()}`;

  // Match page URL (for QR target and copy-link)
  const shareUrl = typeof window !== "undefined"
    ? window.location.href
    : `https://football2026.net/${locale}/matches/${matchId}`;

  // Dedicated share page URL (OG-tagged, used by Facebook / Twitter / etc.)
  const shareBetParams = new URLSearchParams({
    home:     homeTeamZh && zh ? homeTeamZh : homeTeam,
    away:     awayTeamZh && zh ? awayTeamZh : awayTeam,
    hc: getFlagCode(homeTeam),
    ac: getFlagCode(awayTeam),
    pick,
    gc:       String(gcAmount),
    odds:     String(odds),
    user:     username,
    locale,
    match_id: matchId,
    ...(stageLabel ? { stage: stageLabel } : {}),
  });
  const shareBetUrl = `https://football2026.net/${locale}/share/bet?${shareBetParams.toString()}`;

  // Share text
  const pickDisplay = {
    home: zh ? `${homeTeamZh ?? homeTeam} 胜` : `${homeTeam} Win`,
    draw: zh ? "平局" : "Draw",
    away: zh ? `${awayTeamZh ?? awayTeam} 胜` : `${awayTeam} Win`,
  }[pick];

  const shareText = zh
    ? `🏆 我在 Football2026 押了 ${homeTeamZh ?? homeTeam} vs ${awayTeamZh ?? awayTeam}！预测：${pickDisplay}，押注 ${formatGc(gcAmount)} GC，扫码参与竞猜！`
    : `🏆 I just predicted ${homeTeam} vs ${awayTeam} on Football2026! Pick: ${pickDisplay} · ${formatGc(gcAmount)} GC staked. Scan the QR to join!`;

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  // Download the card image (OG image with QR embedded)
  async function downloadCard() {
    try {
      const res  = await fetch(ogImageUrl);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `football2026-prediction-${homeTeam}-vs-${awayTeam}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(ogImageUrl, "_blank");
    }
  }

  // One-click native share: sends the full card image (which has QR embedded)
  // Works on mobile — opens system share sheet → pick Telegram/WhatsApp/etc. → sends image
  async function nativeShare() {
    setSharing(true);
    try {
      const res  = await fetch(ogImageUrl);
      const blob = await res.blob();
      const file = new File([blob], "football2026-prediction.png", { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        // Share the image file — recipient gets the card with QR code
        await navigator.share({
          files: [file],
          title: "Football2026 Prediction",
          text:  shareText,
        });
      } else {
        // Fallback: share link + text (no image)
        await navigator.share({
          title: "Football2026 Prediction",
          text:  shareText,
          url:   shareBetUrl,
        });
      }
    } catch { /* user cancelled */ }
    setSharing(false);
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  }

  // Platform links use shareBetUrl (og:image = prediction card)
  const platforms = PLATFORMS(shareBetUrl, shareText);

  return (
    <div
      className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div
        className="relative bg-[#0D1E3A] border border-[#1E3A5F] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-[#1E3A5F] flex items-center justify-between">
          <div>
            <h3 className="text-white font-black text-lg">
              📤 {zh ? "分享我的预测" : "Share My Prediction"}
            </h3>
            <p className="text-gray-500 text-xs mt-0.5">
              {zh ? "卡片内已含二维码，一张图分享全部！" : "QR code is embedded in the card — one image, everything included!"}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors text-xl leading-none">✕</button>
        </div>

        {/* Card preview */}
        <div className="px-5 pt-4 pb-3">
          <div className={`rounded-xl overflow-hidden border border-[#1E3A5F] bg-[#0A1628] relative ${!imgLoaded ? "h-44 flex items-center justify-center" : ""}`}>
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#FFD700]/30 border-t-[#FFD700] rounded-full animate-spin" />
              </div>
            )}
            <Image
              src={ogImageUrl}
              alt="Share card"
              width={1200}
              height={630}
              className={`w-full h-auto transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImgLoaded(true)}
              unoptimized
            />
          </div>
          <p className="text-[10px] text-gray-600 mt-1.5 text-center">
            {zh ? "右下角二维码可扫码直达比赛页面" : "QR code in the bottom-right links directly to the match"}
          </p>
        </div>

        {/* Action buttons */}
        <div className="px-5 pb-3 space-y-2.5">

          {/* Primary: one-click share image (mobile) */}
          {canNativeShare && (
            <button
              onClick={nativeShare}
              disabled={sharing || !imgLoaded}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FFD700] text-[#0A1628] font-black text-sm hover:bg-[#FFC200] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sharing
                ? <span className="inline-block w-4 h-4 border-2 border-[#0A1628]/30 border-t-[#0A1628] rounded-full animate-spin" />
                : "📲"}
              {sharing
                ? (zh ? "分享中…" : "Sharing…")
                : (zh ? "一键分享图片（含二维码）" : "Share Image with QR Code")}
            </button>
          )}

          {/* Secondary: save + copy */}
          <div className="flex gap-2">
            <button
              onClick={downloadCard}
              disabled={!imgLoaded}
              className="flex-[2] flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#1E3A5F] hover:bg-[#7C6FE0]/30 border border-[#1E3A5F] hover:border-[#7C6FE0]/50 text-gray-300 hover:text-white text-sm font-bold transition-all disabled:opacity-40"
            >
              💾 {zh ? "保存图片" : "Save Image"}
            </button>
            <button
              onClick={copyText}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                copied
                  ? "bg-green-500/15 border-green-500/30 text-green-400"
                  : "bg-[#1E3A5F] border-[#1E3A5F] hover:border-[#7C6FE0]/50 text-gray-300 hover:text-white"
              }`}
            >
              {copied ? `✓ ${zh ? "已复制" : "Copied"}` : `🔗 ${zh ? "复制链接" : "Copy Link"}`}
            </button>
          </div>

          {/* Platform grid */}
          <div className="grid grid-cols-5 gap-2 pt-1">
            {platforms.map((p) => (
              <a
                key={p.name}
                href={p.href}
                target={p.href.startsWith("mailto") ? "_self" : "_blank"}
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 group"
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-base font-black shadow-lg group-hover:scale-105 transition-transform"
                  style={{ backgroundColor: p.bg }}
                >
                  {p.emoji}
                </div>
                <span className="text-[10px] text-gray-500 group-hover:text-white transition-colors text-center leading-tight">
                  {p.name}
                </span>
              </a>
            ))}

            {/* WeChat: screenshot hint */}
            <button
              className="flex flex-col items-center gap-1 group"
              onClick={() => alert(zh
                ? "请长按图片保存，然后在微信中发送"
                : "Long press the image to save, then share in WeChat")}
            >
              <div className="w-11 h-11 rounded-2xl bg-[#07C160] flex items-center justify-center text-white text-base font-black shadow-lg group-hover:scale-105 transition-transform">
                微
              </div>
              <span className="text-[10px] text-gray-500 group-hover:text-white transition-colors">微信</span>
            </button>
          </div>
        </div>

        {/* Invite nudge */}
        <div className="mx-5 mb-5 bg-[#FFD700]/8 border border-[#FFD700]/20 rounded-xl px-4 py-2.5 flex items-center gap-2.5">
          <span className="text-base shrink-0">🎁</span>
          <p className="text-xs text-gray-400 leading-snug">
            {zh
              ? "邀请朋友注册，双方各得 500,000 GC 奖励！"
              : "Invite friends to sign up — both get 500,000 GC!"}
          </p>
        </div>
      </div>
    </div>
  );
}
