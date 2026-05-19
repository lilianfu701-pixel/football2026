"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?locale=${locale}&next=/auth/reset-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    });
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="text-6xl mb-6">📧</div>
          <h2 className="text-2xl font-bold text-white mb-3">{t("check_email_title")}</h2>
          <p className="text-gray-400 mb-6">{t("reset_email_sent")}</p>
          <Link
            href={`/${locale}/auth/login`}
            className="text-[#FFD700] hover:underline font-medium"
          >
            {t("back_to_login")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href={`/${locale}`} className="inline-block">
            <h1 className="text-3xl font-bold text-[#FFD700]">⚽ Football2026</h1>
          </Link>
        </div>

        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-2">{t("forgot_password")}</h2>
          <p className="text-gray-400 text-sm mb-6">{t("forgot_password_desc")}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {t("email")}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#0A1628] border border-[#1E3A5F] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] placeholder-gray-600 transition-colors"
              />
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
              {isPending ? t("sending") : t("send_reset_link")}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            <Link
              href={`/${locale}/auth/login`}
              className="text-[#FFD700] hover:underline font-medium"
            >
              {t("back_to_login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
