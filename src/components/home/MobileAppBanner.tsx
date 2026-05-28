"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Props {
  locale: string;
  zh: boolean;
}

export default function MobileAppBanner({ locale, zh }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show on non-mobile devices, and only if not dismissed before
    const dismissed = localStorage.getItem("mobile_banner_dismissed");
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (!dismissed && !isMobile) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem("mobile_banner_dismissed", "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] bg-[#0A1A35]/95 backdrop-blur-sm border-t border-[#FFD700]/20 shadow-2xl">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Icon + text */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl shrink-0">📱</span>
          <p className="text-sm text-gray-300 truncate">
            <span className="font-black text-white">
              {zh ? "手机版已上线" : "Mobile version available"}
            </span>
            <span className="hidden sm:inline text-gray-400">
              {zh
                ? " · 添加到主屏幕，像 App 一样使用"
                : " · Add to home screen for an app-like experience"}
            </span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/${locale}/m`}
            className="bg-[#FFD700] text-[#0A1628] font-black text-xs px-4 py-1.5 rounded-lg hover:bg-[#FFC200] transition-all whitespace-nowrap"
          >
            {zh ? "打开手机版" : "Open Mobile"}
          </Link>
          <button
            onClick={dismiss}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
