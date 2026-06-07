"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { clearStaleMobileAuthCookies, getMobileOAuthCallbackUrl, getProductionMobileLoginUrl, isLocalMobileOAuthHost, normalizeMobileAuthNext } from "@/components/mobile/mobileAuth";
import { mobileSignIn } from "./actions";
import { lc } from "@/i18n/content";

export default function MobileLoginPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || "en";
  const zh = locale === "zh";
  const next = normalizeMobileAuthNext(searchParams.get("next"));
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const [oauthLoading, setOauthLoading] = useState<"google" | "facebook" | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    clearStaleMobileAuthCookies();
    const formData = new FormData(event.currentTarget);
    formData.set("locale", locale);
    formData.set("next", next);
    startTransition(async () => {
      const result = await mobileSignIn(formData);
      if (result?.error) setError(result.error);
    });
  }

  async function handleOAuth(provider: "google" | "facebook") {
    setOauthLoading(provider);
    setError(null);
    clearStaleMobileAuthCookies();
    if (isLocalMobileOAuthHost()) {
      window.location.assign(getProductionMobileLoginUrl(locale, next));
      return;
    }
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getMobileOAuthCallbackUrl(locale, next),
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setOauthLoading(null);
    }
  }

  return (
    <main className="-mt-16 min-h-screen bg-[#081120] px-4 py-5 text-white">
      <section className="mx-auto grid max-w-sm gap-4">
        <header className="flex items-center justify-between gap-3">
          <Link href={`/${locale}${next}`} className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[13px] font-black text-slate-300">
            {lc(locale, "返回", "Back")}
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <Image src="/icons/levels/logo.png" alt="Football2026" width={36} height={36} className="rounded-lg" priority />
            <span className="truncate text-[16px] font-black text-[#FFD700]">Football2026</span>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-[#FFD700]/20 bg-[#0d1a2b] shadow-xl shadow-black/25">
          <div className="bg-[linear-gradient(135deg,rgba(255,215,0,0.18),rgba(16,185,129,0.10),rgba(8,17,32,0.65))] p-4">
            <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#FFD700]">
              {lc(locale, "移动端登录", "Mobile sign in")}
            </p>
            <h1 className="mt-2 text-2xl font-black leading-7 text-white">
              {lc(locale, "登录 Football2026", "Sign in to Football2026")}
            </h1>
            <p className="mt-2 text-[14px] leading-5 text-slate-300">
              {lc(locale, "登录后可关注比赛、支持球队、预测赛事、签到领取 GC。", "Sign in to follow matches, support teams, make predictions, and claim GC.")}
            </p>
          </div>

          <div className="grid gap-3 p-4">
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              disabled={Boolean(oauthLoading) || isPending}
              className="flex h-11 items-center justify-center rounded-xl bg-white text-[15px] font-black text-slate-900 disabled:opacity-60"
            >
              {oauthLoading === "google" ? (lc(locale, "跳转中...", "Redirecting...")) : (lc(locale, "使用 Google 登录", "Continue with Google"))}
            </button>
            <button
              type="button"
              onClick={() => handleOAuth("facebook")}
              disabled={Boolean(oauthLoading) || isPending}
              className="flex h-11 items-center justify-center rounded-xl bg-[#1877F2] text-[15px] font-black text-white disabled:opacity-60"
            >
              {oauthLoading === "facebook" ? (lc(locale, "跳转中...", "Redirecting...")) : (lc(locale, "使用 Facebook 登录", "Continue with Facebook"))}
            </button>

            <div className="flex items-center gap-2 text-[12px] text-slate-600">
              <span className="h-px flex-1 bg-white/10" />
              <span>{lc(locale, "或使用邮箱", "or use email")}</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="grid gap-3">
              <label className="grid gap-1 text-[13px] font-bold text-slate-400">
                {lc(locale, "邮箱", "Email")}
                <input name="email" type="email" required autoComplete="email" className="h-11 rounded-xl border border-white/10 bg-[#081120] px-3 text-[15px] text-white outline-none focus:border-[#FFD700]/70" />
              </label>
              <label className="grid gap-1 text-[13px] font-bold text-slate-400">
                {lc(locale, "密码", "Password")}
                <input name="password" type="password" required autoComplete="current-password" className="h-11 rounded-xl border border-white/10 bg-[#081120] px-3 text-[15px] text-white outline-none focus:border-[#FFD700]/70" />
              </label>
              {error && <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-[13px] font-bold text-rose-200">{error === "auth_callback_error" ? (lc(locale, "登录回调失败，请重新登录。", "Auth callback failed. Please sign in again.")) : error}</p>}
              <button type="submit" disabled={isPending || Boolean(oauthLoading)} className="h-11 rounded-xl bg-[#FFD700] text-[15px] font-black text-[#081120] disabled:opacity-60">
                {isPending ? (lc(locale, "登录中...", "Signing in...")) : (lc(locale, "登录", "Sign in"))}
              </button>
            </form>

            <p className="text-center text-[13px] text-slate-500">
              {lc(locale, "还没有账号？", "No account yet?")}{" "}
              <Link href={`/${locale}/m/register?next=${encodeURIComponent(next)}`} className="font-black text-[#FFD700]">
                {lc(locale, "注册移动端账号", "Create account")}
              </Link>
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
