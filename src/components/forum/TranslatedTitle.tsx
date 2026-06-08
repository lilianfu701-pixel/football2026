"use client";

import { useState, useEffect, useRef } from "react";
import { needsTranslation } from "@/lib/languages";
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

/**
 * Forum post title — auto-translated into the user's locale.
 *
 * Default view: translated title.
 * Button toggles between "原贴 / Original" and "翻译 / Translate".
 * If the post is already in the user's language, shows original directly.
 */
export default function TranslatedTitle({
  postId, originalTitle, cachedTranslations, defaultLang, zh, className = "",
}: Props) {
  const locale = useLocale();
  const [cache,      setCache]      = useState<Record<string, string>>(cachedTranslations);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [noProvider, setNoProvider]  = useState(false);
  const fetchedRef = useRef(false);

  // Does this title need translation?
  const needs = needsTranslation(originalTitle, defaultLang);

  // The translated text for the user's locale
  const translated = cache[defaultLang] ?? null;

  // Toggle: false = show translation (default), true = show original
  const [showOriginal, setShowOriginal] = useState(false);

  // Auto-fetch translation on mount if needed and not cached
  useEffect(() => {
    if (!needs || translated || fetchedRef.current || noProvider) return;
    fetchedRef.current = true;

    async function fetchTranslation() {
      setIsLoading(true);
      try {
        const res  = await fetch("/api/forum/translate", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ type: "post_title", id: postId, target_lang: defaultLang }),
        });
        const data = await res.json();

        if (!res.ok) {
          if (data.error?.includes("NO_PROVIDER")) { setNoProvider(true); return; }
          setError(data.error ?? "failed");
          return;
        }
        if (data.same_language) return; // already in this language
        if (data.translated) {
          setCache(prev => ({ ...prev, [defaultLang]: data.translated }));
        }
      } catch {
        setError(lc(locale, "网络错误", "Network error"));
      } finally {
        setIsLoading(false);
      }
    }

    fetchTranslation();
  }, [needs, translated, noProvider, postId, defaultLang, locale]);

  // If the post doesn't need translation, just show the original title
  if (!needs) {
    return <h1 className={className}>{originalTitle}</h1>;
  }

  // Determine what to display as the main title
  const displayTitle = showOriginal
    ? originalTitle
    : (translated ?? originalTitle); // fall back to original while loading

  return (
    <div className="space-y-1.5">
      {/* Main title — translated by default */}
      <h1 className={className}>{displayTitle}</h1>

      {/* Loading indicator */}
      {isLoading && !translated && (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-[#1E3A5F] border-t-[#FFD700] animate-spin" />
          <span className="text-xs text-gray-600 italic">
            {lc(locale, "翻译中…", "Translating…")}
          </span>
        </div>
      )}

      {/* Error + retry */}
      {error && !isLoading && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-400/80">⚠ {error}</span>
          <button
            onClick={() => {
              setError(null);
              fetchedRef.current = false;
            }}
            className="text-xs text-[#FFD700] font-semibold hover:text-[#FFC200]"
          >
            {lc(locale, "重试", "Retry")}
          </button>
        </div>
      )}

      {/* Toggle button — only show when translation is available */}
      {translated && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-[#FFD700] transition-colors"
          >
            <span className="text-xs">🌐</span>
            {showOriginal
              ? lc(locale, "翻译", "Translate")
              : lc(locale, "原贴", "Original")}
          </button>
          <span className="text-[9px] text-gray-700">
            🤖 {lc(locale, "AI 翻译", "AI translated")}
          </span>
        </div>
      )}
    </div>
  );
}
