/**
 * Supported forum languages — 9 major football-fan languages.
 * Add more here; the DB table (forum_translations) is column-free,
 * so no schema change is needed.
 */

export const LANGUAGES = [
  { code: "zh", name: "中文",       nameEn: "Chinese",    flag: "🇨🇳", deepl: "ZH",    google: "zh-CN" },
  { code: "en", name: "English",    nameEn: "English",    flag: "🇺🇸", deepl: "EN-US", google: "en"    },
  { code: "es", name: "Español",    nameEn: "Spanish",    flag: "🇪🇸", deepl: "ES",    google: "es"    },
  { code: "pt", name: "Português",  nameEn: "Portuguese", flag: "🇧🇷", deepl: "PT-BR", google: "pt"    },
  { code: "ar", name: "العربية",    nameEn: "Arabic",     flag: "🇸🇦", deepl: "AR",    google: "ar"    },
  { code: "fr", name: "Français",   nameEn: "French",     flag: "🇫🇷", deepl: "FR",    google: "fr"    },
  { code: "de", name: "Deutsch",    nameEn: "German",     flag: "🇩🇪", deepl: "DE",    google: "de"    },
  { code: "ja", name: "日本語",     nameEn: "Japanese",   flag: "🇯🇵", deepl: "JA",    google: "ja"    },
  { code: "ko", name: "한국어",     nameEn: "Korean",     flag: "🇰🇷", deepl: "KO",    google: "ko"    },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

export function getLang(code: string) {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[1]; // fallback to English
}

/** Labels for share text, keyed by lang code */
export const SHARE_LABELS: Record<string, { forum: string }> = {
  zh: { forum: "Football2026 论坛" },
  en: { forum: "Football2026 Forum" },
  es: { forum: "Foro Football2026" },
  pt: { forum: "Fórum Football2026" },
  ar: { forum: "منتدى Football2026" },
  fr: { forum: "Forum Football2026" },
  de: { forum: "Football2026 Forum" },
  ja: { forum: "Football2026 フォーラム" },
  ko: { forum: "Football2026 포럼" },
};

/** Detect whether HTML/plain text likely needs translation to targetLang.
 *  CJK character ratio heuristic — fast, no API call needed client-side. */
export function needsTranslation(text: string, targetLang: string): boolean {
  const plain = text.replace(/<[^>]*>/g, "").replace(/\s+/g, "");
  if (!plain) return false;
  const cjk   = (plain.match(/[一-鿿㐀-䶿＀-￯]/g) ?? []).length;
  const ratio  = cjk / plain.length;
  if (targetLang === "zh" || targetLang === "ja" || targetLang === "ko") {
    return ratio < 0.12;  // mostly non-CJK → translate to CJK lang
  }
  return ratio > 0.12;    // mostly CJK → translate to Latin lang
}
