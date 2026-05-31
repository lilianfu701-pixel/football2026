const FALLBACK_MOBILE_PATH = "/m?view=home";

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

export function getMobileLoginHref(locale: string) {
  if (typeof window === "undefined") return `/${locale}/m/login`;
  const pathWithoutLocale = window.location.pathname.replace(/^\/[^/]+/, "") || "/m";
  const next = normalizeMobileNext(`${pathWithoutLocale}${window.location.search}`);
  return `/${locale}/m/login?next=${encodeURIComponent(next)}`;
}

export function redirectToMobileLogin(locale: string) {
  window.location.assign(getMobileLoginHref(locale));
}
