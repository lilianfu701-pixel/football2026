"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") ?? "";

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const username = formData.get("username") as string;
  const country_code = formData.get("country_code") as string;
  const locale = (formData.get("locale") as string) || "en";

  // 1. Sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?locale=${locale}&next=/`,
      data: {
        username,
        country_code,
      },
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  // 2. Create user profile in our users table
  if (authData.user) {
    const { error: profileError } = await supabase.from("users").insert({
      id: authData.user.id,
      email,
      username,
      country_code,
      gc_balance: 100000000, // 1亿 GC welcome gift
      honor_points: 0,
      wealth_level: "Common",
      honor_level: "Rookie",
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Don't fail - profile might already exist via trigger
    }
  }

  return {
    success: true,
    message: "Check your email to confirm your account!",
  };
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const locale = (formData.get("locale") as string) || "en";

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect(`/${locale}`);
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
