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

  // 1. Sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?locale=${locale}&next=/${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`,
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

  // 2. Create user profile in our users table (trigger handles OAuth, this handles email signups)
  if (authData.user) {
    const { error: profileError } = await supabase.from("users").insert({
      id:           authData.user.id,
      email,
      nickname,
      country_code: country_code.slice(0, 2),
      gc_balance:   100000,
      gc_total:     100000,
      honor_points: 0,
      wealth_level: 1,
      honor_level:  1,
      ...(ref ? { referred_by: ref } : {}),
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Don't fail - profile might already exist via trigger
    }

    // 3. Process referral rewards (SECURITY DEFINER fn — safe to call with service role)
    //    Only fires if profile was just created and a ref was provided.
    if (ref && !profileError) {
      await supabase.rpc("process_referral", {
        new_user_id:   authData.user.id,
        referrer_name: ref,
      });
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
