// Mobile i18n gap finder.
//
// After a file has been converted to `lc(locale, "中文", "English")` calls, this
// lists the English strings used in that file that are MISSING (or empty) from
// src/i18n/content/<locale>.json — i.e. the exact keys you still need to translate
// for that language. Copy the printed keys into the locale JSON with professional,
// native translations (NOT a literal machine translation).
//
// Usage:  node scripts/mobile-i18n-gaps.mjs <path-to-file.tsx> <locale>
// Example: node scripts/mobile-i18n-gaps.mjs src/components/mobile/MobileHome.tsx fr
import { readFileSync } from "node:fs";

const file = process.argv[2];
const locale = process.argv[3];
if (!file || !locale) { console.error("usage: node scripts/mobile-i18n-gaps.mjs <file> <locale>"); process.exit(1); }

const src = readFileSync(file, "utf8");
const dict = JSON.parse(readFileSync(`src/i18n/content/${locale}.json`, "utf8"));

// Capture the EN (3rd) double-quoted literal of every lc(locale, "<zh>", "<en>") call.
const re = /lc\(locale,\s*"(?:[^"\\]|\\.)*",\s*("(?:[^"\\]|\\.)*")\)/g;
const ens = new Set();
let m;
while ((m = re.exec(src)) !== null) {
  try { ens.add(JSON.parse(m[1])); } catch { /* skip */ }
}

// Drop non-translatable noise (empty string, punctuation, single letters, codes).
const noise = new Set(["", " ", ", ", "、", "G", "A", "zh", "en"]);
const missing = [...ens]
  .filter((en) => !noise.has(en) && (dict[en] === undefined || dict[en] === ""))
  .sort();

console.log(`locale=${locale} unique-EN=${ens.size} missing=${missing.length}`);
console.log("--- add these keys to src/i18n/content/" + locale + ".json ---");
for (const s of missing) console.log(JSON.stringify(s) + ": \"\",");
