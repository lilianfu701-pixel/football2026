"use client";
import { useState } from "react";

const LOCALES = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "ru", label: "Русский" },
  { code: "ar", label: "العربية" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "id", label: "Bahasa Indonesia" },
];

function localePath(code: string): string {
  return code === "en" ? "/m" : `/${code}/m`;
}

// Persist the explicit language choice so proxy.ts getPreferredLocale() honours
// it instead of falling back to the browser Accept-Language header. This is what
// fixes "tap English but land back on /zh/m": English navigates to the
// prefix-less "/m", and without this cookie a Chinese-browser visitor would be
// redirected to /zh/m by the device middleware. We MUST write "en" explicitly
// (not clear the cookie) so the default locale also wins over Accept-Language.
function persistLocaleChoice(code: string): void {
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=${oneYear}; samesite=lax`;
}

export default function MobileLocaleSwitcher({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating locale pill */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: "88px",
          right: "12px",
          zIndex: 9998,
          display: "flex",
          alignItems: "center",
          gap: "5px",
          background: "rgba(15,15,35,0.82)",
          color: "#e0e0ff",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "999px",
          padding: "5px 11px 5px 8px",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.04em",
          cursor: "pointer",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
          userSelect: "none",
        }}
      >
        <span style={{ fontSize: "15px", lineHeight: 1 }}>🌐</span>
        {locale.toUpperCase()}
      </button>

      {/* Bottom sheet overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(0,0,0,0.52)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "#13132b",
              borderRadius: "18px 18px 0 0",
              paddingBottom: "env(safe-area-inset-bottom, 24px)",
              maxHeight: "72vh",
              overflowY: "auto",
            }}
          >
            {/* Handle bar */}
            <div
              style={{
                width: "36px",
                height: "4px",
                background: "rgba(255,255,255,0.18)",
                borderRadius: "2px",
                margin: "12px auto 4px",
              }}
            />
            <div
              style={{
                padding: "8px 20px 12px",
                color: "#666",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              LANGUAGE / 语言
            </div>

            {LOCALES.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  persistLocaleChoice(l.code);
                  window.location.href = localePath(l.code);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  padding: "13px 20px",
                  background:
                    l.code === locale
                      ? "rgba(96,165,250,0.1)"
                      : "transparent",
                  border: "none",
                  color: l.code === locale ? "#fff" : "#9ca3af",
                  fontSize: "15px",
                  cursor: "pointer",
                  textAlign: "left",
                  gap: "12px",
                }}
              >
                <span
                  style={{
                    minWidth: "30px",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    color: l.code === locale ? "#60a5fa" : "#4b5563",
                  }}
                >
                  {l.code.toUpperCase()}
                </span>
                <span style={{ flex: 1 }}>{l.label}</span>
                {l.code === locale && (
                  <span
                    style={{ fontSize: "14px", color: "#60a5fa" }}
                  >
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}