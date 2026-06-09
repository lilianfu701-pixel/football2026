import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const COPY: Record<string, { tagline: string; predict: string; earn: string; win: string }> = {
  en: { tagline: "2026 World Cup Prediction Game",     predict: "Predict",  earn: "Earn GoalCoins", win: "Win Big"     },
  zh: { tagline: "2026世界杯助威预测平台",               predict: "预测",     earn: "赢取GoalCoin",   win: "登顶排行榜"  },
  es: { tagline: "Predicción Copa del Mundo 2026",     predict: "Predice",  earn: "Gana GoalCoins", win: "Gana"        },
  pt: { tagline: "Previsão Copa do Mundo 2026",        predict: "Preveja",  earn: "Ganhe GoalCoins",win: "Vença"       },
  fr: { tagline: "Prédiction Coupe du Monde 2026",     predict: "Prédis",   earn: "Gagne des GC",   win: "Gagne"       },
  de: { tagline: "WM 2026 Tippspiel",                  predict: "Tippe",    earn: "GoalCoins",      win: "Gewinne"     },
  ar: { tagline: "توقعات كأس العالم 2026",             predict: "توقع",     earn: "اكسب GoalCoins", win: "انتصر"       },
  ja: { tagline: "2026ワールドカップ予想ゲーム",           predict: "予想",     earn: "GC獲得",         win: "優勝"        },
  ko: { tagline: "2026 월드컵 예측 게임",               predict: "예측",     earn: "GoalCoin 획득",  win: "우승"        },
  ru: { tagline: "Прогнозы Чемпионат Мира 2026",       predict: "Предсказы",earn: "Зарабатывай GC", win: "Побеждай"    },
  vi: { tagline: "Dự Đoán World Cup 2026",             predict: "Dự đoán",  earn: "Kiếm GoalCoins", win: "Chiến thắng" },
  id: { tagline: "Prediksi Piala Dunia 2026",          predict: "Prediksi", earn: "Menangkan GC",   win: "Menang"      },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") ?? "en";
  const c = COPY[locale] ?? COPY.en;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(135deg, #0A1628 0%, #0F2040 55%, #162840 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative glow circles */}
        <div style={{
          position: "absolute", top: -120, right: -120,
          width: 480, height: 480, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,215,0,0.12) 0%, transparent 70%)",
          display: "flex",
        }} />
        <div style={{
          position: "absolute", bottom: -160, left: -160,
          width: 560, height: 560, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,215,0,0.07) 0%, transparent 70%)",
          display: "flex",
        }} />

        {/* Gold accent bar top */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: 6,
          background: "linear-gradient(90deg, transparent, #FFD700, transparent)",
          display: "flex",
        }} />

        {/* Main content column */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
          padding: "0 80px",
          zIndex: 1,
          width: "100%",
        }}>

          {/* Football */}
          <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 20 }}>⚽</div>

          {/* Site name */}
          <div style={{
            fontSize: 96,
            fontWeight: 900,
            color: "#FFD700",
            letterSpacing: "-3px",
            lineHeight: 1,
            marginBottom: 18,
          }}>
            Football2026
          </div>

          {/* Tagline */}
          <div style={{
            fontSize: 34,
            fontWeight: 600,
            color: "rgba(255,255,255,0.80)",
            textAlign: "center",
            lineHeight: 1.3,
            marginBottom: 32,
            maxWidth: 900,
          }}>
            {c.tagline}
          </div>

          {/* Gold divider */}
          <div style={{
            width: 100, height: 3,
            background: "#FFD700",
            borderRadius: 2,
            marginBottom: 32,
            display: "flex",
          }} />

          {/* Feature pills */}
          <div style={{ display: "flex", gap: 24, marginBottom: 40 }}>
            {[
              { emoji: "🎯", text: c.predict },
              { emoji: "🪙", text: c.earn },
              { emoji: "🏆", text: c.win },
            ].map(({ emoji, text }) => (
              <div
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "rgba(255,215,0,0.08)",
                  border: "1.5px solid rgba(255,215,0,0.25)",
                  borderRadius: 40,
                  padding: "10px 24px",
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 24,
                  fontWeight: 600,
                }}
              >
                <span>{emoji}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* Domain */}
          <div style={{
            fontSize: 22,
            color: "rgba(255,215,0,0.55)",
            letterSpacing: "3px",
            textTransform: "uppercase",
          }}>
            football2026.net
          </div>
        </div>

        {/* Gold accent bar bottom */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: 4,
          background: "linear-gradient(90deg, transparent, rgba(255,215,0,0.5), transparent)",
          display: "flex",
        }} />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
