import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const locale = searchParams.get("locale") ?? "en";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Grant referral reward (idempotent). Runs only AFTER a successful
      // email-confirmation / OAuth exchange, so unconfirmed signups can't farm
      // GC. process_referral records referred_by + pays both sides + milestones.
      const ref = (searchParams.get("ref") ?? "").trim();
      if (ref) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.rpc("process_referral", {
            new_user_id: user.id,
            referrer_name: ref,
          });
        }
      }

      // Redirect to the locale-prefixed path
      const redirectPath = next.startsWith("/") ? `/${locale}${next}` : `/${locale}/${next}`;
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  // Auth error - redirect to login with error
  return NextResponse.redirect(`${origin}/${locale}/auth/login?error=auth_callback_error`);
}
