const PRODUCTION_COOKIE_DOMAIN = ".football2026.net";

export function isFootball2026Host(hostname: string) {
  return hostname === "football2026.net" || hostname.endsWith(".football2026.net");
}

export function getSharedAuthCookieOptions(hostname: string) {
  if (!isFootball2026Host(hostname.toLowerCase())) return {};

  return {
    domain: PRODUCTION_COOKIE_DOMAIN,
    path: "/",
    sameSite: "lax" as const,
    secure: true,
  };
}
