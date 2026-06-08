import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "es", "fr", "de", "pt", "ru", "ar", "ja", "ko", "zh", "vi", "id"],
  defaultLocale: "en",
  localePrefix: {
    mode: "as-needed",
  },
  localeDetection: false,
});

export const localeNames: Record<string, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  ru: "Русский",
  ar: "العربية",
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
  vi: "Tiếng Việt",
  id: "Bahasa Indonesia",
};

export const rtlLocales = ["ar"];
