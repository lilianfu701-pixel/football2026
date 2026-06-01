"use client";

import { useEffect, useState } from "react";
import { Check, Download, MoreVertical, X } from "lucide-react";

type Platform = "ios" | "android" | "other";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

interface MobileInstallPromptProps {
  locale: string;
  force?: boolean;
  allowDismiss?: boolean;
}

const MOBILE_URL = "https://m.football2026.net/zh/m";
const QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(MOBILE_URL)}`;

const copy = {
  zh: {
    title: "添加 Football2026 到桌面",
    subtitle: "添加完成后，下次直接点击手机桌面图标进入竞猜。",
    installed: "已通过桌面快捷方式打开",
    install: "一键安装",
    later: "稍后",
    scanTitle: "扫码打开",
    scanHint: "使用手机相机扫描二维码，或在 Safari 中输入网址。",
    iosTitle: "iPhone 添加步骤",
    androidTitle: "Android 快捷安装",
    androidManual: "如果没有弹出安装窗口，请点击浏览器菜单，再选择“安装应用”或“添加到主屏幕”。",
    otherTitle: "添加快捷方式",
    otherManual: "请在浏览器菜单中选择“安装应用”或“添加到主屏幕”。",
    footer: "网页版本功能已精简，请优先添加桌面快捷方式。",
    steps: [
      "使用 Safari 浏览器打开网址",
      "点击屏幕底部的分享按钮",
      "在菜单中选择“添加到主屏幕”",
      "点击右上角“添加”，桌面将出现图标",
    ],
  },
  en: {
    title: "Add Football2026 to Home Screen",
    subtitle: "Open predictions directly from your phone icon next time.",
    installed: "Opened from your shortcut",
    install: "Install",
    later: "Later",
    scanTitle: "Scan to open",
    scanHint: "Scan this QR code with your phone camera, or enter the URL in Safari.",
    iosTitle: "iPhone setup",
    androidTitle: "Android quick install",
    androidManual: "If no install window appears, open the browser menu and choose Install app or Add to Home screen.",
    otherTitle: "Create a shortcut",
    otherManual: "Use your browser menu and choose Install app or Add to Home screen.",
    footer: "The browser version is simplified. Add the shortcut for the full experience.",
    steps: [
      "Open the URL in Safari",
      "Tap the Share button at the bottom",
      "Choose Add to Home Screen",
      "Tap Add. The icon will appear on your Home Screen",
    ],
  },
};

const stepImages = [
  "/mobile-install/safari.jpg",
  "/mobile-install/share.jpg",
  "/mobile-install/add-to-home.jpg",
  "/mobile-install/confirm-add.jpg",
];

function getCopy(locale: string) {
  return locale === "zh" ? copy.zh : copy.en;
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() ?? "";
  const touchMac = platform.includes("mac") && navigator.maxTouchPoints > 1;

  if (/iphone|ipad|ipod/.test(ua) || touchMac) return "ios";
  if (ua.includes("android")) return "android";
  return "other";
}

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}

export default function MobileInstallPrompt({
  locale,
  force = false,
  allowDismiss = true,
}: MobileInstallPromptProps) {
  const t = getCopy(locale);
  const [platform, setPlatform] = useState<Platform>("other");
  const [dismissed, setDismissed] = useState(true);
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandaloneMode());
    setDismissed(localStorage.getItem("football2026-install-dismissed-v2") === "1");

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setDismissed(false);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      localStorage.setItem("football2026-install-dismissed-v2", "1");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.setItem("football2026-install-dismissed-v2", "1");
      setDismissed(true);
    }
    setDeferredPrompt(null);
  }

  function close() {
    localStorage.setItem("football2026-install-dismissed-v2", "1");
    setDismissed(true);
  }

  if (installed) {
    return (
      <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[15px] font-bold text-emerald-100">
        <span className="inline-flex items-center gap-2">
          <Check className="h-4 w-4" />
          {t.installed}
        </span>
      </div>
    );
  }

  if (!force && dismissed && !deferredPrompt) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-[#FFD700]/55 bg-[#101b2d] shadow-xl shadow-[#FFD700]/10">
      <div className="border-b border-white/10 bg-[linear-gradient(135deg,#172c4d_0%,#112239_56%,#173528_100%)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-black leading-6 text-white">{t.title}</p>
            <p className="mt-1 text-[14px] leading-5 text-slate-300">{t.subtitle}</p>
          </div>
          {allowDismiss && (
            <button
              type="button"
              onClick={close}
              className="rounded-md p-1 text-slate-500 transition hover:bg-white/10 hover:text-white"
              aria-label={t.later}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-[7rem_1fr] items-center gap-3 rounded-lg border border-[#FFD700]/25 bg-black/25 p-2.5">
          <img src={QR_URL} alt={t.scanTitle} className="aspect-square w-28 rounded-md bg-white p-1" />
          <div className="min-w-0">
            <p className="text-[15px] font-black text-[#FFD700]">{t.scanTitle}</p>
            <p className="mt-1 text-[13px] leading-4 text-slate-300">{t.scanHint}</p>
            <p className="mt-2 break-all text-[12px] font-bold leading-4 text-white">{MOBILE_URL}</p>
          </div>
        </div>
      </div>

      {platform === "android" ? (
        <div className="grid gap-3 p-3">
          <p className="text-[15px] font-black text-[#FFD700]">{t.androidTitle}</p>
          {deferredPrompt && (
            <button
              type="button"
              onClick={install}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#FFD700] px-4 text-[15px] font-black text-[#081120]"
            >
              <Download className="h-4 w-4" />
              {t.install}
            </button>
          )}
          <p className="flex gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-[14px] leading-5 text-slate-200">
            <MoreVertical className="mt-0.5 h-4 w-4 shrink-0 text-[#FFD700]" />
            {t.androidManual}
          </p>
        </div>
      ) : (
        <div className="grid gap-2.5 p-3">
          <p className="text-[15px] font-black uppercase text-[#FFD700]">{t.iosTitle}</p>
          {t.steps.map((step, index) => (
            <article key={step} className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.045]">
              <div className="flex items-center gap-2 border-b border-white/10 px-2.5 py-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFD700] text-[13px] font-black text-[#081120]">
                  {index + 1}
                </span>
                <p className="text-[14px] font-bold leading-5 text-white">{step}</p>
              </div>
              <img
                src={stepImages[index]}
                alt={step}
                className={index === 0 ? "mx-auto block h-20 w-20 bg-white object-contain" : "block h-auto w-full bg-white object-contain"}
              />
            </article>
          ))}
        </div>
      )}

      <p className="border-t border-white/10 bg-[#2b1722] px-3 py-2.5 text-center text-[13px] leading-4 text-rose-100">
        {t.footer}
      </p>
    </section>
  );
}
