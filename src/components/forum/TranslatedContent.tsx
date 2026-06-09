"use client";

import { useState, useEffect, useRef } from "react";
import RichTextContent from "./RichTextContent";
import { needsTranslation } from "@/lib/languages";
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

/**
 * Forum post/reply content — auto-translated into the user's locale.
 *
 * Default view: translated content (auto-fetched on mount).
 * "原贴" button is always shown when content needs translation.
 * Clicking "原贴" reveals the original language; button becomes "翻译".
 * Clicking "翻译" returns to translated view; button becomes "原贴".
 */
export default function TranslatedContent({
  originalHtml, cachedTranslations, defaultLang, type, id, zh,
}: Props) {
  const locale = useLocale();
  const [cache,      setCache]      = useState<Record<string, string>>(cachedTranslations);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [noProvider, setNoProvider]  = useState(false);
  const fetchedRef = useRef(false);

  // Does this content need translation?
  const needs = needsTranslation(originalHtml, defaultLang);

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
          body:    JSON.stringify({ type, id, target_lang: defaultLang }),
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
  }, [needs, translated, noProvider, type, id, defaultLang, locale]);

  // If the post doesn't need translation, just show the original content
  if (!needs) {
    return <RichTextContent html={originalHtml} />;
  }

  // Currently showing translated content?
  const showingTranslation = !showOriginal && !!translated;

  return (
    <div className="space-y-3">

      {/* ── Main content ──────────────────────────────────────────────── */}
      {showOriginal ? (
        <RichTextContent html={originalHtml} />
      ) : translated ? (
        <RichTextContent html={translated} className="text-gray-200" />
      ) : (
        // While loading / no translation yet, show original as fallback
        <RichTextContent html={originalHtml} />
      )}

      {/* ── Translation control bar — always visible when translation needed ── */}
      {!noProvider && (
        <div className="flex items-center gap-2.5 pt-2 mt-1 border-t border-[#1E3A5F]/40 flex-wrap">

          {/* Loading state */}
          {isLoading && !translated ? (
            <div className="flex items-center gap-2 text-xs text-gray-500 px-1 py-1">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-[#1E3A5F] border-t-[#FFD700] animate-spin flex-shrink-0" />
              <span className="italic">{lc(locale, "翻译中…", "Translating…")}</span>
            </div>
          ) : (
            /* Toggle button */
            <button
              onClick={() => {
                // If no translation loaded and not loading, allow re-trigger on next render
                if (!showOriginal && !translated && !isLoading) {
                  setError(null);
                  fetchedRef.current = false;
                }
                setShowOriginal(v => !v);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                showingTranslation
                  // Showing translation → offer "原贴"
                  ? "border-[#1E3A5F] text-[#7EB3E0] hover:text-white hover:border-[#2A5A8F] hover:bg-[#1E3A5F]/30"
                  // Showing original → offer "翻译"
                  : "border-[#FFD700]/30 text-[#FFD700]/80 hover:text-[#FFD700] hover:border-[#FFD700]/50 hover:bg-[#FFD700]/5"
              }`}
            >
              {showingTranslation
                ? <>📄 {lc(locale, "原贴", "Original")}</>
                : <>🌐 {lc(locale, "翻译", "Translate")}</>
              }
            </button>
          )}

          {/* AI disclaimer — only when viewing translation */}
          {showingTranslation && !isLoading && (
            <span className="text-[9px] text-gray-700 italic">
              🤖 {lc(locale, "AI 翻译", "AI translated")}
            </span>
          )}

          {/* Error + retry */}
          {error && !isLoading && (
            <span className="flex items-center gap-1.5">
              <span className="text-[10px] text-red-400/70">⚠ {error}</span>
              <button
                onClick={() => { setError(null); fetchedRef.current = false; }}
                className="text-[11px] text-[#FFD700]/70 hover:text-[#FFD700] font-semibold transition-colors"
              >
                {lc(locale, "重试", "Retry")}
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
