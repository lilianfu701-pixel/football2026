"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { SHARE_LABELS } from "@/lib/languages";
import { useGcBalance } from "@/context/GcBalance";
import { lc } from "@/i18n/content";

interface Props {
  title:            string;
  translatedTitle?: string | null;
  postId?:          number;          // kept for backward compat (ignored — URL comes from window)
  locale:           string;
  zh?:              boolean;
  username?:        string | null;   // logged-in user's username → appended as ?ref=
}

// ── Platform definitions ──────────────────────────────────────────────────────
type PlatformDef = {
  id:    string;
  label: string;
  icon:  string;
  bg:    string;
  href:  (url: string, text: string) => string;
};

const PLATFORMS: PlatformDef[] = [
  {
    id: "x", label: "X (Twitter)", icon: "𝕏",
    bg: "hover:bg-white/5 hover:border-white/25 hover:text-white",
    href: (u, t) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}`,
  },
  {
    id: "telegram", label: "Telegram", icon: "✈️",
    bg: "hover:bg-[#229ED9]/20 hover:border-[#229ED9]/50 hover:text-[#229ED9]",
    href: (u, t) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
  },
  {
    id: "whatsapp", label: "WhatsApp", icon: "📱",
    bg: "hover:bg-[#25D366]/20 hover:border-[#25D366]/50 hover:text-[#25D366]",
    href: (u, t) => `https://wa.me/?text=${encodeURIComponent(`${t} ${u}`)}`,
  },
  {
    id: "facebook", label: "Facebook", icon: "f",
    bg: "hover:bg-[#1877F2]/20 hover:border-[#1877F2]/50 hover:text-[#1877F2]",
    href: (u)    => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
  },
  {
    id: "weibo", label: "微博", icon: "微",
    bg: "hover:bg-[#E6162D]/20 hover:border-[#E6162D]/50 hover:text-[#E6162D]",
    href: (u, t) => `https://service.weibo.com/share/share.php?url=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}`,
  },
  {
    id: "qq", label: "QQ", icon: "🐧",
    bg: "hover:bg-[#12B7F5]/20 hover:border-[#12B7F5]/50 hover:text-[#12B7F5]",
    href: (u, t) => `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}`,
  },
  {
    id: "linkedin", label: "LinkedIn", icon: "in",
    bg: "hover:bg-[#0A66C2]/20 hover:border-[#0A66C2]/50 hover:text-[#0A66C2]",
    href: (u)    => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`,
  },
  {
    id: "reddit", label: "Reddit", icon: "👾",
    bg: "hover:bg-[#FF4500]/20 hover:border-[#FF4500]/50 hover:text-[#FF4500]",
    href: (u, t) => `https://reddit.com/submit?url=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}`,
  },
  {
    id: "bluesky", label: "Bluesky", icon: "🦋",
    bg: "hover:bg-[#0085FF]/20 hover:border-[#0085FF]/50 hover:text-[#0085FF]",
    href: (u, t) => `https://bsky.app/intent/compose?text=${encodeURIComponent(`${t} ${u}`)}`,
  },
  {
    id: "threads", label: "Threads", icon: "@",
    bg: "hover:bg-white/8 hover:border-white/25 hover:text-white",
    href: (u, t) => `https://www.threads.net/intent/post?text=${encodeURIComponent(`${t} ${u}`)}`,
  },
  {
    id: "line", label: "LINE", icon: "💚",
    bg: "hover:bg-[#06C755]/20 hover:border-[#06C755]/50 hover:text-[#06C755]",
    href: (u, t) => `https://line.me/R/msg/text/?${encodeURIComponent(`${t} ${u}`)}`,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function ShareButtons({ title, translatedTitle, locale, zh, username }: Props) {
  const [copied,     setCopied]     = useState(false);
  const [canNative,  setCanNative]  = useState(false);
  const [showQr,     setShowQr]     = useState(false);
  const [shareUrl,   setShareUrl]   = useState("");
  const [gcToast,    setGcToast]    = useState<string | null>(null); // e.g. "+1M GC!"
  const [rewardDone, setRewardDone] = useState(false); // true once daily limit is known
  const { balance: gcBalance, setBalance: setGcBalance } = useGcBalance();

  // Build share URL after hydration: current page + ?ref=username
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("ref");
    if (username) url.searchParams.set("ref", username);
    setShareUrl(url.toString());
    setCanNative(!!navigator.share);
  }, [username]);

  // ── Reward helper — call once per share action ────────────────────────────
  const triggerReward = useCallback(async (url: string) => {
    if (rewardDone) return; // already hit daily cap this session
    try {
      const res = await fetch("/api/share/reward", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ shareUrl: url }),
      });
      if (!res.ok) return;
      const { awarded, remaining } = await res.json();
      if (awarded > 0) {
        const label = awarded >= 1_000_000
          ? `+${(awarded / 1_000_000).toFixed(0)}M GC 🎁`
          : `+${awarded.toLocaleString()} GC 🎁`;
        setGcToast(label);
        setTimeout(() => setGcToast(null), 3000);
        // Update shared balance context immediately
        setGcBalance(gcBalance + awarded);
      }
      if (remaining === 0) setRewardDone(true);
    } catch { /* silent — don't block share */ }
  }, [rewardDone]);

  // ── Share text ────────────────────────────────────────────────────────────
  const shareTitle = translatedTitle || title;
  const forumLabel = SHARE_LABELS[locale]?.forum ?? SHARE_LABELS["en"].forum;
  const shareText  = `${shareTitle} — ${forumLabel}`;

  function getUrl() { return shareUrl || window.location.href; }

  async function handleNative() {
    if (!navigator.share) return;
    const url = getUrl();
    try {
      await navigator.share({ title: shareText, url });
      triggerReward(url);
    } catch { /* user cancelled — ignore */ }
  }

  function openPlatform(p: PlatformDef) {
    const url = getUrl();
    window.open(
      p.href(url, shareText),
      "_blank",
      "width=640,height=480,noopener,noreferrer",
    );
    triggerReward(url);
  }

  async function handleCopy() {
    const url = getUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      prompt(lc(locale, "复制链接：", "Copy link:"), url);
    }
    triggerReward(url);
  }

  // QR uses share URL (with ref already embedded)
  const qrSrc = shareUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&bgcolor=0B1A30&color=FFD700&data=${encodeURIComponent(shareUrl)}`
    : "";

  const btn =
    "flex items-center justify-center w-9 h-9 rounded-xl border border-[#1E3A5F] " +
    "text-base font-bold text-gray-400 transition-all duration-150 shrink-0";

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Reward hint / toast */}
      {gcToast ? (
        <span className="text-[11px] font-black text-green-400 bg-green-500/10 border border-green-500/25 px-2 py-1 rounded-lg shrink-0 whitespace-nowrap animate-pulse">
          {gcToast}
        </span>
      ) : (
        <span className="text-[11px] font-bold text-[#FFD700]/80 bg-[#FFD700]/8 border border-[#FFD700]/20 px-2 py-1 rounded-lg shrink-0 whitespace-nowrap">
          🎁 {lc(locale, "分享得 1M GC", "Share +1M GC")}
        </span>
      )}

      {/* Native share — mobile only */}
      {canNative && (
        <button
          onClick={handleNative}
          title={lc(locale, "系统一键分享（含微信）", "Share via system (incl. WeChat)")}
          className={`${btn} hover:bg-[#FFD700]/15 hover:border-[#FFD700]/40 hover:text-[#FFD700]`}
        >
          📤
        </button>
      )}

      {/* WeChat via QR */}
      <div className="relative">
        <button
          onClick={() => setShowQr((v) => !v)}
          title={lc(locale, "微信扫码分享", "WeChat — Scan QR")}
          className={`${btn} ${
            showQr
              ? "bg-[#07C160]/20 border-[#07C160]/50 text-[#07C160]"
              : "hover:bg-[#07C160]/20 hover:border-[#07C160]/50 hover:text-[#07C160]"
          }`}
        >
          <span className="text-base leading-none">💬</span>
        </button>

        {showQr && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowQr(false)} />
            <div className="absolute left-0 bottom-full mb-2 z-50
                            bg-[#0B1A30] border border-[#07C160]/40
                            rounded-2xl p-3.5 shadow-2xl shadow-black/70
                            flex flex-col items-center gap-2.5 w-[204px]">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-[#07C160]">💬</span>
                <p className="text-[11px] font-black text-[#07C160] uppercase tracking-wider">
                  {lc(locale, "微信扫码分享", "WeChat Share")}
                </p>
              </div>
              {qrSrc ? (
                <Image
                  src={qrSrc}
                  alt="WeChat QR"
                  width={164}
                  height={164}
                  className="rounded-xl border border-[#1E3A5F]"
                  unoptimized
                />
              ) : (
                <div className="w-[164px] h-[164px] rounded-xl bg-[#080F1F]
                                flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-[#07C160]
                                  border-t-transparent animate-spin" />
                </div>
              )}
              <p className="text-[10px] text-gray-500 text-center leading-relaxed">
                {lc(locale, "打开微信 → 发现 → 扫一扫", "WeChat → Discover → Scan QR")}
              </p>
              {username && (
                <p className="text-[9px] text-[#FFD700]/50 text-center">
                  {zh ? `已夹带你的推荐码 @${username}` : `Ref code @${username} included`}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* All other platforms */}
      {PLATFORMS.map((p) => (
        <button
          key={p.id}
          onClick={() => openPlatform(p)}
          title={p.label}
          className={`${btn} ${p.bg} text-sm`}
        >
          {p.icon}
        </button>
      ))}

      {/* Copy link */}
      <button
        onClick={handleCopy}
        title={lc(locale, "复制链接", "Copy link")}
        className={`${btn} ${
          copied
            ? "bg-green-500/15 border-green-500/40 text-green-400"
            : "hover:bg-[#1E3A5F]/60 hover:text-white"
        }`}
      >
        {copied ? "✓" : "🔗"}
      </button>

      {copied && !gcToast && (
        <span className="text-xs text-green-400 font-bold animate-pulse">
          {lc(locale, "已复制！", "Copied!")}
        </span>
      )}
    </div>
  );
}
