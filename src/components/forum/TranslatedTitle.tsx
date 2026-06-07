"use client";

import { useState, useMemo, useRef } from "react";
import { LANGUAGES, needsTranslation } from "@/lib/languages";
import { lc } from "@/i18n/content";
import { useLocale } from "next-intl";

interface Props {
  postId:             number;
  originalTitle:      string;
  cachedTranslations: Record<string, string>;   // { zh: "…", en: "…" }
  defaultLang:        string;
  zh?:                boolean;
  className?:         string;
}

export default function TranslatedTitle({
  postId, originalTitle, cachedTranslations, defaultLang, zh, className = "",
}: Props) {
  const locale = useLocale();
  const [cache,        setCache]        = useState<Record<string, string>>(cachedTranslations);
  const [loadingLangs, setLoadingLangs] = useState<Record<string, boolean>>({});
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [noProvider,   setNoProvider]   = useState(false);

  // Ref-based dedup guard — avoids double-firing the same lang
  const fetchingRef = useRef<Set<string>>(new Set());

  const autoSelect = useMemo(
    () => needsTranslation(originalTitle, defaultLang) ? defaultLang : null,
    [originalTitle, defaultLang],
  );
  const [activeLang, setActiveLang] = useState<string | null>(
    cachedTranslations[defaultLang] ? defaultLang : autoSelect,
  );

  async function fetchLang(lang: string) {
    if (fetchingRef.current.has(lang) || cache[lang] || noProvider) return;

    fetchingRef.current.add(lang);
    setLoadingLangs(prev => ({ ...prev, [lang]: true }));

    try {
      const res  = await fetch("/api/forum/translate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ type: "post_title", id: postId, target_lang: lang }),
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
      setErrors(prev => ({ ...prev, [lang]: "error" }));
    } finally {
      fetchingRef.current.delete(lang);
      setLoadingLangs(prev => { const n = { ...prev }; delete n[lang]; return n; });
    }
  }

  function handleSelectLang(lang: string) {
    setActiveLang(lang);

    // Already cached or same-language — just switch display
    if (cache[lang] || errors[lang] === "__same__") return;

    // Clear previous real error (allow retry)
    if (errors[lang]) setErrors(prev => { const n = { ...prev }; delete n[lang]; return n; });

    // Fetch / retry — independent of other in-flight fetches
    fetchLang(lang);
  }

  const activeTranslation = activeLang ? cache[activeLang] : null;
  const activeLangObj     = activeLang ? LANGUAGES.find((l) => l.code === activeLang) : null;
  const activeError       = activeLang ? errors[activeLang] : null;
  const isLoading         = activeLang ? !!loadingLangs[activeLang] : false;

  return (
    <div className="space-y-2">

      {/* ── Original title ──────────────────────────────────────────────── */}
      <h1 className={className}>{originalTitle}</h1>

      {/* ── Language tabs — always visible ───────────────────────────────── */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[10px] text-gray-600 font-bold mr-0.5">🌍</span>

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
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold
                           border transition-all ${
                isActive
                  ? "bg-[#FFD700]/15 border-[#FFD700]/50 text-[#FFD700]"
                  : hasTrans
                  ? "bg-[#1E3A5F]/40 border-[#1E3A5F] text-gray-300 hover:text-white"
                  : hasErr
                  ? "border-red-900/40 text-red-500/60 hover:text-red-400"
                  : "border-transparent text-gray-600 hover:text-gray-400"
              }`}
            >
              {lang.flag}
              {isLoading_ && (
                <span className="w-1.5 h-1.5 rounded-full border border-current border-t-transparent animate-spin" />
              )}
              {hasTrans && !isLoading_ && (
                <span className="w-1 h-1 rounded-full bg-green-500/70" />
              )}
              {hasErr && !isLoading_ && (
                <span className="text-[9px] leading-none">⚠</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Translation result area — stays rendered after first click ── */}
      {activeLang && (
        <div className="flex items-start gap-2 pl-1">
          {activeLangObj && (
            <span className="text-base shrink-0 mt-0.5">{activeLangObj.flag}</span>
          )}
          <div className="flex-1 min-w-0">

            {/* No provider */}
            {noProvider && (
              <span className="text-sm text-gray-600 italic">
                {lc(locale, "翻译服务暂未配置", "Translation service not configured")}
              </span>
            )}

            {/* Loading */}
            {!noProvider && isLoading && !activeTranslation && (
              <div className="flex items-center gap-2 py-1">
                <div className="w-3 h-3 rounded-full border-2 border-[#1E3A5F] border-t-[#FFD700] animate-spin" />
                <span className="text-sm text-gray-600 italic">
                  {lc(locale, "翻译中…", "Translating…")}
                </span>
              </div>
            )}

            {/* Same language */}
            {!noProvider && activeError === "__same__" && (
              <span className="text-sm text-gray-600 italic">
                {lc(locale, "原文已是此语言", "Original is already in this language")}
              </span>
            )}

            {/* Error + retry */}
            {!noProvider && activeError && activeError !== "__same__" && !isLoading && (
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

            {/* Translated title */}
            {!noProvider && activeTranslation && (
              <>
                <p className="text-lg sm:text-xl font-bold text-gray-300 leading-snug">
                  {activeTranslation}
                </p>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  🤖 {lc(locale, "AI 翻译标题", "AI translated title")}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
