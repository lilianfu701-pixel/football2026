"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { countries } from "@/lib/countries";
import { getMobileOAuthCallbackUrl, getProductionMobileLoginUrl, isLocalMobileOAuthHost, normalizeMobileAuthNext } from "@/components/mobile/mobileAuth";
import { mobileSignUp } from "./actions";
import { lc } from "@/i18n/content";

export default function MobileRegisterPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || "en";
  const zh = locale === "zh";
  const next = normalizeMobileAuthNext(searchParams.get("next"));
  const refCode = searchParams.get("ref") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [oauthLoading, setOauthLoading] = useState<"google" | "facebook" | null>(null);
  const [isPending, startTransition] = useTransition();
  const sortedCountries = useMemo(() => [...countries].sort((a, b) => a.name.localeCompare(b.name)), []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(lc(locale, "两次输入的密码不一致。", "Passwords do not match."));
      return;
    }
    if (password.length < 8) {
      setError(lc(locale, "密码至少需要 8 个字符。", "Password must contain at least 8 characters."));
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("locale", locale);
    formData.set("next", next);
    if (refCode) formData.set("ref", refCode);

    startTransition(async () => {
      const result = await mobileSignUp(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
    });
  }

  async function handleOAuth(provider: "google" | "facebook") {
    setOauthLoading(provider);
    setError(null);
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

  if (success) {
    return (
      <main className="-mt-16 min-h-screen bg-[#081120] px-4 py-8 text-white">
        <section className="mx-auto max-w-sm rounded-2xl border border-[#FFD700]/20 bg-[#0d1a2b] p-5 text-center shadow-xl shadow-black/25">
          <Image src="/icons/levels/logo.png" alt="Football2026" width={54} height={54} className="mx-auto rounded-xl" priority />
          <h1 className="mt-4 text-xl font-black">{lc(locale, "请确认你的邮箱", "Confirm your email")}</h1>
          <p className="mt-2 text-[14px] leading-5 text-slate-400">
            {lc(locale, "注册成功。请打开邮箱完成确认，确认后会返回移动端页面。", "Account created. Check your email to confirm it, then you will return to the mobile page.")}
          </p>
          <Link href={`/${locale}/m/login?next=${encodeURIComponent(next)}`} className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[#FFD700] px-4 text-[15px] font-black text-[#081120]">
            {lc(locale, "返回移动端登录", "Back to mobile sign in")}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="-mt-16 min-h-screen bg-[#081120] px-4 py-5 text-white">
      <section className="mx-auto grid max-w-sm gap-4">
        <header className="flex items-center justify-between gap-3">
          <Link href={`/${locale}/m/login?next=${encodeURIComponent(next)}`} className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-[13px] font-black text-slate-300">
            {lc(locale, "返回登录", "Back")}
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <Image src="/icons/levels/logo.png" alt="Football2026" width={36} height={36} className="rounded-lg" priority />
            <span className="truncate text-[16px] font-black text-[#FFD700]">Football2026</span>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-[#FFD700]/20 bg-[#0d1a2b] shadow-xl shadow-black/25">
          <div className="bg-[linear-gradient(135deg,rgba(255,215,0,0.18),rgba(16,185,129,0.10),rgba(8,17,32,0.65))] p-4">
            <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#FFD700]">
              {lc(locale, "移动端注册", "Mobile register")}
            </p>
            <h1 className="mt-2 text-2xl font-black leading-7 text-white">
              {lc(locale, "创建 Football2026 账号", "Create Football2026 account")}
            </h1>
            <p className="mt-2 text-[14px] leading-5 text-slate-300">
              {lc(locale, "注册后可在手机端参与预测、关注比赛、支持球队和领取 GC。", "Create an account to predict, follow matches, support teams, and claim GC on mobile.")}
            </p>
          </div>

          <div className="grid gap-3 p-4">
            <button type="button" onClick={() => handleOAuth("google")} disabled={Boolean(oauthLoading) || isPending} className="h-11 rounded-xl bg-white text-[15px] font-black text-slate-900 disabled:opacity-60">
              {oauthLoading === "google" ? (lc(locale, "跳转中...", "Redirecting...")) : (lc(locale, "使用 Google 注册或登录", "Continue with Google"))}
            </button>
            <button type="button" onClick={() => handleOAuth("facebook")} disabled={Boolean(oauthLoading) || isPending} className="h-11 rounded-xl bg-[#1877F2] text-[15px] font-black text-white disabled:opacity-60">
              {oauthLoading === "facebook" ? (lc(locale, "跳转中...", "Redirecting...")) : (lc(locale, "使用 Facebook 注册或登录", "Continue with Facebook"))}
            </button>

            <div className="flex items-center gap-2 text-[12px] text-slate-600">
              <span className="h-px flex-1 bg-white/10" />
              <span>{lc(locale, "或使用邮箱注册", "or use email")}</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="grid gap-3">
              <label className="grid gap-1 text-[13px] font-bold text-slate-400">
                {lc(locale, "昵称", "Nickname")}
                <input name="username" type="text" required minLength={3} maxLength={20} autoComplete="nickname" className="h-11 rounded-xl border border-white/10 bg-[#081120] px-3 text-[15px] text-white outline-none focus:border-[#FFD700]/70" />
              </label>
              <label className="grid gap-1 text-[13px] font-bold text-slate-400">
                {lc(locale, "邮箱", "Email")}
                <input name="email" type="email" required autoComplete="email" className="h-11 rounded-xl border border-white/10 bg-[#081120] px-3 text-[15px] text-white outline-none focus:border-[#FFD700]/70" />
              </label>
              <label className="grid gap-1 text-[13px] font-bold text-slate-400">
                {lc(locale, "所在国家或地区", "Country or region")}
                <select name="country_code" required defaultValue="" className="h-11 rounded-xl border border-white/10 bg-[#081120] px-3 text-[15px] text-white outline-none focus:border-[#FFD700]/70">
                  <option value="" disabled>{lc(locale, "请选择", "Choose one")}</option>
                  {sortedCountries.map((country) => (
                    <option key={country.code} value={country.code}>{country.name}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-[13px] font-bold text-slate-400">
                {lc(locale, "密码", "Password")}
                <input name="password" type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="h-11 rounded-xl border border-white/10 bg-[#081120] px-3 text-[15px] text-white outline-none focus:border-[#FFD700]/70" />
              </label>
              <label className="grid gap-1 text-[13px] font-bold text-slate-400">
                {lc(locale, "确认密码", "Confirm password")}
                <input name="confirm_password" type="password" required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" className="h-11 rounded-xl border border-white/10 bg-[#081120] px-3 text-[15px] text-white outline-none focus:border-[#FFD700]/70" />
              </label>
              {refCode && <p className="rounded-xl border border-[#FFD700]/20 bg-[#FFD700]/10 px-3 py-2 text-[12px] font-black text-[#FFD700]">{zh ? `邀请码：${refCode}` : `Referral: ${refCode}`}</p>}
              {error && <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-[13px] font-bold text-rose-200">{error}</p>}
              <button type="submit" disabled={isPending || Boolean(oauthLoading)} className="h-11 rounded-xl bg-[#FFD700] text-[15px] font-black text-[#081120] disabled:opacity-60">
                {isPending ? (lc(locale, "注册中...", "Creating account...")) : (lc(locale, "注册", "Create account"))}
              </button>
            </form>
          </div>
        </section>
      </section>
    </main>
  );
}
