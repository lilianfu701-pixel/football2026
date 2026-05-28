/**
 * sync-scores.mjs
 * 从 football-data.org 拉取 2026 世界杯比分，自动更新 Supabase matches 表
 *
 * 手动运行: node scripts/sync-scores.mjs
 * 也可配置 Vercel Cron 每 5 分钟调用 /api/cron/sync-scores
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FD_API_KEY       = process.env.FOOTBALL_DATA_API_KEY;
const FD_BASE          = "https://api.football-data.org/v4";
const COMPETITION_CODE = "WC"; // FIFA World Cup

// ── 队名映射：football-data.org 名称 → 我们数据库里的名称 ──────────────────
const TEAM_MAP = {
  "Mexico":              "Mexico",
  "Poland":              "Poland",
  "Saudi Arabia":        "Saudi Arabia",
  "Argentina":           "Argentina",
  "France":              "France",
  "Australia":           "Australia",
  "Denmark":             "Denmark",
  "Tunisia":             "Tunisia",
  "Spain":               "Spain",
  "Costa Rica":          "Costa Rica",
  "Germany":             "Germany",
  "Japan":               "Japan",
  "Belgium":             "Belgium",
  "Canada":              "Canada",
  "Morocco":             "Morocco",
  "Croatia":             "Croatia",
  "Brazil":              "Brazil",
  "Serbia":              "Serbia",
  "Switzerland":         "Switzerland",
  "Cameroon":            "Cameroon",
  "Portugal":            "Portugal",
  "Ghana":               "Ghana",
  "Uruguay":             "Uruguay",
  "Korea Republic":      "South Korea",
  "South Korea":         "South Korea",
  "Ecuador":             "Ecuador",
  "Senegal":             "Senegal",
  "Netherlands":         "Netherlands",
  "Qatar":               "Qatar",
  "England":             "England",
  "Iran":                "Iran",
  "Wales":               "Wales",
  "USA":                 "USA",
  "United States":       "USA",
  "Côte d'Ivoire":       "Ivory Coast",
  "Ivory Coast":         "Ivory Coast",
  "Nigeria":             "Nigeria",
  "Egypt":               "Egypt",
  "Algeria":             "Algeria",
  "Colombia":            "Colombia",
  "Venezuela":           "Venezuela",
  "Chile":               "Chile",
  "Paraguay":            "Paraguay",
  "Bolivia":             "Bolivia",
  "Peru":                "Peru",
  "Panama":              "Panama",
  "Honduras":            "Honduras",
  "El Salvador":         "El Salvador",
  "Jamaica":             "Jamaica",
  "Trinidad and Tobago": "Trinidad and Tobago",
  "Guatemala":           "Guatemala",
  "Indonesia":           "Indonesia",
  "Thailand":            "Thailand",
  "Vietnam":             "Vietnam",
  "Philippines":         "Philippines",
  "New Zealand":         "New Zealand",
  "Uzbekistan":          "Uzbekistan",
  "Iraq":                "Iraq",
  "Jordan":              "Jordan",
  "Bahrain":             "Bahrain",
  "Oman":                "Oman",
  "Kuwait":              "Kuwait",
  "Palestine":           "Palestine",
  "Congo DR":            "DR Congo",
  "Zambia":              "Zambia",
  "Mali":                "Mali",
  "Guinea":              "Guinea",
  "Cape Verde":          "Cape Verde",
  "Tanzania":            "Tanzania",
  "Comoros":             "Comoros",
  "Turkey":              "Turkey",
  "Türkiye":             "Turkey",
  "Ukraine":             "Ukraine",
  "Austria":             "Austria",
  "Hungary":             "Hungary",
  "Scotland":            "Scotland",
  "Greece":              "Greece",
  "Romania":             "Romania",
  "Czech Republic":      "Czech Republic",
  "Slovakia":            "Slovakia",
  "Slovenia":            "Slovenia",
  "Albania":             "Albania",
  "Georgia":             "Georgia",
};

// ── 状态映射 ───────────────────────────────────────────────────────────────
function mapStatus(fdStatus) {
  switch (fdStatus) {
    case "FINISHED":    return "finished";
    case "IN_PLAY":
    case "PAUSED":      return "live";
    case "TIMED":
    case "SCHEDULED":   return "upcoming";
    case "POSTPONED":   return "postponed";
    case "CANCELLED":   return "cancelled";
    default:            return "upcoming";
  }
}

async function fetchMatches() {
  const url = `${FD_BASE}/competitions/${COMPETITION_CODE}/matches`;
  const res = await fetch(url, {
    headers: { "X-Auth-Token": FD_API_KEY },
  });

  if (res.status === 404) {
    console.log("⚠ 世界杯赛事数据暂未开放（赛事未开始），API 返回 404");
    return null;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`football-data.org API 错误: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.matches ?? [];
}

async function syncScores() {
  console.log("🔄 开始同步比分...");

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // 1. 拉取 API 数据
  const apiMatches = await fetchMatches();
  if (!apiMatches) return;
  console.log(`📡 获取到 ${apiMatches.length} 场比赛数据`);

  // 2. 拉取数据库所有比赛
  const { data: dbMatches, error } = await supabase
    .from("matches")
    .select("id, home_team, away_team, kickoff_time, status, home_score, away_score");

  if (error) throw new Error(`Supabase 查询失败: ${error.message}`);

  // 3. 逐条比对并更新
  let updated = 0;
  let skipped = 0;

  for (const apiMatch of apiMatches) {
    const apiHome = TEAM_MAP[apiMatch.homeTeam?.name] ?? apiMatch.homeTeam?.name;
    const apiAway = TEAM_MAP[apiMatch.awayTeam?.name] ?? apiMatch.awayTeam?.name;
    const apiStatus = mapStatus(apiMatch.status);
    const apiHomeScore = apiMatch.score?.fullTime?.home ?? null;
    const apiAwayScore = apiMatch.score?.fullTime?.away ?? null;

    // 匹配数据库记录（按队名）
    const dbMatch = dbMatches.find(
      (m) =>
        m.home_team === apiHome &&
        m.away_team === apiAway
    );

    if (!dbMatch) {
      // 尝试反向匹配（主客场可能不同）
      skipped++;
      continue;
    }

    // 只有状态或比分有变化才更新
    const changed =
      dbMatch.status    !== apiStatus     ||
      dbMatch.home_score !== apiHomeScore ||
      dbMatch.away_score !== apiAwayScore;

    if (!changed) continue;

    const { error: updateErr } = await supabase
      .from("matches")
      .update({
        status:     apiStatus,
        home_score: apiHomeScore,
        away_score: apiAwayScore,
      })
      .eq("id", dbMatch.id);

    if (updateErr) {
      console.error(`❌ 更新失败 ${apiHome} vs ${apiAway}: ${updateErr.message}`);
    } else {
      const scoreStr = apiHomeScore !== null
        ? `${apiHomeScore} - ${apiAwayScore}`
        : "暂无比分";
      console.log(`✅ ${apiHome} vs ${apiAway} → ${apiStatus} [${scoreStr}]`);
      updated++;
    }
  }

  console.log(`\n📊 同步完成：更新 ${updated} 场，跳过 ${skipped} 场（队名未匹配）`);
}

syncScores().catch((err) => {
  console.error("❌ 同步失败:", err.message);
  process.exit(1);
});
