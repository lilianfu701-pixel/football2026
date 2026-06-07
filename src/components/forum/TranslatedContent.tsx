"use client";

import { useState, useMemo, useRef } from "react";
import RichTextContent from "./RichTextContent";
import { LANGUAGES, needsTranslation } from "@/lib/languages";
import { lc } from "@/i18n/content";
import { useLocale } from "next-intl";

interface Props {
  originalHtml:       string;
  cachedTranslations: Record<string, string>;  // { zh: "…", en: "…", es: "…" }
  defaultLang:        string;   // user's current locale
  type:               "post_content" | "reply_content";
  id:                 number;
  zh?:                boolean;  // whether UI is in Chinese
}

export default function TranslatedContent({
  originalHtml, cachedTranslations, defaultLang, type, id, zh,
}: Props) {
  const locale = useLocale();
  const [cache,        setCache]        = useState<Record<string, string>>(cachedTranslations);
  // per-lang loading flags — allows multiple simultaneous fetches
  const [loadingLangs, setLoadingLangs] = useState<Record<string, boolean>>({});
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [noProvider,   setNoProvider]   = useState(false);

  // Ref-based dedup guard so we never double-fire the same lang
  const fetchingRef = useRef<Set<string>>(new Set());

  // Auto-select defaultLang if the content needs translation into it
  const autoSelect = useMemo(
    () => needsTranslation(originalHtml, defaultLang) ? defaultLang : null,
    [originalHtml, defaultLang],
  );
  const [activeLang, setActiveLang] = useState<string | null>(
    cachedTranslations[defaultLang] ? defaultLang : autoSelect,
  );

  // Fetch a translation for `lang`.  Can run concurrently with other langs.
  async function fetchLang(lang: string) {
    if (fetchingRef.current.has(lang) || cache[lang] || noProvider) return;

    fetchingRef.current.add(lang);
    setLoadingLangs(prev => ({ ...prev, [lang]: true }));

    try {
      const res  = await fetch("/api/forum/translate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type, id, target_lang: lang }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error?.includes("NO_PROVIDER")) { setNoProvider(true); return; }
        setErrors(prev => ({ ...prev, [lang]: data.error ?? "failed" }));
        return;
      }
      if (data.same_language) {
        setErrors(prev => ({ ...prev, [lang]: "__same__" }));
        return;
      }
      setCache(prev => ({ ...prev, [lang]: data.translated }));
    } catch {
      setErrors(prev => ({ ...prev, [lang]: lc(locale, "网络错误", "Network error") }));
    } finally {
      fetchingRef.current.delete(lang);
      setLoadingLangs(prev => { const n = { ...prev }; delete n[lang]; return n; });
    }
  }

  function handleSelectLang(lang: string) {
    setActiveLang(lang);

    // If already cached or same-language — just switch display, nothing to fetch
    if (cache[lang] || errors[lang] === "__same__") return;

    // If there was a real error, clear it so the loading skeleton shows on retry
    if (errors[lang]) setErrors(prev => { const n = { ...prev }; delete n[lang]; return n; });

    // Fetch (or retry) — runs independently of any other in-flight fetch
    fetchLang(lang);
  }

  const activeTranslation = activeLang ? cache[activeLang] : null;
  const activeError       = activeLang ? errors[activeLang] : null;
  const isLoading         = activeLang ? !!loadingLangs[activeLang] : false;
  const isSame            = activeError === "__same__";

  return (
    <div className="space-y-3">

      {/* ── ① Original content — always on top ─────────────────────────── */}
      <RichTextContent html={originalHtml} />

      {/* ── ② Language selector + translation ──────────────────────────── */}
      <div className="rounded-xl overflow-hidden border border-[#1E3A5F]/60 bg-[#080F1F]/60">

        {/* Language tab strip — always visible */}
        <div className="flex items-center gap-1 px-3 py-2 flex-wrap
                        bg-[#0A1628]/80 border-b border-[#1E3A5F]/50">
          <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest mr-1 shrink-0">
            🌍
          </span>

          {LANGUAGES.map((lang) => {
            const isActive   = activeLang === lang.code;
            const hasTrans   = !!cache[lang.code];
            const isLoading_ = !!loadingLangs[lang.code];
            const hasErr     = !!(errors[lang.code] && errors[lang.code] !== "__same__");
            return (
              <button
                key={lang.code}
                onClick={() => handleSelectLang(lang.code)}
                title={lang.nameEn}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-sm font-bold
                             border transition-all duration-100 ${
                  isActive
                    ? "bg-[#FFD700]/15 border-[#FFD700]/50 text-[#FFD700]"
                    : hasTrans
                    ? "bg-[#1E3A5F]/40 border-[#1E3A5F] text-gray-300 hover:border-[#2A4A7F] hover:text-white"
                    : hasErr
                    ? "border-red-900/40 text-red-500/60 hover:text-red-400 hover:border-red-600/40"
                    : "border-transparent text-gray-600 hover:text-gray-400"
                }`}
              >
                <span>{lang.flag}</span>
                <span className="hidden sm:inline">{lang.code.toUpperCase()}</span>
                {isLoading_ && (
                  <span className="w-2 h-2 rounded-full border border-current border-t-transparent animate-spin" />
                )}
                {hasTrans && !isLoading_ && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
                )}
                {hasErr && !isLoading_ && (
                  <span className="text-[9px] leading-none">⚠</span>
                )}
              </button>
            );
          })}

          {/* Re-translate active */}
          {activeTranslation && (
            <button
              onClick={() => {
                if (!activeLang) return;
                setCache(c => { const n = { ...c }; delete n[activeLang]; return n; });
                fetchingRef.current.delete(activeLang); // allow re-fetch
                fetchLang(activeLang);
              }}
              title={lc(locale, "重新翻译", "Re-translate")}
              className="ml-auto text-[10px] text-gray-700 hover:text-gray-400 transition-colors"
            >
              🔄
            </button>
          )}
        </div>

        {/* Translation body — always rendered so panel never collapses */}
        <div className="px-4 py-3 min-h-[44px]">

          {/* No language selected */}
          {!activeLang && (
            <p className="text-xs text-gray-600">
              {lc(locale, "点击上方语言旗帜查看翻译", "Click a flag above to read in another language")}
            </p>
          )}

          {/* No provider */}
          {activeLang && noProvider && (
            <p className="text-xs text-gray-500 italic">
              {lc(locale, "翻译服务暂未配置", "Translation service not configured")}
            </p>
          )}

          {activeLang && !noProvider && (
            <>
              {/* Loading skeleton */}
              {isLoading && !activeTranslation && (
                <div className="space-y-2 animate-pulse">
                  <div className="h-3 bg-[#1E3A5F]/40 rounded-full w-full" />
                  <div className="h-3 bg-[#1E3A5F]/40 rounded-full w-10/12" />
                  <div className="h-3 bg-[#1E3A5F]/40 rounded-full w-4/5" />
                </div>
              )}

              {/* Same language */}
              {isSame && !isLoading && (
                <p className="text-xs text-gray-600 italic">
                  {lc(locale, "原文已是此语言", "Original is already in this language")}
                </p>
              )}

              {/* Error + retry */}
              {activeError && activeError !== "__same__" && !isLoading && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-400/80">⚠ {activeError}</span>
                  <button
                    onClick={() => {
                      if (!activeLang) return;
                      setErrors(e => { const n = { ...e }; delete n[activeLang]; return n; });
                      fetchingRef.current.delete(activeLang);
                      fetchLang(activeLang);
                    }}
                    className="text-xs text-[#FFD700] font-semibold hover:text-[#FFC200]"
                  >
                    {lc(locale, "重试", "Retry")}
                  </button>
                </div>
              )}

              {/* Translated content */}
              {activeTranslation && !isLoading && (
                <RichTextContent html={activeTranslation} className="text-gray-200" />
              )}

              {/* Not yet loaded (first render before any click) */}
              {!activeTranslation && !isLoading && !activeError && (
                <p className="text-xs text-gray-600 italic">
                  {lc(locale, "点击旗帜加载翻译", "Click a flag to load translation")}
                </p>
              )}
            </>
          )}
        </div>

        {/* AI disclaimer */}
        {activeTranslation && (
          <div className="px-4 py-1.5 border-t border-[#1E3A5F]/30 bg-[#080F1F]/60">
            <span className="text-[9px] text-gray-700">
              🤖 {lc(locale, "AI 机器翻译，仅供参考", "AI machine translation — for reference only")}
            </span>
          </div>
        )}
      </div>

    </div>
  );
}
