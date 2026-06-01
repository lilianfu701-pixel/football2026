"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizeMobileNext } from "@/components/mobile/mobileAuth";
import { mobileSignIn } from "./actions";

export default function MobileLoginPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || "en";
  const zh = locale === "zh";
  const next = normalizeMobileNext(searchParams.get("next"));
  const [error, setError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set("locale", locale);
    formData.set("next", next);
    startTransition(async () => {
      const result = await mobileSignIn(formData);
      if (result?.error) setError(result.error);
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

  return (
    <main className="-mt-16 min-h-screen bg-[#081120] px-4 py-5 text-white">
      <section className="mx-auto max-w-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link href={`/${locale}${next}`} className="text-[15px] font-bold text-slate-400">
            {zh ? "返回" : "Back"}
          </Link>
          <div className="flex items-center gap-2">
            <Image src="/icons/levels/logo.png" alt="Football2026" width={34} height={34} className="rounded-lg" priority />
            <span className="text-[15px] font-black text-[#FFD700]">Football2026</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0d1a2b] p-4">
          <h1 className="text-xl font-black">{zh ? "登录移动端" : "Mobile Sign In"}</h1>
          <p className="mt-1 text-[15px] leading-5 text-slate-400">
            {zh ? "登录后即可关注比赛、支持球队和参与竞猜。" : "Sign in to follow matches, support teams, and submit predictions."}
          </p>

          <div className="mt-4 grid gap-2">
            <button type="button" onClick={() => handleOAuth("google")} disabled={oauthLoading} className="h-10 rounded-lg bg-white text-[15px] font-black text-slate-800 disabled:opacity-60">
              {zh ? "使用 Google 登录" : "Continue with Google"}
            </button>
            <button type="button" onClick={() => handleOAuth("facebook")} disabled={oauthLoading} className="h-10 rounded-lg bg-[#1877F2] text-[15px] font-black text-white disabled:opacity-60">
              {zh ? "使用 Facebook 登录" : "Continue with Facebook"}
            </button>
          </div>

          <div className="my-4 flex items-center gap-2 text-[12px] text-slate-600">
            <span className="h-px flex-1 bg-white/10" />
            <span>{zh ? "或使用邮箱" : "or use email"}</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="grid gap-3">
            <label className="grid gap-1 text-[13px] font-bold text-slate-400">
              {zh ? "邮箱" : "Email"}
              <input name="email" type="email" required autoComplete="email" className="h-10 rounded-lg border border-white/10 bg-[#081120] px-3 text-[15px] text-white outline-none focus:border-[#FFD700]/70" />
            </label>
            <label className="grid gap-1 text-[13px] font-bold text-slate-400">
              {zh ? "密码" : "Password"}
              <input name="password" type="password" required autoComplete="current-password" className="h-10 rounded-lg border border-white/10 bg-[#081120] px-3 text-[15px] text-white outline-none focus:border-[#FFD700]/70" />
            </label>
            {error && <p className="rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-[13px] text-rose-200">{error}</p>}
            <button type="submit" disabled={isPending || oauthLoading} className="h-10 rounded-lg bg-[#FFD700] text-[15px] font-black text-[#081120] disabled:opacity-60">
              {isPending ? (zh ? "登录中..." : "Signing in...") : (zh ? "登录" : "Sign in")}
            </button>
          </form>

          <p className="mt-4 text-center text-[13px] text-slate-500">
            {zh ? "还没有账号？" : "No account yet?"}{" "}
            <Link href={`/${locale}/m/register?next=${encodeURIComponent(next)}`} className="font-black text-[#FFD700]">
              {zh ? "注册" : "Register"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
