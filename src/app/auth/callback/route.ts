import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MOBILE_OAUTH_NEXT_COOKIE, normalizeMobileNext } from "@/components/mobile/mobileAuth";
import { getSharedAuthCookieOptions, isFootball2026Host } from "@/lib/supabase/cookieOptions";
import { sendWelcomeEmail } from "@/lib/email/send";

function getRedirectOrigin(requestUrl: URL, next: string) {
  const currentOrigin = requestUrl.origin;
  if (!next.startsWith("/m")) return currentOrigin;
  if (!isFootball2026Host(requestUrl.hostname)) return currentOrigin;
  return "https://m.football2026.net";
}

function buildMobileLoginErrorUrl(requestUrl: URL, locale: string, next: string) {
  const redirectOrigin = getRedirectOrigin(requestUrl, next);
  const url = new URL(`/${locale}/m/login`, redirectOrigin);
  url.searchParams.set("next", next);
  url.searchParams.set("error", "auth_callback_error");
  return url;
}

function clearMobileOAuthCookie(response: NextResponse, hostname: string) {
  response.cookies.set(MOBILE_OAUTH_NEXT_COOKIE, "", {
    ...getSharedAuthCookieOptions(hostname),
    path: "/",
    maxAge: 0,
  });
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams, origin } = requestUrl;
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/";
  const mobile = searchParams.get("mobile") === "1" || rawNext.startsWith("/m");
  const next = mobile ? normalizeMobileNext(rawNext) : rawNext;
  const locale = searchParams.get("locale") ?? "en";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Grant referral reward (idempotent). Runs only AFTER a successful
      // email-confirmation / OAuth exchange, so unconfirmed signups can't farm
      // GC. process_referral records referred_by + pays both sides + milestones.
      const ref = (searchParams.get("ref") ?? "").trim();
      const { data: { user } } = await supabase.auth.getUser();
      if (ref && user) {
        await supabase.rpc("process_referral", {
          new_user_id: user.id,
          referrer_name: ref,
        });
      }
      // Send welcome email on first confirmation (non-blocking)
      if (user?.email) {
        const { data: profile } = await supabase
          .from("users")
          .select("nickname, welcome_email_sent")
          .eq("id", user.id)
          .single();
        if (profile && !profile.welcome_email_sent) {
          sendWelcomeEmail(user.email, profile.nickname ?? "用户", locale).catch(() => {});
          // Mark as sent (best-effort, ignore error)
          supabase.from("users").update({ welcome_email_sent: true }).eq("id", user.id).then(() => {});
        }
      }

      // Redirect to the locale-prefixed path
      const redirectPath = next.startsWith("/") ? `/${locale}${next}` : `/${locale}/${next}`;
      const response = NextResponse.redirect(`${getRedirectOrigin(requestUrl, next)}${redirectPath}`);
      if (mobile) clearMobileOAuthCookie(response, requestUrl.hostname);
      return response;
    }
  }

  // Auth error - redirect to login with error
  if (mobile) return NextResponse.redirect(buildMobileLoginErrorUrl(requestUrl, locale, next));
  return NextResponse.redirect(`${origin}/${locale}/auth/login?error=auth_callback_error`);
}
