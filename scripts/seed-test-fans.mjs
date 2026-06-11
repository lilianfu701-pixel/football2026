#!/usr/bin/env node
/**
 * scripts/seed-test-fans.mjs
 *
 * 创建 10 个虚拟球迷账号，对每场比赛随机投票（主队 / 中立 / 客队），
 * 坐标随机选自全球陆地城市列表（保证在陆地上）。
 *
 * 用法（在项目根目录）:
 *   node scripts/seed-test-fans.mjs
 *
 * 需要环境变量:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// ── 加载 .env.local ────────────────────────────────────────────────────────────
try {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const idx = line.indexOf("=");
    if (idx < 1) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (k && !process.env[k]) process.env[k] = v;
  }
} catch { /* .env.local 不存在时忽略 */ }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ 缺少环境变量: NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── 10 个虚拟球迷 ──────────────────────────────────────────────────────────────
const FANS = [
  { username: "BrasilFan_Jota",    country: "BR", team: "Brazil"         },
  { username: "SaudiEagle_Ali",    country: "SA", team: "Saudi Arabia"   },
  { username: "DragonFan_Wei",     country: "CN", team: "China PR"       },
  { username: "USKick_Jake",       country: "US", team: "United States"  },
  { username: "TigreAzul_Carlos",  country: "MX", team: "Mexico"         },
  { username: "SambaGol_Paulo",    country: "BR", team: "Brazil"         },
  { username: "RedStar_Kofi",      country: "GH", team: "Ghana"          },
  { username: "BlueStar_Yuki",     country: "JP", team: "Japan"          },
  { username: "KaiserFan_Klaus",   country: "DE", team: "Germany"        },
  { username: "LeoPride_Amaru",    country: "AR", team: "Argentina"      },
];

// ── 全球陆地城市坐标池（约 80 个点，保证在陆地上）─────────────────────────────
// 格式: [lat, lng]
const LAND_POINTS = [
  // 北美
  [40.7128, -74.0060],  // New York
  [34.0522, -118.2437], // Los Angeles
  [41.8781, -87.6298],  // Chicago
  [29.7604, -95.3698],  // Houston
  [33.4484, -112.0740], // Phoenix
  [32.7767, -96.7970],  // Dallas
  [45.4215, -75.6972],  // Ottawa
  [43.6532, -79.3832],  // Toronto
  [45.5051, -73.5550],  // Montreal
  [49.2827, -123.1207], // Vancouver
  [19.4326, -99.1332],  // Mexico City
  [20.6597, -103.3496], // Guadalajara
  [25.6866, -100.3161], // Monterrey
  [15.5009, -88.0251],  // San Pedro Sula (Honduras)
  [9.9281,  -84.0907],  // San José (Costa Rica)
  // 南美
  [-23.5505, -46.6333], // São Paulo
  [-22.9068, -43.1729], // Rio de Janeiro
  [-15.7942, -47.8822], // Brasília
  [-34.6037, -58.3816], // Buenos Aires
  [-31.4201, -64.1888], // Córdoba (Argentina)
  [-33.4489, -70.6693], // Santiago
  [-12.0464, -77.0428], // Lima
  [4.7110,  -74.0721],  // Bogotá
  [10.4806, -66.9036],  // Caracas
  [-25.2867, -57.6470], // Asunción (Paraguay)
  [-0.2299,  -78.5249], // Quito
  [-16.5000, -68.1500], // La Paz
  [3.8480,   11.5021],  // Yaoundé (use this as placeholder — moved to Africa below)
  // 欧洲
  [51.5074,  -0.1278],  // London
  [48.8566,   2.3522],  // Paris
  [52.5200,  13.4050],  // Berlin
  [48.1351,  11.5820],  // Munich
  [52.3676,   4.9041],  // Amsterdam
  [41.3851,   2.1734],  // Barcelona
  [40.4168,  -3.7038],  // Madrid
  [41.9028,  12.4964],  // Rome
  [45.4642,   9.1900],  // Milan
  [48.2082,  16.3738],  // Vienna
  [50.0755,  14.4378],  // Prague
  [52.2297,  21.0122],  // Warsaw
  [55.7558,  37.6173],  // Moscow
  [59.9343,  30.3351],  // St. Petersburg
  [38.7169,  -9.1395],  // Lisbon
  [47.3769,   8.5417],  // Zurich
  [50.8503,   4.3517],  // Brussels
  [53.3498,  -6.2603],  // Dublin
  [59.3293,  18.0686],  // Stockholm
  [60.1699,  24.9384],  // Helsinki
  [55.6761,  12.5683],  // Copenhagen
  [43.7102,   7.2620],  // Nice
  [41.0082,  28.9784],  // Istanbul
  [37.9838,  23.7275],  // Athens
  [44.8176,  20.4633],  // Belgrade
  [47.4979,  19.0402],  // Budapest
  [44.4268,  26.1025],  // Bucharest
  // 非洲
  [30.0444,  31.2357],  // Cairo
  [6.5244,    3.3792],  // Lagos
  [-26.2041,  28.0473], // Johannesburg
  [-33.9249,  18.4241], // Cape Town
  [-25.9667,  32.5833], // Maputo (Mozambique)
  [5.6037,   -0.1870],  // Accra
  [3.8480,   11.5021],  // Yaoundé (Cameroon)
  [-1.2921,  36.8219],  // Nairobi
  [15.5007,  32.5599],  // Khartoum
  [33.9716,  -6.8498],  // Rabat
  [36.8065,  10.1815],  // Tunis
  [-18.9249,  47.5186], // Antananarivo
  [0.3476,    6.7273],  // São Tomé
  // 中东
  [24.7136,  46.6753],  // Riyadh
  [25.2048,  55.2708],  // Dubai
  [33.3152,  44.3661],  // Baghdad
  [35.6892,  51.3890],  // Tehran
  [31.7683,  35.2137],  // Jerusalem
  [33.8938,  35.5018],  // Beirut
  [31.9522,  35.2332],  // Amman
  [25.2760,  51.5200],  // Doha
  // 南亚
  [28.6139,  77.2090],  // New Delhi
  [19.0760,  72.8777],  // Mumbai
  [22.5726,  88.3639],  // Kolkata
  [13.0827,  80.2707],  // Chennai
  [23.8103,  90.4125],  // Dhaka
  [33.6844,  73.0479],  // Islamabad
  [6.9271,   79.8612],  // Colombo
  [27.7172,  85.3240],  // Kathmandu
  // 东亚 / 东南亚
  [39.9042,  116.4074], // Beijing
  [31.2304,  121.4737], // Shanghai
  [23.1291,  113.2644], // Guangzhou
  [22.5431,  114.0579], // Shenzhen
  [35.6762,  139.6503], // Tokyo
  [34.6937,  135.5023], // Osaka
  [37.5665,  126.9780], // Seoul
  [21.0245,  105.8412], // Hanoi
  [10.8231,  106.6297], // Ho Chi Minh City
  [3.1390,   101.6869], // Kuala Lumpur
  [13.7563,  100.5018], // Bangkok
  [-6.2088,  106.8456], // Jakarta
  [-7.2575,  112.7521], // Surabaya
  [14.5995,  120.9842], // Manila
  [1.3521,   103.8198], // Singapore
  [16.8661,  96.1951],  // Yangon
  [11.5564,  104.9282], // Phnom Penh
  // 大洋洲
  [-33.8688, 151.2093], // Sydney
  [-37.8136, 144.9631], // Melbourne
  [-27.4698, 153.0251], // Brisbane
  [-31.9505, 115.8605], // Perth
  [-36.8485, 174.7633], // Auckland
  [-43.5321, 172.6362], // Christchurch
];

// ── 随机工具函数 ───────────────────────────────────────────────────────────────

/** 从陆地坐标池随机取一个点，加 ±0.8° 抖动使地图点不重叠 */
function randCoord() {
  const [lat, lng] = LAND_POINTS[Math.floor(Math.random() * LAND_POINTS.length)];
  const jitter = () => (Math.random() - 0.5) * 1.6;
  // 保证不越界
  return {
    lat: Math.max(-85, Math.min(85, lat + jitter())),
    lng: Math.max(-180, Math.min(180, lng + jitter())),
  };
}

/** 随机投票：主队 42% / 中立 16% / 客队 42% */
function randVote() {
  const r = Math.random();
  if (r < 0.42) return "home";
  if (r < 0.58) return "neutral";
  return "away";
}

/** 延时 ms 毫秒 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 主流程 ────────────────────────────────────────────────────────────────────
async function main() {
  // 1. 获取所有比赛 id
  console.log("📋 获取所有比赛...");
  const { data: matches, error: mErr } = await supabase.from("matches").select("id").order("id");
  if (mErr) { console.error("❌ 获取比赛失败:", mErr.message); process.exit(1); }
  console.log(`✅ 共 ${matches.length} 场比赛\n`);

  const readyUsers = [];

  // 2. 创建或复用 10 个虚拟账号
  for (const fan of FANS) {
    const email = `${fan.username.toLowerCase()}@football2026bot.net`;
    console.log(`👤 处理会员: ${fan.username}`);

    // 检查 public.users 是否已存在（避免重复创建）
    const { data: existing } = await supabase
      .from("users")
      .select("id, nickname")
      .eq("nickname", fan.username)
      .maybeSingle();

    if (existing) {
      console.log(`   ↩️  已存在，复用 id=${existing.id}`);
      readyUsers.push({ id: existing.id, ...fan });
      continue;
    }

    // 创建 auth 用户 → DB trigger 自动写入 public.users
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: `Fan2026_${Math.random().toString(36).slice(2, 10)}!`,
      email_confirm: true,
      user_metadata: {
        username:      fan.username,
        country_code:  fan.country,
        favorite_team: fan.team,
      },
    });

    if (authErr) {
      // 如果是邮箱已注册，尝试用邮箱找到已有用户
      if (authErr.message?.includes("already registered")) {
        const { data: byEmail } = await supabase
          .from("users")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        if (byEmail) {
          console.log(`   ↩️  Auth 已存在，复用 id=${byEmail.id}`);
          readyUsers.push({ id: byEmail.id, ...fan });
          continue;
        }
      }
      console.error(`   ❌ 创建 auth 失败: ${authErr.message}`);
      continue;
    }

    const userId = authData.user.id;
    console.log(`   ✅ Auth 用户已创建 id=${userId}`);

    // 等 trigger 写入 public.users（通常同步，留 500ms 余量）
    await sleep(500);

    // 更新 country_code 和 favorite_team（trigger 只设 nickname）
    const { error: updErr } = await supabase
      .from("users")
      .update({ country_code: fan.country, favorite_team: fan.team, nickname: fan.username })
      .eq("id", userId);

    if (updErr) {
      console.warn(`   ⚠️  更新 profile 失败: ${updErr.message}`);
    } else {
      console.log(`   ✅ Profile 更新: country=${fan.country}, team=${fan.team}`);
    }

    readyUsers.push({ id: userId, ...fan });
    await sleep(200); // 避免限流
  }

  console.log(`\n✅ 共 ${readyUsers.length} 个会员就绪\n`);
  if (readyUsers.length === 0) { console.error("没有可用的会员，退出"); process.exit(1); }

  // 3. 为每个会员 × 每场比赛生成一条投票记录
  const rows = [];
  // ── 确保 lat/lng 列存在（执行 migration 050）─────────────────────────────
  const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
  const projectRef   = (SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/) ?? [])[1];

  let hasCoords = false;

  if (ACCESS_TOKEN && projectRef) {
    console.log("🔧 通过 Management API 执行 migration 050（添加 lat/lng 列）...");

    const execSQL = async (sql) => {
      const res = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
        {
          method:  "POST",
          headers: {
            Authorization:  `Bearer ${ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: sql }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message ?? `HTTP ${res.status}`);
      return json;
    };

    try {
      await execSQL(
        `ALTER TABLE match_votes
           ADD COLUMN IF NOT EXISTS lat double precision,
           ADD COLUMN IF NOT EXISTS lng double precision;`,
      );
      // 通知 PostgREST 刷新 schema cache
      await execSQL(`NOTIFY pgrst, 'reload schema';`);
      console.log("   ✅ 列已添加，等待 schema cache 刷新（3秒）...");
      await sleep(3000);
      hasCoords = true;
    } catch (e) {
      console.warn(`   ⚠️  Management API 执行失败: ${e.message}，将跳过坐标`);
    }
  } else {
    console.log("   ⚠️  没有 SUPABASE_ACCESS_TOKEN，跳过坐标列");
  }

  for (const user of readyUsers) {
    for (const match of matches) {
      const { lat, lng } = randCoord();
      const row = {
        match_id: match.id,
        user_id:  user.id,
        vote:     randVote(),
      };
      if (hasCoords) { row.lat = lat; row.lng = lng; }
      rows.push(row);
    }
  }

  const total = rows.length;
  console.log(`📤 准备 upsert ${total} 条投票 (${readyUsers.length} 会员 × ${matches.length} 场比赛)...\n`);

  // 分批 upsert，每批 200 条
  const CHUNK = 200;
  let done = 0;
  let errCount = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("match_votes")
      .upsert(chunk, { onConflict: "match_id,user_id" });

    if (error) {
      console.error(`   ❌ Upsert 失败 (chunk ${i}-${i + CHUNK}): ${error.message}`);
      errCount++;
    } else {
      done += chunk.length;
    }

    // 进度显示
    const pct = Math.round((Math.min(i + CHUNK, total) / total) * 100);
    process.stdout.write(`   进度: ${Math.min(i + CHUNK, total)}/${total} (${pct}%)\r`);
  }

  console.log(`\n\n🎉 完成！`);
  console.log(`   ✅ 成功 upsert: ${done} 条`);
  if (errCount) console.log(`   ⚠️  失败批次: ${errCount}`);
  console.log(`\n球迷地图现在有 ${readyUsers.length} 个测试会员的数据，快去查看效果！`);
}

main().catch((e) => {
  console.error("💥 未捕获异常:", e);
  process.exit(1);
});
