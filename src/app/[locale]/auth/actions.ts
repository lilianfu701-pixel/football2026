"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") ?? "";

  const email        = formData.get("email")        as string;
  const password     = formData.get("password")     as string;
  const nickname     = formData.get("username")     as string;
  const country_code = formData.get("country_code") as string;
  const locale       = (formData.get("locale")      as string) || "en";
  // Referral code passed from URL ?ref=<username>
  const ref          = ((formData.get("ref") as string) ?? "").trim();

  // Build the email-confirmation callback URL. Carry `ref` as its own query
  // param (the old string concat folded it into `next`, so it was unreadable).
  const callbackParams = new URLSearchParams({ locale, next: "/" });
  if (ref) callbackParams.set("ref", ref);

  // Sign up with Supabase Auth. The `handle_new_user` DB trigger creates the
  // public.users profile (using `username` for the nickname). Referral rewards
  // are granted by /auth/callback after the user confirms their email — not
  // here — so unconfirmed signups cannot farm GC.
  const { error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?${callbackParams.toString()}`,
      data: {
        username: nickname,
        country_code,
        ...(ref ? { referred_by: ref } : {}),
      },
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  return {
    success: true,
    message: "Check your email to confirm your account!",
  };
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Do NOT redirect from the server action. A server `redirect()` is a soft
  // client navigation, and the persistent Navbar (a client component that
  // hydrates auth from /api/navbar only on mount) would keep showing the
  // logged-out header. The login page does a full-page navigation on success
  // so the header re-syncs from the now-valid session cookie.
  return { success: true };
}

export async function signInWithGoogle(locale: string) {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") ?? "";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?locale=${locale}&next=/`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signInWithFacebook(locale: string) {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") ?? "";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "facebook",
    options: {
      redirectTo: `${origin}/auth/callback?locale=${locale}&next=/`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signOut(locale: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}`);
}
