import esContent from "./content/es.json";
import frContent from "./content/fr.json";
import deContent from "./content/de.json";
import ptContent from "./content/pt.json";
import ruContent from "./content/ru.json";
import arContent from "./content/ar.json";
import jaContent from "./content/ja.json";
import koContent from "./content/ko.json";

/**
 * Content localization layer.
 *
 * The codebase historically inlines copy as a binary Chinese/English ternary.
 * To support additional languages without rewriting every call site into a
 * keyed message system, this helper keeps:
 *   - Chinese inline as the source of truth, and
 *   - English as the lookup KEY for every other locale.
 *
 * Translations for non-en/zh locales live in `./content/<locale>.json`, keyed
 * by the exact English string. Missing keys fall back to English, so a partially
 * translated locale degrades gracefully instead of breaking.
 *
 * Usage:  lc(locale, "中文", "English")
 */
const DICTS: Record<string, Record<string, string>> = {
  es: esContent as Record<string, string>,
  fr: frContent as Record<string, string>,
  de: deContent as Record<string, string>,
  pt: ptContent as Record<string, string>,
  ru: ruContent as Record<string, string>,
  ar: arContent as Record<string, string>,
  ja: jaContent as Record<string, string>,
  ko: koContent as Record<string, string>,
};

export function lc(locale: string, zh: string, en: string): string {
  if (locale === "zh") return zh;
  if (locale === "en") return en;
  const dict = DICTS[locale];
  if (dict) {
    const hit = dict[en];
    if (hit !== undefined && hit !== "") return hit;
  }
  return en;
}
