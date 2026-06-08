import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";
import { getSharedAuthCookieOptions } from "./lib/supabase/cookieOptions";

const intlMiddleware = createIntlMiddleware(routing);
const MOBILE_OAUTH_NEXT_COOKIE = "football2026_mobile_oauth_next";

function isMobileUserAgent(userAgent: string) {
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone|Opera Mini|IEMobile/i.test(userAgent);
}

function isProductionHost(hostname: string) {
  return hostname === "football2026.net" || hostname === "www.football2026.net" || hostname === "m.football2026.net";
}

function splitLocalePath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const maybeLocale = parts[0];
  const hasLocale = routing.locales.includes(maybeLocale as (typeof routing.locales)[number]);
  const locale = hasLocale
    ? maybeLocale
    : routing.defaultLocale;
  const rest = hasLocale
    ? parts.slice(1)
    : parts;

  return { hasLocale, locale, rest };
}

function getSupportedLocale(locale: string | undefined | null) {
  if (!locale) return null;
  const normalized = locale.toLowerCase();
  const base = normalized.split("-")[0];
  const supported = routing.locales as readonly string[];

  if (supported.includes(normalized)) return normalized;
  if (supported.includes(base)) return base;
  return null;
}

function getPreferredLocale(request: NextRequest) {
  const cookieLocale =
    getSupportedLocale(request.cookies.get("NEXT_LOCALE")?.value) ??
    getSupportedLocale(request.cookies.get("locale")?.value);

  if (cookieLocale) return cookieLocale;

  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const candidates = acceptLanguage
    .split(",")
    .map((item) => {
      const [tag, qValue] = item.trim().split(";q=");
      return {
        locale: getSupportedLocale(tag),
        weight: qValue ? Number(qValue) : 1,
      };
    })
    .filter((item): item is { locale: string; weight: number } => Boolean(item.locale))
    .sort((a, b) => b.weight - a.weight);

  return candidates[0]?.locale ?? routing.defaultLocale;
}

function getDeviceResponse(request: NextRequest) {
  const { nextUrl } = request;
  const host = request.headers.get("host") ?? "";
  const requestHostname = host.split(":")[0].toLowerCase();
  const hostname = isProductionHost(requestHostname) ? requestHostname : nextUrl.hostname;
  const userAgent = request.headers.get("user-agent") ?? "";
  const viewPreference = request.cookies.get("site_view")?.value;
  const mobile = isMobileUserAgent(userAgent);

  if (!isProductionHost(hostname)) {
    return null;
  }

  const { hasLocale, locale, rest } = splitLocalePath(nextUrl.pathname);
  const preferredLocale = getPreferredLocale(request);

  if (hostname === "m.football2026.net") {
    if (!hasLocale) {
      if (rest[0] === "m" && preferredLocale === routing.defaultLocale) {
        return null;
      }
      const redirectUrl = nextUrl.clone();
      redirectUrl.pathname = preferredLocale === routing.defaultLocale
        ? "/m"
        : `/${preferredLocale}/m`;
      return NextResponse.redirect(redirectUrl);
    }

    if (locale === routing.defaultLocale) {
      const redirectUrl = nextUrl.clone();
      redirectUrl.pathname = rest[0] === "m"
        ? `/${rest.join("/")}`
        : "/m";
      return NextResponse.redirect(redirectUrl);
    }

    if (rest[0] === "m") return null;

    const rewriteUrl = nextUrl.clone();
    rewriteUrl.pathname = `/${locale}/m`;
    return NextResponse.rewrite(rewriteUrl);
  }

  if (mobile && viewPreference !== "desktop") {
    const redirectUrl = nextUrl.clone();
    redirectUrl.protocol = "https:";
    redirectUrl.hostname = "m.football2026.net";
    redirectUrl.port = "";
    redirectUrl.pathname = hasLocale
      ? (rest[0] === "m" ? `/${locale}/m` : nextUrl.pathname)
      : `/${preferredLocale}/m`;
    return NextResponse.redirect(redirectUrl);
  }

  return null;
}

function normalizeMobileOAuthNext(value?: string | null) {
  if (!value) return "/m?view=home";

  try {
    const url = new URL(value, "https://mobile.local");
    if (
      url.origin !== "https://mobile.local" ||
      (url.pathname !== "/m" && !url.pathname.startsWith("/m/")) ||
      url.pathname === "/m/login"
    ) {
      return "/m?view=home";
    }
    url.searchParams.delete("code");
    url.searchParams.delete("state");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/m?view=home";
  }
}

function getMobileOAuthCodeResponse(request: NextRequest) {
  const { nextUrl } = request;
  const code = nextUrl.searchParams.get("code");
  if (!code || nextUrl.pathname === "/auth/callback") return null;

  const { hasLocale, locale, rest } = splitLocalePath(nextUrl.pathname);
  const isLocaleHome = hasLocale && rest.length === 0;
  const isMobilePath = hasLocale && rest[0] === "m";
  if (!isLocaleHome && !isMobilePath) return null;

  const cookieNext = request.cookies.get(MOBILE_OAUTH_NEXT_COOKIE)?.value;
  const nextFromPath = isMobilePath
    ? normalizeMobileOAuthNext(`/${rest.join("/")}${nextUrl.search}`)
    : null;
  const next = normalizeMobileOAuthNext(cookieNext ? decodeURIComponent(cookieNext) : nextFromPath);

  const host = request.headers.get("host") ?? "";
  const requestHostname = host.split(":")[0].toLowerCase();
  const callbackUrl = nextUrl.clone();
  if (isProductionHost(requestHostname)) {
    callbackUrl.protocol = "https:";
    callbackUrl.hostname = "m.football2026.net";
    callbackUrl.port = "";
  }
  callbackUrl.pathname = "/auth/callback";
  callbackUrl.search = "";
  callbackUrl.searchParams.set("code", code);
  callbackUrl.searchParams.set("locale", locale);
  callbackUrl.searchParams.set("next", next);
  callbackUrl.searchParams.set("mobile", "1");
  return NextResponse.redirect(callbackUrl);
}

// Force desktop view: `?desktop=1` sets a sticky cookie and strips the param so
// the mobile-UA redirect in getDeviceResponse is suppressed on this and later
// requests. Escape hatch for viewing the desktop site on a mobile device.
function getDesktopOverrideResponse(request: NextRequest) {
  const { nextUrl } = request;
  if (nextUrl.searchParams.get("desktop") !== "1") return null;

  const redirectUrl = nextUrl.clone();
  redirectUrl.searchParams.delete("desktop");
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set("site_view", "desktop", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}

// Supabase falls back to the project "Site URL" when the exact /auth/callback
// redirect URL is not in the allow-list, which dumps ?code= on the home page
// where it is never exchanged (silent login failure on desktop). Forward any
// stray OAuth code on a locale home page to the desktop callback route so the
// session is actually established. The mobile flow is handled separately above.
function getDesktopOAuthCodeResponse(request: NextRequest) {
  const { nextUrl } = request;
  const code = nextUrl.searchParams.get("code");
  if (!code || nextUrl.pathname === "/auth/callback") return null;

  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (host === "m.football2026.net") return null; // mobile handled by getMobileOAuthCodeResponse

  const { locale, rest } = splitLocalePath(nextUrl.pathname);
  if (rest.length !== 0) return null; // only the bare locale home page ("/", "/es", "/zh", ...)

  const callbackUrl = nextUrl.clone();
  callbackUrl.pathname = "/auth/callback";
  callbackUrl.search = "";
  callbackUrl.searchParams.set("code", code);
  callbackUrl.searchParams.set("locale", locale);
  callbackUrl.searchParams.set("next", "/");
  return NextResponse.redirect(callbackUrl);
}

function mergeSupabaseCookies(response: NextResponse, supabaseResponse: NextResponse) {
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, cookie);
  });
}

function isInvalidRefreshTokenError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const authError = error as { code?: string; message?: string };
  return authError.code === "refresh_token_not_found"
    || authError.message?.includes("Refresh Token Not Found") === true;
}

function clearStaleMobileAuthResponseCookies(request: NextRequest, response: NextResponse) {
  const authCookieNames = new Set(
    request.cookies
      .getAll()
      .map((cookie) => cookie.name)
      .filter((name) => name.startsWith("sb-") && name.includes("-auth-token")),
  );

  for (const name of authCookieNames) {
    response.headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure`,
    );
    response.headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Domain=.football2026.net; Max-Age=0; SameSite=Lax; Secure`,
    );
  }
}

export async function proxy(request: NextRequest) {
  const desktopOverrideResponse = getDesktopOverrideResponse(request);
  if (desktopOverrideResponse) return desktopOverrideResponse;

  const mobileOAuthCodeResponse = getMobileOAuthCodeResponse(request);
  if (mobileOAuthCodeResponse) return mobileOAuthCodeResponse;

  const desktopOAuthCodeResponse = getDesktopOAuthCodeResponse(request);
  if (desktopOAuthCodeResponse) return desktopOAuthCodeResponse;

  // Refresh Supabase auth session
  let supabaseResponse = NextResponse.next({ request });
  const hostname = (request.headers.get("host") ?? "").split(":")[0];
  const sharedCookieOptions = getSharedAuthCookieOptions(hostname);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, { ...options, ...sharedCookieOptions })
          );
        },
      },
    }
  );

  // Refresh session (important for Server Components)
  let invalidMobileRefreshToken = false;
  try {
    const { error } = await supabase.auth.getUser();
    invalidMobileRefreshToken = isInvalidRefreshTokenError(error);
  } catch (error) {
    invalidMobileRefreshToken = isInvalidRefreshTokenError(error);
  }

  const deviceResponse = getDeviceResponse(request);
  if (deviceResponse) {
    mergeSupabaseCookies(deviceResponse, supabaseResponse);
    if (invalidMobileRefreshToken && hostname.toLowerCase() === "m.football2026.net") {
      clearStaleMobileAuthResponseCookies(request, deviceResponse);
    }
    return deviceResponse;
  }

  // Run intl middleware
  const intlResponse = intlMiddleware(request);

  // Merge cookies from both responses
  if (intlResponse) {
    mergeSupabaseCookies(intlResponse, supabaseResponse);
    if (invalidMobileRefreshToken && hostname.toLowerCase() === "m.football2026.net") {
      clearStaleMobileAuthResponseCookies(request, intlResponse);
    }
    return intlResponse;
  }

  if (invalidMobileRefreshToken && hostname.toLowerCase() === "m.football2026.net") {
    clearStaleMobileAuthResponseCookies(request, supabaseResponse);
  }
  return supabaseResponse;
}

export const config = {
  matcher: "/((?!api|auth/callback|_next|_vercel|.*\\..*).*)",
};
