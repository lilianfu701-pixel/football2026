/**
 * migrate.mjs  —  Run Supabase migrations via Management API
 *
 * Usage:
 *   node scripts/migrate.mjs                      # run all pending (006–012)
 *   node scripts/migrate.mjs 012                  # run only 012_*
 *   node scripts/migrate.mjs 006 007 012          # run specific files
 *
 * Requires: SUPABASE_ACCESS_TOKEN in .env.local
 *   Get yours at: https://supabase.com/dashboard/account/tokens
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir   = dirname(fileURLToPath(import.meta.url));
const root    = join(__dir, "..");

// ── Load .env.local ───────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    process.env[key] ??= val;
  }
}
loadEnv();

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ACCESS_TOKEN    = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_URL) {
  console.error("❌  NEXT_PUBLIC_SUPABASE_URL not found in .env.local");
  process.exit(1);
}
if (!ACCESS_TOKEN) {
  console.error(`
❌  SUPABASE_ACCESS_TOKEN not set.

Steps to get your token:
  1. Open  https://supabase.com/dashboard/account/tokens
  2. Click "Generate new token"  →  copy it
  3. Add to .env.local:
       SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxx
  4. Re-run: node scripts/migrate.mjs
`);
  process.exit(1);
}

// Extract project ref from URL  e.g. https://cxpzlpewoqtlduoizlix.supabase.co
const PROJECT_REF = SUPABASE_URL.replace("https://", "").split(".")[0];
const API_URL     = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

// ── Migration files (in order) ────────────────────────────────────────────────
const ALL_MIGRATIONS = [
  "001_auth_trigger",
  "002_matches_seed",
  "003_bets_table",
  "004_award_bets",
  "005_referrals",
  "006_forum",
  "007_forum_stages",
  "008_match_thread_fn",
  "009_forum_storage",
  "010_forum_ratings",
  "011_forum_translate",
  "012_forum_categories",
  "013_remove_community",
  "014_fix_user_fk",
  "015_force_public_user_fk",
  "016_ratings_reply_support",
  "017_admin_and_rls",
  "018_category_no_new_posts",
  "019_title_translations",
  "020_forum_translations",
];

// ── Resolve which files to run ────────────────────────────────────────────────
const args = process.argv.slice(2);
let toRun = [];

if (args.length === 0) {
  // Default: run from 006 onwards (forum-related)
  toRun = ALL_MIGRATIONS.filter(m => parseInt(m) >= 6);
} else {
  // Match by prefix number e.g. "012" or full name
  toRun = ALL_MIGRATIONS.filter(m =>
    args.some(a => m.startsWith(a.padStart(3, "0")) || m === a)
  );
}

if (toRun.length === 0) {
  console.error("❌  No matching migration files found for:", args.join(", "));
  process.exit(1);
}

// ── Run each migration ────────────────────────────────────────────────────────
async function runMigration(name) {
  const dir = join(root, "supabase", "migrations");

  // Find the file (prefix match)
  const { readdirSync } = await import("fs");
  const files = readdirSync(dir).filter(f => f.startsWith(name) || f.replace(/\.sql$/, "") === name);

  if (files.length === 0) {
    console.warn(`⚠️  File not found for: ${name} — skipping`);
    return;
  }

  const file = files[0];
  const sql  = readFileSync(join(dir, file), "utf8");

  process.stdout.write(`  ▶  ${file} ... `);

  const res  = await fetch(API_URL, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${ACCESS_TOKEN}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (res.ok) {
    console.log("✅  done");
  } else {
    const body = await res.text();
    console.log("❌  FAILED");
    console.error(`     Status : ${res.status}`);
    try {
      const parsed = JSON.parse(body);
      console.error(`     Message: ${parsed.message ?? parsed.error ?? body}`);
    } catch {
      console.error(`     Body   : ${body.slice(0, 300)}`);
    }
    // Continue to next migration instead of exiting
  }
}

console.log(`\n🚀  Running ${toRun.length} migration(s) on project [${PROJECT_REF}]\n`);

for (const name of toRun) {
  await runMigration(name);
}

console.log("\n✨  Done!\n");
