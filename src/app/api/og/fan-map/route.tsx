import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

// Fetch a remote image and return as base64 data URL (edge-safe — no Node Buffer)
async function fetchImageBase64(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const buf   = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary  = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:image/png;base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

// Convert hex + alpha to CSS rgba string
function hexAlpha(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * GET /api/og/fan-map
 *
 * Query params:
 *   home, away        — team display names
 *   homeCode, awayCode — ISO 3166-1 alpha-2 flag codes (e.g. "de", "es")
 *   homePct, awayPct  — vote percentages (0-100)
 *   fans              — total vote count
 *   homeColor, awayColor — hex color without "#" (e.g. "3B82F6")
 *   vote              — "home" | "away" (shows "I support X!" badge)
 *   locale            — current locale (for zh/en copy)
 */
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;

  const home      = sp.get("home")      ?? "Home";
  const away      = sp.get("away")      ?? "Away";
  const homeCode  = sp.get("homeCode")  ?? "";
  const awayCode  = sp.get("awayCode")  ?? "";
  const homePct   = Math.min(100, Math.max(0, Number(sp.get("homePct")) || 50));
  const awayPct   = Math.min(100, Math.max(0, Number(sp.get("awayPct")) || 50));
  const fans      = sp.get("fans")      ?? "";
  const homeHex   = `#${(sp.get("homeColor") ?? "3B82F6").replace("#", "")}`;
  const awayHex   = `#${(sp.get("awayColor") ?? "EF4444").replace("#", "")}`;
  const vote      = sp.get("vote");   // "home" | "away" | null
  const locale    = sp.get("locale")    ?? "en";
  const zh        = locale === "zh";

  // Fetch flag images in parallel
  const [homeFlagData, awayFlagData] = await Promise.all([
    homeCode ? fetchImageBase64(`https://flagcdn.com/w160/${homeCode}.png`) : Promise.resolve(null),
    awayCode ? fetchImageBase64(`https://flagcdn.com/w160/${awayCode}.png`) : Promise.resolve(null),
  ]);

  const voteTeam  = vote === "home" ? home : vote === "away" ? away : null;
  const voteLabel = voteTeam
    ? (zh ? `⚽ 我支持 ${voteTeam}！` : `⚽ I support ${voteTeam}!`)
    : null;

  const heading = zh ? "🌍 全球球迷支持地图" : "🌍 Global Fan Support Map";
  const fanText = fans && Number(fans) > 0
    ? (zh ? `${Number(fans).toLocaleString()} 名球迷已投票` : `${Number(fans).toLocaleString()} fans have voted`)
    : (zh ? "加入全球球迷地图！" : "Join the global fan map!");
  const cta = zh
    ? "在 football2026.net 投票 · 发射道具 · 赢取 GoalCoin"
    : "Vote · Fire Props · Earn GoalCoins · football2026.net";

  // Flag placeholder (shown when flag fetch fails)
  const FlagPlaceholder = ({ color }: { color: string }) => (
    <div
      style={{
        width: 120, height: 80,
        background: hexAlpha(color, 0.25),
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 38,
        border: `2px solid ${hexAlpha(color, 0.35)}`,
      }}
    >
      🏳
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200, height: 630,
          background: "linear-gradient(135deg, #0A1628 0%, #0F2040 55%, #0D1C38 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, Arial, sans-serif",
          position: "relative",
          overflow: "hidden",
          color: "white",
        }}
      >
        {/* Top gold accent bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 5,
          background: "linear-gradient(90deg, transparent 0%, #FFD700 35%, #FFD700 65%, transparent 100%)",
          display: "flex",
        }} />

        {/* Home glow (top-left) */}
        <div style={{
          position: "absolute", top: -160, left: -160,
          width: 520, height: 520, borderRadius: "50%",
          background: `radial-gradient(circle, ${hexAlpha(homeHex, 0.14)} 0%, transparent 70%)`,
          display: "flex",
        }} />

        {/* Away glow (bottom-right) */}
        <div style={{
          position: "absolute", bottom: -160, right: -160,
          width: 520, height: 520, borderRadius: "50%",
          background: `radial-gradient(circle, ${hexAlpha(awayHex, 0.14)} 0%, transparent 70%)`,
          display: "flex",
        }} />

        {/* Title */}
        <div style={{
          fontSize: 38, fontWeight: 800,
          color: "rgba(255,255,255,0.93)",
          marginBottom: 6,
          letterSpacing: "-0.5px",
          display: "flex",
        }}>
          {heading}
        </div>

        {/* Fan count */}
        <div style={{
          fontSize: 18,
          color: "rgba(255,215,0,0.75)",
          marginBottom: voteLabel ? 14 : 22,
          display: "flex",
        }}>
          {fanText}
        </div>

        {/* "I support X!" personal badge */}
        {voteLabel && (
          <div style={{
            background: "rgba(255,215,0,0.10)",
            border: "2px solid rgba(255,215,0,0.50)",
            borderRadius: 50,
            padding: "5px 28px",
            fontSize: 22, fontWeight: 900,
            color: "#FFD700",
            marginBottom: 18,
            display: "flex",
          }}>
            {voteLabel}
          </div>
        )}

        {/* Teams row */}
        <div style={{
          display: "flex",
          gap: 28,
          width: 1060,
          alignItems: "stretch",
        }}>
          {/* Home team card */}
          <div style={{
            flex: 1,
            background: `linear-gradient(145deg, ${hexAlpha(homeHex, 0.18)}, ${hexAlpha(homeHex, 0.05)})`,
            border: `2px solid ${hexAlpha(homeHex, 0.50)}`,
            borderRadius: 20,
            padding: "22px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}>
            {homeFlagData
              ? <img src={homeFlagData} width={120} height={80}
                  style={{ objectFit: "cover", borderRadius: 8, border: "2px solid rgba(255,255,255,0.10)" }} />
              : <FlagPlaceholder color={homeHex} />
            }
            <div style={{ fontSize: 20, fontWeight: 800, color: "white", textAlign: "center", display: "flex" }}>
              {home}
            </div>
            {/* Vote bar */}
            <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${homePct}%`, height: "100%", background: homeHex, display: "flex" }} />
            </div>
            <div style={{ fontSize: 48, fontWeight: 900, color: homeHex, lineHeight: 1, display: "flex" }}>
              {homePct}%
            </div>
          </div>

          {/* VS divider + prop emojis */}
          <div style={{
            width: 84, display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 14,
          }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: "rgba(255,255,255,0.22)", display: "flex" }}>
              VS
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>🎆</span>
              <span style={{ fontSize: 18, lineHeight: 1 }}>⚽</span>
              <span style={{ fontSize: 18, lineHeight: 1 }}>💙</span>
              <span style={{ fontSize: 18, lineHeight: 1 }}>😤</span>
            </div>
          </div>

          {/* Away team card */}
          <div style={{
            flex: 1,
            background: `linear-gradient(145deg, ${hexAlpha(awayHex, 0.18)}, ${hexAlpha(awayHex, 0.05)})`,
            border: `2px solid ${hexAlpha(awayHex, 0.50)}`,
            borderRadius: 20,
            padding: "22px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}>
            {awayFlagData
              ? <img src={awayFlagData} width={120} height={80}
                  style={{ objectFit: "cover", borderRadius: 8, border: "2px solid rgba(255,255,255,0.10)" }} />
              : <FlagPlaceholder color={awayHex} />
            }
            <div style={{ fontSize: 20, fontWeight: 800, color: "white", textAlign: "center", display: "flex" }}>
              {away}
            </div>
            {/* Vote bar */}
            <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${awayPct}%`, height: "100%", background: awayHex, display: "flex" }} />
            </div>
            <div style={{ fontSize: 48, fontWeight: 900, color: awayHex, lineHeight: 1, display: "flex" }}>
              {awayPct}%
            </div>
          </div>
        </div>

        {/* CTA footer */}
        <div style={{ marginTop: 22, fontSize: 15, color: "rgba(255,215,0,0.55)", display: "flex" }}>
          {cta}
        </div>

        {/* Bottom gold accent bar */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
          background: "linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.5) 35%, rgba(255,215,0,0.5) 65%, transparent 100%)",
          display: "flex",
        }} />
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
