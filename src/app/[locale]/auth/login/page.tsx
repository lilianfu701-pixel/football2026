"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn, signInWithGoogle, signInWithFacebook } from "../actions";

export default function LoginPage() {
  const t = useTranslations("auth");
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || "en";
  const [error, setError] = useState<string | null>(
    searchParams.get("error") ? t("error_generic") : null
  );
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("locale", locale);

    startTransition(async () => {
      const result = await signIn(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  async function handleGoogle() {
    startTransition(async () => {
      await signInWithGoogle(locale);
    });
  }

  async function handleFacebook() {
    startTransition(async () => {
      await signInWithFacebook(locale);
    });
  }

  return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href={`/${locale}`} className="inline-block">
            <h1 className="text-3xl font-bold text-[#FFD700]">⚽ GoalCoin 2026</h1>
          </Link>
          <p className="text-gray-400 mt-2 text-sm">{t("login_subtitle")}</p>
        </div>

        {/* Card */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">{t("login_title")}</h2>

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={handleGoogle}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t("continue_with_google")}
            </button>

            <button
              onClick={handleFacebook}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-3 bg-[#1877F2] text-white font-semibold py-3 px-4 rounded-xl hover:bg-[#166FE5] transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              {t("continue_with_facebook")}
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#1E3A5F]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-[#0F2040] text-gray-500">{t("or_email")}</span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {t("email")}
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="w-full bg-[#0A1628] border border-[#1E3A5F] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] placeholder-gray-600 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {t("password")}
              </label>
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full bg-[#0A1628] border border-[#1E3A5F] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] placeholder-gray-600 transition-colors"
              />
              <div className="text-right mt-1.5">
                <Link
                  href={`/${locale}/auth/forgot-password`}
                  className="text-xs text-[#FFD700] hover:underline"
                >
                  {t("forgot_password")}
                </Link>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-[#FFD700] text-[#0A1628] font-bold py-3 px-4 rounded-xl hover:bg-[#FFC200] transition-colors disabled:opacity-50 text-sm"
            >
              {isPending ? t("signing_in") : t("sign_in")}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t("no_account")}{" "}
            <Link
              href={`/${locale}/auth/register`}
              className="text-[#FFD700] hover:underline font-medium"
            >
              {t("sign_up")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
