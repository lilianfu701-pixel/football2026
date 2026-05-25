// Reload PostgREST schema cache so FK changes take effect immediately
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const env   = readFileSync(join(__dir, "../.env.local"), "utf8");
const token = env.match(/SUPABASE_ACCESS_TOKEN=(.+)/)?.[1]?.trim();
const url   = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const ref   = url?.replace("https://", "").split(".")[0];

if (!token || !ref) { console.error("Missing env vars"); process.exit(1); }

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method:  "POST",
  headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
  body:    JSON.stringify({ query: "SELECT pg_notify('pgrst', 'reload schema')" }),
});

const data = await res.json();
if (res.ok) {
  console.log("✅  PostgREST schema cache reloaded");
} else {
  console.error("❌  Failed:", data.message ?? JSON.stringify(data));
}
