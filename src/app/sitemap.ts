import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const BASE     = "https://football2026.net";
const LOCALES  = ["en", "zh", "es", "fr", "de", "pt", "ru", "ar", "ja", "ko", "vi", "id"] as const;

/** Build an absolute URL for a given path + locale (en has no prefix). */
function u(path: string, locale: string): string {
  const prefix = locale === "en" ? "" : `/${locale}`;
  // path is either "/" or starts with "/"
  return path === "/" ? `${BASE}${prefix}/` : `${BASE}${prefix}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [matchRes, playerRes] = await Promise.all([
    supabase.from("matches").select("id, kickoff_time"),
    supabase.from("players").select("id"),
  ]);

  const matches = (matchRes.data ?? []) as { id: number; kickoff_time: string | null }[];
  const players = (playerRes.data ?? []) as { id: number }[];
  const now     = new Date();

  const entries: MetadataRoute.Sitemap = [];

  // ── Static pages (per locale) ────────────────────────────────────────────────
  const staticPages: { path: string; freq: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
    { path: "/",            freq: "hourly",  priority: 1.0 },
    { path: "/matches",     freq: "hourly",  priority: 0.9 },
    { path: "/schedule",    freq: "hourly",  priority: 0.9 },
    { path: "/leaderboard", freq: "hourly",  priority: 0.8 },
    { path: "/predict",     freq: "daily",   priority: 0.8 },
    { path: "/players",     freq: "weekly",  priority: 0.7 },
    { path: "/forum",       freq: "hourly",  priority: 0.7 },
  ];

  for (const locale of LOCALES) {
    for (const page of staticPages) {
      entries.push({
        url:             u(page.path, locale),
        lastModified:    now,
        changeFrequency: page.freq,
        priority:        page.priority,
      });
    }
  }

  // ── Match detail pages (104 matches × 12 locales = 1 248 URLs) ───────────────
  for (const match of matches) {
    const lastMod = match.kickoff_time ? new Date(match.kickoff_time) : now;
    for (const locale of LOCALES) {
      entries.push({
        url:             u(`/matches/${match.id}`, locale),
        lastModified:    lastMod,
        changeFrequency: "hourly",
        priority:        0.95,
      });
    }
  }

  // ── Player pages (308 players × 12 locales = 3 696 URLs) ────────────────────
  for (const player of players) {
    for (const locale of LOCALES) {
      entries.push({
        url:             u(`/players/${player.id}`, locale),
        lastModified:    now,
        changeFrequency: "weekly",
        priority:        0.6,
      });
    }
  }

  return entries;
}
