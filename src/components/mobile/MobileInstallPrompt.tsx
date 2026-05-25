"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Download, MoreVertical, Plus, Share, Smartphone, X } from "lucide-react";

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

const copy = {
  zh: {
    title: "添加 Football2026 到桌面",
    subtitle: "下次直接点手机桌面图标进入竞猜。",
    installed: "已用桌面快捷方式打开",
    install: "一键安装",
    later: "稍后",
    androidTitle: "Android 快捷安装",
    androidManual: "如果没有弹出安装窗口，请点浏览器右上角菜单，再选“安装应用”或“添加到主屏幕”。",
    iosTitle: "iPhone 添加步骤",
    iosSafari: "请先用 Safari 打开本站",
    iosShare: "点击底部分享按钮",
    iosAdd: "选择“添加到主屏幕”",
    otherTitle: "添加快捷方式",
    otherManual: "请在浏览器菜单中选择“安装应用”或“添加到主屏幕”。",
  },
  en: {
    title: "Add Football2026 to Home Screen",
    subtitle: "Open predictions directly from your phone icon.",
    installed: "Opened from your shortcut",
    install: "Install",
    later: "Later",
    androidTitle: "Android quick install",
    androidManual: "If no install window appears, open the browser menu and choose Install app or Add to Home screen.",
    iosTitle: "iPhone setup",
    iosSafari: "Open this site in Safari",
    iosShare: "Tap the Share button",
    iosAdd: "Choose Add to Home Screen",
    otherTitle: "Create a shortcut",
    otherManual: "Use your browser menu and choose Install app or Add to Home screen.",
  },
};

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

  const steps = useMemo(() => {
    if (platform === "ios") {
      return [
        { icon: Smartphone, text: t.iosSafari },
        { icon: Share, text: t.iosShare },
        { icon: Plus, text: t.iosAdd },
      ];
    }

    if (platform === "android") {
      return [
        { icon: Download, text: t.androidTitle },
        { icon: MoreVertical, text: t.androidManual },
      ];
    }

    return [{ icon: MoreVertical, text: t.otherManual }];
  }, [platform, t]);

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.setItem("football2026-install-dismissed", "1");
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
      <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-100">
        <span className="inline-flex items-center gap-2">
          <Check className="h-4 w-4" />
          {t.installed}
        </span>
      </div>
    );
  }

  if (!force && dismissed && !deferredPrompt) return null;

  const title = platform === "ios" ? t.iosTitle : platform === "android" ? t.androidTitle : t.otherTitle;

  return (
    <section className="rounded-xl border border-[#FFD700]/55 bg-[linear-gradient(145deg,#17233a_0%,#101b2d_60%,#1a261b_100%)] p-3 shadow-xl shadow-[#FFD700]/10">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-black leading-5 text-white">{t.title}</p>
          <p className="mt-1 text-[11px] leading-4 text-slate-300">{t.subtitle}</p>
        </div>
        {allowDismiss && (
          <button
            type="button"
            onClick={close}
            className="rounded-md p-1 text-slate-600 transition hover:bg-white/10 hover:text-white"
            aria-label={t.later}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {platform === "android" && deferredPrompt && (
        <button
          type="button"
          onClick={install}
          className="mb-2.5 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#FFD700] px-4 text-sm font-black text-[#081120] shadow-lg shadow-[#FFD700]/20"
        >
          <Download className="h-4 w-4" />
          {t.install}
        </button>
      )}

      <div className="rounded-lg border border-[#FFD700]/20 bg-[#FFD700]/8 p-2.5">
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#FFD700]">{title}</p>
        <div className="grid gap-1.5">
          {steps.map((step, index) => (
            <div key={`${step.text}-${index}`} className="flex items-start gap-2 text-[11px] leading-4 text-slate-200">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFD700] text-[10px] font-black text-[#081120]">
                {index + 1}
              </span>
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#FFD700]/20 text-[#FFD700]">
                <step.icon className="h-3.5 w-3.5" />
              </span>
              <span>{step.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
