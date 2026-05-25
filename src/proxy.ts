import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

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
      const redirectUrl = nextUrl.clone();
      redirectUrl.pathname = `/${preferredLocale}/m`;
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

function mergeSupabaseCookies(response: NextResponse, supabaseResponse: NextResponse) {
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, cookie);
  });
}

export async function proxy(request: NextRequest) {
  // Refresh Supabase auth session
  let supabaseResponse = NextResponse.next({ request });

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
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session (important for Server Components)
  await supabase.auth.getUser();

  const deviceResponse = getDeviceResponse(request);
  if (deviceResponse) {
    mergeSupabaseCookies(deviceResponse, supabaseResponse);
    return deviceResponse;
  }

  // Run intl middleware
  const intlResponse = intlMiddleware(request);

  // Merge cookies from both responses
  if (intlResponse) {
    mergeSupabaseCookies(intlResponse, supabaseResponse);
    return intlResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: "/((?!api|auth/callback|_next|_vercel|.*\\..*).*)",
};
