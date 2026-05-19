"use client";

import { useState, useTransition, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import Link from "next/link";
import { countries } from "@/lib/countries";
import { signUp } from "../actions";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [countrySearch, setCountrySearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; name: string; flag: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return countries;
    const q = countrySearch.toLowerCase();
    return countries.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [countrySearch]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError(t("password_mismatch"));
      return;
    }
    if (password.length < 8) {
      setError(t("password_too_short"));
      return;
    }
    if (!selectedCountry) {
      setError(t("country_required"));
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("locale", locale);
    formData.set("country_code", selectedCountry.code);

    startTransition(async () => {
      const result = await signUp(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.message || t("check_email"));
      }
    });
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?locale=${locale}&next=/`,
      },
    });
  }

  async function handleFacebook() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?locale=${locale}&next=/`,
      },
    });
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="text-6xl mb-6">📧</div>
          <h2 className="text-2xl font-bold text-white mb-3">{t("verify_email_title")}</h2>
          <p className="text-gray-400 mb-6">{success}</p>
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
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href={`/${locale}`} className="inline-block">
            <h1 className="text-3xl font-bold text-[#FFD700]">⚽ Football2026</h1>
          </Link>
          <p className="text-gray-400 mt-2 text-sm">{t("register_subtitle")}</p>
        </div>

        {/* Welcome Gift Banner */}
        <div className="bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/10 border border-[#FFD700]/30 rounded-xl p-3 mb-6 text-center">
          <p className="text-[#FFD700] text-sm font-semibold">
            🎁 {t("welcome_gift")}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">{t("register_title")}</h2>

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

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {t("username")}
              </label>
              <input
                name="username"
                type="text"
                required
                minLength={3}
                maxLength={20}
                placeholder={t("username_placeholder")}
                className="w-full bg-[#0A1628] border border-[#1E3A5F] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] placeholder-gray-600 transition-colors"
              />
            </div>

            {/* Email */}
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

            {/* Country */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {t("country")}
              </label>
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full bg-[#0A1628] border border-[#1E3A5F] text-left text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] transition-colors flex items-center justify-between"
              >
                <span className={selectedCountry ? "text-white" : "text-gray-600"}>
                  {selectedCountry
                    ? `${selectedCountry.flag} ${selectedCountry.name}`
                    : t("country_placeholder")}
                </span>
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-[#0F2040] border border-[#1E3A5F] rounded-xl shadow-2xl overflow-hidden">
                  <div className="p-2 border-b border-[#1E3A5F]">
                    <input
                      type="text"
                      placeholder={t("search_country")}
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      className="w-full bg-[#0A1628] border border-[#1E3A5F] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FFD700] placeholder-gray-600"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredCountries.map((country) => (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(country);
                          setShowDropdown(false);
                          setCountrySearch("");
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-[#1E3A5F] transition-colors flex items-center gap-3"
                      >
                        <span className="text-xl">{country.flag}</span>
                        <span>{country.name}</span>
                      </button>
                    ))}
                    {filteredCountries.length === 0 && (
                      <p className="px-4 py-3 text-sm text-gray-500">{t("no_countries_found")}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {t("password")}
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0A1628] border border-[#1E3A5F] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] placeholder-gray-600 transition-colors"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {t("confirm_password")}
              </label>
              <input
                name="confirm_password"
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full bg-[#0A1628] border text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 placeholder-gray-600 transition-colors ${
                  confirmPassword && password !== confirmPassword
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-[#1E3A5F] focus:border-[#FFD700] focus:ring-[#FFD700]"
                }`}
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
              {isPending ? t("creating_account") : t("create_account")}
            </button>

            <p className="text-xs text-gray-500 text-center">
              {t("terms_notice")}
            </p>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {t("have_account")}{" "}
            <Link
              href={`/${locale}/auth/login`}
              className="text-[#FFD700] hover:underline font-medium"
            >
              {t("sign_in")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
