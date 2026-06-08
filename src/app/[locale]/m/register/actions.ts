"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { normalizeMobileAuthNext } from "@/components/mobile/mobileAuth";

export async function mobileSignUp(formData: FormData) {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") ?? "";

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const nickname = formData.get("username") as string;
  const countryCode = formData.get("country_code") as string;
  const locale = (formData.get("locale") as string) || "en";
  const next = normalizeMobileAuthNext(formData.get("next") as string | null);
  const ref = ((formData.get("ref") as string) ?? "").trim();

  const callbackParams = new URLSearchParams({
    locale,
    next,
    mobile: "1",
  });
  if (ref) callbackParams.set("ref", ref);

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?${callbackParams.toString()}`,
      data: {
        username: nickname,
        country_code: countryCode,
        ...(ref ? { referred_by: ref } : {}),
      },
    },
  });

  if (error) return { error: error.message };
  return { success: true };
}
