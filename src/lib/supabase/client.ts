import { createBrowserClient } from "@supabase/ssr";
import { getSharedAuthCookieOptions } from "@/lib/supabase/cookieOptions";

export function createClient() {
  const hostname = typeof window === "undefined" ? "" : window.location.hostname;

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: getSharedAuthCookieOptions(hostname),
    }
  );
}
