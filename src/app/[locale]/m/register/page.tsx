"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { normalizeMobileNext } from "@/components/mobile/mobileAuth";
import { countries } from "@/lib/countries";
import { createClient } from "@/lib/supabase/client";
import { signUp } from "../../auth/actions";

export default function MobileRegisterPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || "en";
  const zh = locale === "zh";
  const next = normalizeMobileNext(searchParams.get("next"));
  const refCode = searchParams.get("ref") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [oauthLoading, setOauthLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const sortedCountries = useMemo(
    () => [...countries].sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError(zh ? "两次输入的密码不一致。" : "Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError(zh ? "密码至少需要 8 个字符。" : "Password must contain at least 8 characters.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("locale", locale);
    if (refCode) formData.set("ref", refCode);

    startTransition(async () => {
      const result = await signUp(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSuccess(zh ? "注册成功。请打开邮箱完成确认。" : "Account created. Check your email to confirm it.");
    });
  }

  async function handleOAuth(provider: "google" | "facebook") {
    setOauthLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?locale=${locale}&next=${encodeURIComponent(next)}`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setOauthLoading(false);
    }
  }

  if (success) {
    return (
      <main className="-mt-16 min-h-screen bg-[#081120] px-4 py-8 text-white">
        <section className="mx-auto max-w-sm rounded-xl border border-white/10 bg-[#0d1a2b] p-5 text-center">
          <Image src="/icons/levels/logo.png" alt="Football2026" width={48} height={48} className="mx-auto rounded-xl" priority />
          <h1 className="mt-4 text-lg font-black">{zh ? "请确认你的邮箱" : "Confirm your email"}</h1>
          <p className="mt-2 text-[15px] leading-5 text-slate-400">{success}</p>
          <Link href={`/${locale}/m/login?next=${encodeURIComponent(next)}`} className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-[#FFD700] px-4 text-[15px] font-black text-[#081120]">
            {zh ? "返回登录" : "Back to sign in"}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="-mt-16 min-h-screen bg-[#081120] px-4 py-5 text-white">
      <section className="mx-auto max-w-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link href={`/${locale}/m/login?next=${encodeURIComponent(next)}`} className="text-[15px] font-bold text-slate-400">
            {zh ? "返回登录" : "Back to sign in"}
          </Link>
          <div className="flex items-center gap-2">
            <Image src="/icons/levels/logo.png" alt="Football2026" width={34} height={34} className="rounded-lg" priority />
            <span className="text-[15px] font-black text-[#FFD700]">Football2026</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0d1a2b] p-4">
          <h1 className="text-xl font-black">{zh ? "注册移动端账号" : "Create mobile account"}</h1>
          <p className="mt-1 text-[15px] leading-5 text-slate-400">
            {zh ? "注册后即可参与竞猜、关注比赛和支持球队。" : "Create an account to predict, follow matches, and support teams."}
          </p>

          <div className="mt-4 grid gap-2">
            <button type="button" onClick={() => handleOAuth("google")} disabled={oauthLoading} className="h-10 rounded-lg bg-white text-[15px] font-black text-slate-800 disabled:opacity-60">
              {zh ? "使用 Google 注册或登录" : "Continue with Google"}
            </button>
            <button type="button" onClick={() => handleOAuth("facebook")} disabled={oauthLoading} className="h-10 rounded-lg bg-[#1877F2] text-[15px] font-black text-white disabled:opacity-60">
              {zh ? "使用 Facebook 注册或登录" : "Continue with Facebook"}
            </button>
          </div>

          <div className="my-4 flex items-center gap-2 text-[12px] text-slate-600">
            <span className="h-px flex-1 bg-white/10" />
            <span>{zh ? "或使用邮箱注册" : "or use email"}</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="grid gap-3">
            <label className="grid gap-1 text-[13px] font-bold text-slate-400">
              {zh ? "昵称" : "Nickname"}
              <input name="username" type="text" required minLength={3} maxLength={20} autoComplete="nickname" className="h-10 rounded-lg border border-white/10 bg-[#081120] px-3 text-[15px] text-white outline-none focus:border-[#FFD700]/70" />
            </label>
            <label className="grid gap-1 text-[13px] font-bold text-slate-400">
              {zh ? "邮箱" : "Email"}
              <input name="email" type="email" required autoComplete="email" className="h-10 rounded-lg border border-white/10 bg-[#081120] px-3 text-[15px] text-white outline-none focus:border-[#FFD700]/70" />
            </label>
            <label className="grid gap-1 text-[13px] font-bold text-slate-400">
              {zh ? "所在国家或地区" : "Country or region"}
              <select name="country_code" required defaultValue="" className="h-10 rounded-lg border border-white/10 bg-[#081120] px-3 text-[15px] text-white outline-none focus:border-[#FFD700]/70">
                <option value="" disabled>{zh ? "请选择" : "Choose one"}</option>
                {sortedCountries.map((country) => (
                  <option key={country.code} value={country.code}>{country.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-[13px] font-bold text-slate-400">
              {zh ? "密码" : "Password"}
              <input name="password" type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="h-10 rounded-lg border border-white/10 bg-[#081120] px-3 text-[15px] text-white outline-none focus:border-[#FFD700]/70" />
            </label>
            <label className="grid gap-1 text-[13px] font-bold text-slate-400">
              {zh ? "确认密码" : "Confirm password"}
              <input name="confirm_password" type="password" required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" className="h-10 rounded-lg border border-white/10 bg-[#081120] px-3 text-[15px] text-white outline-none focus:border-[#FFD700]/70" />
            </label>
            {error && <p className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-[13px] text-rose-200">{error}</p>}
            <button type="submit" disabled={isPending || oauthLoading} className="h-10 rounded-lg bg-[#FFD700] text-[15px] font-black text-[#081120] disabled:opacity-60">
              {isPending ? (zh ? "注册中..." : "Creating account...") : (zh ? "注册" : "Create account")}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
