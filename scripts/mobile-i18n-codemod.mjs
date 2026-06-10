// Mobile i18n codemod.
//
// Converts inline `locale === "zh" ? "中文" : "English"` STRING ternaries into the
// project i18n helper `lc(locale, "中文", "English")`, which resolves non-en/zh
// locales through src/i18n/content/<locale>.json. Behaviour is unchanged for en
// (returns the English arg) and zh (returns the Chinese arg); every other locale
// now gets its dictionary value (falling back to English when a key is missing).
//
// Only double-quoted string-literal ternaries are touched. Template literals,
// data-selection ternaries (e.g. `category.nameZh`) and locale codes
// (`zh-CN` / `zh-Hans`) are intentionally left alone.
//
// Usage:  node scripts/mobile-i18n-codemod.mjs <path-to-file.tsx>
// Idempotent: re-running only converts ternaries that haven't been converted yet.
// `lc` is auto-imported if missing. ALWAYS run `npx tsc --noEmit` + `pnpm build`
// afterwards, and review the diff — this is a user-facing file.
import { readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2];
if (!file) { console.error("usage: node scripts/mobile-i18n-codemod.mjs <file>"); process.exit(1); }

let src = readFileSync(file, "utf8");
const before = src;

// Ensure `lc` is imported (insert after the first existing @/ import, or @/lib/flags).
if (!/import\s*\{\s*lc\s*\}\s*from\s*"@\/i18n\/content"/.test(src)) {
  const anchor = src.match(/^import .*from "@\/[^"]+";$/m);
  if (!anchor) { console.error("No anchor @/ import found — add `import { lc } from \"@/i18n/content\";` manually."); process.exit(1); }
  src = src.replace(anchor[0], `${anchor[0]}\nimport { lc } from "@/i18n/content";`);
}

const re = /locale === "zh"\s*\?\s*("(?:[^"\\]|\\.)*")\s*:\s*("(?:[^"\\]|\\.)*")/g;
let converted = 0, skipped = 0;
src = src.replace(re, (m, zhLit, enLit) => {
  let zhVal;
  try { zhVal = JSON.parse(zhLit); } catch { return m; }
  if (zhVal === "zh-CN" || zhVal === "zh-Hans" || zhVal === "zh") { skipped++; return m; }
  converted++;
  return `lc(locale, ${zhLit}, ${enLit})`;
});

if (src !== before) writeFileSync(file, src, "utf8");
console.log(`converted=${converted} skipped(localeCode)=${skipped} file=${file}`);
