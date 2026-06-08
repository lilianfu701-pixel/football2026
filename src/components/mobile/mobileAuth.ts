const FALLBACK_MOBILE_PATH = "/m?view=home";
export const MOBILE_OAUTH_NEXT_COOKIE = "football2026_mobile_oauth_next";

function isSupabaseAuthCookie(name: string) {
  return name.startsWith("sb-") && name.includes("-auth-token");
}

export function clearStaleMobileAuthCookies() {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const cookieNames = document.cookie
    .split(";")
    .map((cookie) => cookie.trim().split("=")[0])
    .filter(isSupabaseAuthCookie);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const isProductionHost =
    window.location.hostname === "football2026.net"
    || window.location.hostname.endsWith(".football2026.net");

  for (const name of new Set(cookieNames)) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    if (isProductionHost) {
      document.cookie = `${name}=; Path=/; Domain=.football2026.net; Max-Age=0; SameSite=Lax${secure}`;
    }
  }
}

export function normalizeMobileNext(value?: string | null) {
  if (!value) return FALLBACK_MOBILE_PATH;

  try {
    const url = new URL(value, "https://mobile.local");
    if (
      url.origin !== "https://mobile.local" ||
      (url.pathname !== "/m" && !url.pathname.startsWith("/m/")) ||
      url.pathname === "/m/login"
    ) {
      return FALLBACK_MOBILE_PATH;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return FALLBACK_MOBILE_PATH;
  }
}

export function normalizeMobileAuthNext(value?: string | null) {
  const next = normalizeMobileNext(value);
  try {
    const url = new URL(next, "https://mobile.local");
    url.searchParams.delete("preview");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return FALLBACK_MOBILE_PATH;
  }
}

export function getMobileLoginHref(locale: string) {
  if (typeof window === "undefined") return `/${locale}/m/login`;
  const pathWithoutLocale = window.location.pathname.replace(/^\/[^/]+/, "") || "/m";
  const next = normalizeMobileAuthNext(`${pathWithoutLocale}${window.location.search}`);
  return `/${locale}/m/login?next=${encodeURIComponent(next)}`;
}

export function rememberMobileOAuthNext(nextValue: string) {
  const next = normalizeMobileNext(nextValue);
  if (typeof window === "undefined") return next;

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const sharedDomain =
    window.location.hostname === "football2026.net" || window.location.hostname.endsWith(".football2026.net")
      ? "; Domain=.football2026.net"
      : "";
  document.cookie = `${MOBILE_OAUTH_NEXT_COOKIE}=${encodeURIComponent(next)}; Path=/; Max-Age=900; SameSite=Lax${secure}${sharedDomain}`;
  return next;
}

export function getMobileOAuthCallbackUrl(locale: string, nextValue: string) {
  if (typeof window === "undefined") return `/auth/callback?locale=${locale}&next=${encodeURIComponent(normalizeMobileNext(nextValue))}&mobile=1`;
  const next = rememberMobileOAuthNext(nextValue);
  const productionMobileOrigin =
    window.location.hostname === "football2026.net" ||
    window.location.hostname === "www.football2026.net" ||
    window.location.hostname === "m.football2026.net"
      ? "https://m.football2026.net"
      : window.location.origin;
  return `${productionMobileOrigin}/auth/callback?locale=${encodeURIComponent(locale)}&next=${encodeURIComponent(next)}&mobile=1`;
}

export function isLocalMobileOAuthHost() {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

export function getProductionMobileLoginUrl(locale: string, nextValue: string) {
  const next = normalizeMobileNext(nextValue);
  const url = new URL(`/${locale}/m/login`, "https://m.football2026.net");
  url.searchParams.set("next", next);
  return url.toString();
}

export function redirectToMobileLogin(locale: string) {
  window.location.assign(getMobileLoginHref(locale));
}
