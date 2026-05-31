"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeMobileNext } from "@/components/mobile/mobileAuth";

export async function mobileSignIn(formData: FormData) {
  const locale = (formData.get("locale") as string) || "en";
  const next = normalizeMobileNext(formData.get("next") as string | null);
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect(`/${locale}${next}`);
}
