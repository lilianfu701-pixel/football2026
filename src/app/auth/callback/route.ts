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
      // Redirect to the locale-prefixed path
      const redirectPath = next.startsWith("/") ? `/${locale}${next}` : `/${locale}/${next}`;
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  // Auth error - redirect to login with error
  return NextResponse.redirect(`${origin}/${locale}/auth/login?error=auth_callback_error`);
}
