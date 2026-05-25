/**
 * Head-to-Head history via martj42/international_results (GitHub)
 * CSV cached by Next.js for 24 h; results cached in Supabase h2h_matches.
 */

import { createClient } from "@/lib/supabase/server";

const CSV_URL =
  "https://raw.githubusercontent.com/martj42/international_results/master/results.csv";

// ── Team name normalisation: our DB names → CSV names ────────────────────────
// The CSV uses official FIFA names; our DB may differ.
const TO_CSV: Record<string, string> = {
  "United States":        "United States",
  "USA":                  "United States",
  "South Korea":          "Korea Republic",
  "North Korea":          "Korea DPR",
  "Ivory Coast":          "Côte d'Ivoire",
  "Côte d'Ivoire":        "Côte d'Ivoire",
  "Iran":                 "IR Iran",
  "Trinidad & Tobago":    "Trinidad and Tobago",
  "DR Congo":             "DR Congo",
  "Congo DR":             "DR Congo",
  "Bosnia":               "Bosnia and Herzegovina",
  "Czech Republic":       "Czech Republic",
  "Czechia":              "Czech Republic",
  "Kyrgyzstan":           "Kyrgyz Republic",
  "Eswatini":             "Swaziland",
  "North Macedonia":      "North Macedonia",
  "Palestine":            "Palestine",
  "Chinese Taipei":       "Chinese Taipei",
  "Hong Kong":            "Hong Kong",
  "Macau":                "Macau",
};

function toCSV(name: string): string {
  return TO_CSV[name] ?? name;
}

// ── Minimal CSV parser (handles double-quoted fields with commas) ─────────────
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface H2HMatch {
  id:         number;
  home_team:  string;
  away_team:  string;
  home_score: number;
  away_score: number;
  match_date: string;   // "YYYY-MM-DD"
  tournament: string;
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function getH2H(
  homeTeam: string,
  awayTeam: string,
  limit = 10,
): Promise<H2HMatch[]> {
  const supabase = await createClient();

  // 1 ── Check Supabase cache ─────────────────────────────────────────────────
  const { data: cached } = await supabase
    .from("h2h_matches")
    .select("id, home_team, away_team, home_score, away_score, match_date, tournament")
    .or(
      `and(home_team.eq.${homeTeam},away_team.eq.${awayTeam}),` +
      `and(home_team.eq.${awayTeam},away_team.eq.${homeTeam})`,
    )
    .order("match_date", { ascending: false })
    .limit(limit);

  if (cached && cached.length > 0) return cached as H2HMatch[];

  // 2 ── Fetch + parse CSV (Next.js caches fetch for 24 h) ───────────────────
  let text: string;
  try {
    const res = await fetch(CSV_URL, { next: { revalidate: 86_400 } });
    if (!res.ok) return [];
    text = await res.text();
  } catch {
    return [];
  }

  const csvHome = toCSV(homeTeam);
  const csvAway = toCSV(awayTeam);

  const lines = text.trim().split("\n").slice(1); // skip header
  // CSV header: date,home_team,away_team,home_score,away_score,tournament,city,country,neutral

  const matches: H2HMatch[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = parseCSVLine(line);
    if (cols.length < 5) continue;

    const [date, csvHT, csvAT, hsRaw, asRaw, tournament = ""] = cols;
    const hs = parseInt(hsRaw, 10);
    const as_ = parseInt(asRaw, 10);
    if (isNaN(hs) || isNaN(as_)) continue;

    const isForward = csvHT === csvHome && csvAT === csvAway;
    const isReverse = csvHT === csvAway && csvAT === csvHome;
    if (!isForward && !isReverse) continue;

    matches.push({
      id: matches.length,
      home_team:  isForward ? homeTeam : awayTeam,
      away_team:  isForward ? awayTeam : homeTeam,
      home_score: isForward ? hs : as_,
      away_score: isForward ? as_ : hs,
      match_date: date,
      tournament: tournament.trim(),
    });
  }

  // Sort newest first
  matches.sort((a, b) => b.match_date.localeCompare(a.match_date));

  // 3 ── Seed to Supabase (fire-and-forget, ignore errors) ──────────────────
  if (matches.length > 0) {
    const rows = matches.map((m) => ({
      home_team:  m.home_team,
      away_team:  m.away_team,
      home_score: m.home_score,
      away_score: m.away_score,
      match_date: m.match_date,
      tournament: m.tournament,
    }));
    // upsert so duplicate keys don't throw
    void supabase.from("h2h_matches").upsert(rows, { onConflict: "home_team,away_team,match_date" })
      .then(() => {/* cached */});
  }

  return matches.slice(0, limit);
}
