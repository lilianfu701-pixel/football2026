import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";

export const runtime = "edge";

function fmt(n: number): string {
  if (n >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(1) + "T";
  if (n >= 1_000_000_000)     return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000)         return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)             return (n / 1_000).toFixed(0) + "K";
  return String(n);
}

export async function GET(req: NextRequest) {
  const origin   = req.nextUrl.origin;
  const p        = req.nextUrl.searchParams;
  const home     = p.get("home")     ?? "Home";
  const away     = p.get("away")     ?? "Away";
  const hc       = p.get("hc")       ?? "";
  const ac       = p.get("ac")       ?? "";
  const pick     = p.get("pick")     ?? "home";
  const gc       = Number(p.get("gc")    ?? 0);
  const odds     = Number(p.get("odds")  ?? 2);
  const user     = p.get("user")     ?? "Player";
  const loc      = p.get("locale")   ?? "en";
  const stage    = p.get("stage")    ?? "";
  const matchId  = p.get("match_id") ?? "";
  const zh       = loc === "zh";

  // Pick label + color
  const pickLabels: Record<string, string> = {
    home: zh ? `${home} 胜` : `${home} Win`,
    draw: zh ? "平局"        : "Draw",
    away: zh ? `${away} 胜` : `${away} Win`,
  };
  const pickColors: Record<string, string> = {
    home: "#60A5FA",
    draw: "#9CA3AF",
    away: "#FBBF24",
  };
  const pickLabel = pickLabels[pick]  ?? pick;
  const pickColor = pickColors[pick]  ?? "#FFD700";
  const payout    = Math.floor(gc * odds);

  const homeFlagUrl = hc ? `https://flagcdn.com/w80/${hc}.png` : null;
  const awayFlagUrl = ac ? `https://flagcdn.com/w80/${ac}.png` : null;

  // QR code: encode the match page URL (or site root if no matchId)
  const qrTarget  = matchId
    ? `https://football2026.net/${loc === "en" ? "" : loc + "/"}matches/${matchId}`
    : `https://football2026.net`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrTarget)}&bgcolor=FFFFFF&color=0A1628&margin=1&format=png`;

  return new ImageResponse(
    <div
      style={{
        width: "100%", height: "100%",
        display: "flex", flexDirection: "column",
        background: "linear-gradient(135deg, #060E1E 0%, #0F2040 40%, #091830 100%)",
        color: "white",
        fontFamily: "system-ui, -apple-system, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background decorative circles */}
      <div style={{
        position: "absolute", top: -120, right: -120,
        width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,215,0,0.07) 0%, transparent 70%)",
      }} />
      <div style={{
        position: "absolute", bottom: -80, left: -80,
        width: 350, height: 350, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(124,111,224,0.08) 0%, transparent 70%)",
      }} />

      {/* Gold top stripe */}
      <div style={{
        height: 6,
        background: "linear-gradient(90deg, #FFD700 0%, #FF8C00 50%, #FFD700 100%)",
        width: "100%", flexShrink: 0,
      }} />

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "20px 50px 16px",
        borderBottom: "1px solid rgba(255,215,0,0.12)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${origin}/icons/levels/logo.png`}
            width={44} height={44}
            style={{ borderRadius: 10, objectFit: "cover" }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#FFD700", letterSpacing: 2 }}>
              FOOTBALL2026
            </span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", letterSpacing: 1 }}>
              WORLD CUP 2026 PREDICTION GAME
            </span>
          </div>
        </div>
        {stage && (
          <div style={{
            marginLeft: "auto",
            background: "rgba(255,215,0,0.12)",
            border: "1px solid rgba(255,215,0,0.25)",
            borderRadius: 8,
            padding: "4px 14px",
            fontSize: 13, fontWeight: 700, color: "#FFD700",
          }}>
            {stage}
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{
        display: "flex", flex: 1,
        alignItems: "center",
        padding: "0 50px",
      }}>
        {/* Teams section */}
        <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
          {/* Home team */}
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: 14, flex: 1,
          }}>
            {homeFlagUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={homeFlagUrl} style={{ width: 100, height: 67, borderRadius: 6, objectFit: "cover", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }} />
            ) : (
              <div style={{ width: 100, height: 67, borderRadius: 6, background: "#1E3A5F", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 24 }}>🏳️</span>
              </div>
            )}
            <span style={{ fontSize: 28, fontWeight: 900, textAlign: "center", maxWidth: 200, lineHeight: 1.2 }}>
              {home}
            </span>
          </div>

          {/* VS */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 30px" }}>
            <span style={{ fontSize: 22, color: "rgba(255,255,255,0.25)", fontWeight: 700 }}>VS</span>
          </div>

          {/* Away team */}
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: 14, flex: 1,
          }}>
            {awayFlagUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={awayFlagUrl} style={{ width: 100, height: 67, borderRadius: 6, objectFit: "cover", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }} />
            ) : (
              <div style={{ width: 100, height: 67, borderRadius: 6, background: "#1E3A5F", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 24 }}>🏳️</span>
              </div>
            )}
            <span style={{ fontSize: 28, fontWeight: 900, textAlign: "center", maxWidth: 200, lineHeight: 1.2 }}>
              {away}
            </span>
          </div>
        </div>

        {/* Vertical divider */}
        <div style={{
          width: 1, height: 220,
          background: "linear-gradient(to bottom, transparent, rgba(255,215,0,0.2), transparent)",
          margin: "0 50px", flexShrink: 0,
        }} />

        {/* Prediction card */}
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: 18,
          minWidth: 300,
        }}>
          <span style={{
            fontSize: 12, fontWeight: 700,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: 3, textTransform: "uppercase",
          }}>
            {zh ? "我的预测" : "MY PREDICTION"}
          </span>

          {/* Pick badge */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            background: `linear-gradient(135deg, ${pickColor}22, ${pickColor}11)`,
            border: `2px solid ${pickColor}`,
            borderRadius: 18,
            padding: "18px 40px",
            minWidth: 240,
          }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: pickColor, textAlign: "center", lineHeight: 1.2 }}>
              {pickLabel}
            </span>
          </div>

          {/* Stakes */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                {zh ? "押注" : "Bet"}
              </span>
              <span style={{ fontSize: 17, fontWeight: 900, color: "#FFD700" }}>
                {fmt(gc)} GC
              </span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>
                × {odds}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
                {zh ? "潜在获得" : "Potential win"}
              </span>
              <span style={{ fontSize: 22, fontWeight: 900, color: "#34D399" }}>
                {fmt(payout)} GC
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer — user + QR code */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 50px",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(0,0,0,0.3)",
        flexShrink: 0,
        gap: 20,
      }}>
        {/* Left: user avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "linear-gradient(135deg, #7C6FE0, #4F46E5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 900, color: "white",
          }}>
            {user.slice(0, 1).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>
              @{user}
            </span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
              {zh ? "加入竞猜 · 赢取 GoalCoin" : "Join Football2026 · Win GoalCoin"}
            </span>
          </div>
        </div>

        {/* Right: QR code + site URL */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
              {zh ? "扫码参与竞猜" : "Scan to join the game"}
            </span>
            <span style={{ fontSize: 13, color: "#FFD700", fontWeight: 800, letterSpacing: 0.5 }}>
              football2026.net
            </span>
          </div>
          {/* QR code image — white background for max scan contrast */}
          <div style={{
            background: "white",
            borderRadius: 10,
            padding: 5,
            display: "flex",
            boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeUrl}
              style={{ width: 68, height: 68, display: "block" }}
            />
          </div>
        </div>
      </div>

      {/* Gold bottom stripe */}
      <div style={{
        height: 4,
        background: "linear-gradient(90deg, #FFD700 0%, #FF8C00 50%, #FFD700 100%)",
        width: "100%", flexShrink: 0,
      }} />
    </div>,
    { width: 1200, height: 630 }
  );
}
